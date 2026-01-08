import type { MaybeCancellable } from '../channels';
import { isFunction, isIterator, isPromise, uid } from '../utils';
import { resolvePromise } from './resolvePromise';
import type { SagaEnvironment } from './SagaEnvironment';
import { SagaError } from './SagaError';
import { SagaTask } from './SagaTask';
import { TaskStatus, type MainTask, type TaskMeta } from './Task';
import { isTaskCancel, TASK_CANCEL } from './TaskCancel';
import { isTerminate } from './Terminate';

export default function proc({
  env,
  iterator,
  parentContext,
  parentEffectId,
  meta,
  isRoot,
  cont,
}: {
  env: SagaEnvironment;
  iterator: Iterator<unknown, unknown, unknown>;
  parentContext: UnknownObject;
  parentEffectId: number;
  meta: TaskMeta;
  isRoot: boolean;
  cont: ((result: unknown, isError?: boolean) => void) & MaybeCancellable;
}) {
  /**
    Tracks the current effect cancellation
    Each time the generator progresses. calling runEffect will set a new value
    on it. It allows propagating cancellation to child effects
  **/
  next.cancel = () => {};

  /** Creates a main task to track the main flow */
  const mainTask: MainTask = { meta, cancel: cancelMain, status: TaskStatus.Running };

  /**
   Creates a new task descriptor for this generator.
   A task is the aggregation of it's mainTask and all it's forked tasks.
   **/
  const task = new SagaTask({
    env,
    mainTask,
    parentContext,
    parentEffectId,
    meta,
    isRoot,
    onEnd: cont,
  });

  // const executingContext = {
  //   task,
  //   digestEffect,
  // };

  /**
    cancellation of the main task. We'll simply resume the Generator with a TASK_CANCEL
  **/
  function cancelMain() {
    if (mainTask.status === TaskStatus.Running) {
      mainTask.status = TaskStatus.Cancelled;
      next(TASK_CANCEL);
    }
  }

  /**
    attaches cancellation logic to this task's continuation
    this will permit cancellation to propagate down the call chain
  **/
  if (cont) {
    cont.cancel = task.cancel;
  }

  // kicks up the generator
  next();

  // then return the task descriptor to the caller
  return task;

  /**
   * This is the generator driver
   * It's a recursive async/continuation function which calls itself
   * until the generator terminates or throws
   * @param {internal commands(TASK_CANCEL | TERMINATE) | any} arg - value, generator will be resumed with.
   * @param {boolean} isError - the flag shows if effect finished with an error
   *
   * receives either (command | effect result, false) or (any thrown thing, true)
   */
  function next(arg: unknown = undefined, isError: boolean = false) {
    try {
      let result: any;
      if (isError) {
        result = iterator.throw?.(arg);
        // user handled the error, we can clear bookkept values
        SagaError.clear();
      } else if (isTaskCancel(arg)) {
        /**
          getting TASK_CANCEL automatically cancels the main task
          We can get this value here

          - By cancelling the parent task manually
          - By joining a Cancelled task
        **/
        mainTask.status = TaskStatus.Cancelled;
        /**
          Cancels the current effect; this will propagate the cancellation down to any called tasks
        **/
        next.cancel();
        /**
          If this Generator has a `return` method then invokes it
          This will jump to the finally block
        **/
        result = isFunction(iterator.return)
          ? iterator.return(TASK_CANCEL)
          : { done: true, value: TASK_CANCEL };
      } else if (isTerminate(arg)) {
        // We get TERMINATE flag, i.e. by taking from a channel that ended using `take` (and not `takem` used to trap End of channels)
        result = isFunction(iterator.return) ? iterator.return() : { done: true };
      } else {
        result = iterator.next(arg);
      }

      if (!result.done) {
        digestEffect(result.value, next);
      } else {
        /**
          This Generator has ended, terminate the main task and notify the fork queue
        **/
        if (mainTask.status !== TaskStatus.Cancelled) {
          mainTask.status = TaskStatus.Done;
        }
        mainTask.onEnd?.(result.value);
      }
    } catch (error) {
      if (mainTask.status === TaskStatus.Cancelled) {
        throw error;
      }
      mainTask.status = TaskStatus.Aborted;

      mainTask.onEnd?.(error, true);
    }
  }

  function runEffect(
    effect: string,
    effectId: number,
    currCb: ((result: unknown, isError?: boolean) => void) & MaybeCancellable,
  ) {
    /**
      each effect runner must attach its own logic of cancellation to the provided callback
      it allows this generator to propagate cancellation downward.

      ATTENTION! effect runners must setup the cancel logic by setting cb.cancel = [cancelMethod]
      And the setup must occur before calling the callback

      This is a sort of inversion of control: called async functions are responsible
      of completing the flow by calling the provided continuation; while caller functions
      are responsible for aborting the current flow by calling the attached cancel function

      Library users can attach their own cancellation logic to promises by defining a
      promise[CANCEL] method in their returned promises
      ATTENTION! calling cancel must have no effect on an already completed or cancelled effect
    **/
    if (isPromise(effect)) {
      resolvePromise(effect, currCb);
    } else if (isIterator(effect)) {
      // resolve iterator
      proc({
        env,
        iterator: effect,
        parentContext: task.context,
        parentEffectId: effectId,
        meta,
        isRoot: false,
        cont: currCb,
      });
      // } else if (effect && effect[IO]) {
      //   const effectRunner = effectRunnerMap[effect.type];
      //   effectRunner(env, effect.payload, currCb, executingContext);
    } else {
      // anything else returned as is
      currCb(effect);
    }
  }

  function digestEffect(
    effect: string,
    cb: ((result: unknown, isError?: boolean) => void) & MaybeCancellable,
  ) {
    const effectId = uid();

    /**
      completion callback and cancel callback are mutually exclusive
      We can't cancel an already completed effect
      And We can't complete an already cancelled effectId
    **/
    let effectSettled: boolean = false;

    // Completion callback passed to the appropriate effect runner
    function currCb(res: unknown, isError: boolean = false) {
      if (effectSettled) {
        return;
      }

      effectSettled = true;
      cb.cancel = () => {}; // defensive measure

      if (isError) {
        SagaError.setCrashedEffect(effect);
      }

      cb(res, isError);
    }
    // tracks down the current cancel
    currCb.cancel = () => {};

    // setup cancellation logic on the parent cb
    cb.cancel = () => {
      // prevents cancelling an already completed effect
      if (effectSettled) {
        return;
      }

      effectSettled = true;

      currCb.cancel(); // propagates cancel downward
      currCb.cancel = () => {}; // defensive measure
    };

    runEffect(effect, effectId, currCb);
  }
}
