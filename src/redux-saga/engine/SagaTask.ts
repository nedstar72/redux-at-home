import { assignWithSymbols, Deferred } from '../utils';
import { TASK_CANCEL, isTaskCancel, type TaskCancel } from './TaskCancel';
import { TaskStatus, type MainTask, type Task, type TaskMeta } from './Task';
import { TaskQueue } from './TaskQueue';
import { SagaError } from './SagaError';
import type { SagaEnvironment } from './SagaEnvironment';

/**
 * Управляет жизненным циклом саги и её форков.
 */
export class SagaTask<T = unknown> implements Task<T> {
  readonly id: number;
  readonly meta: TaskMeta;
  readonly isRoot: boolean;
  readonly context: UnknownObject;

  readonly queue: TaskQueue;

  joiners: Array<(result: unknown, isError?: boolean) => void> = [];

  onEnd: (result: T | TaskCancel, isError?: boolean) => void;

  #env: SagaEnvironment;
  #mainTask: MainTask;
  #status: TaskStatus = TaskStatus.Running;
  #result: T | undefined;
  #error: unknown | undefined;
  #deferred: Deferred<T> | null = null;
  #cancelledDueToErrorTasks: string[] = [];

  constructor({
    env,
    mainTask,
    parentContext,
    parentEffectId,
    meta,
    isRoot,
    onEnd,
  }: {
    env: SagaEnvironment;
    mainTask: MainTask;
    parentContext: UnknownObject;
    parentEffectId: number;
    meta: TaskMeta;
    isRoot: boolean;
    onEnd: (result: unknown, isError?: boolean) => void;
  }) {
    this.#env = env;
    this.#mainTask = mainTask;
    this.context = Object.create(parentContext);
    this.id = parentEffectId;
    this.meta = meta;
    this.isRoot = isRoot;
    this.onEnd = onEnd;
    this.queue = new TaskQueue({
      mainTask,
      onAbort: () => {
        this.#cancelledDueToErrorTasks.push(...this.queue.getTasks().map(task => task.meta.name));
      },
      onEnd,
    });
  }

  isRunning(): boolean {
    return this.#status === TaskStatus.Running;
  }

  /*
    This method is used both for answering the cancellation status of the task and answering for CANCELLED effects.
    In most cases, the cancellation of a task propagates to all its unfinished children (including
    all forked tasks and the mainTask), so a naive implementation of this method would be:
      `() => status === CANCELLED || mainTask.status === CANCELLED`

    But there are cases that the task is aborted by an error and the abortion caused the mainTask to be cancelled.
    In such cases, the task is supposed to be aborted rather than cancelled, however the above naive implementation
    would return true for `task.isCancelled()`. So we need make sure that the task is running before accessing
    mainTask.status.

    There are cases that the task is cancelled when the mainTask is done (the task is waiting for forked children
    when cancellation occurs). In such cases, you may wonder `yield io.cancelled()` would return true because
    `status === CANCELLED` holds, and which is wrong. However, after the mainTask is done, the iterator cannot yield
    any further effects, so we can ignore such cases.

    See discussions in #1704
    */
  isCancelled(): boolean {
    return (
      this.#status === TaskStatus.Cancelled ||
      (this.#status === TaskStatus.Running && this.#mainTask.status === TaskStatus.Cancelled)
    );
  }

  isAborted(): boolean {
    return this.#status === TaskStatus.Aborted;
  }

  getResult(): T | undefined {
    return this.#result;
  }

  getError(): unknown | undefined {
    return this.#error;
  }

  /**
   This may be called by a parent generator to trigger/propagate cancellation
   cancel all pending tasks (including the main task), then end the current task.

   Cancellation propagates down to the whole execution tree held by this Parent task
   It's also propagated to all joiners of this task and their execution tree/joiners

   Cancellation is noop for terminated/Cancelled tasks tasks
   **/
  cancel(): void {
    if (this.#status !== TaskStatus.Running) return;

    // Setting status to CANCELLED does not necessarily mean that the task/iterators are stopped
    // effects in the iterator's finally block will still be executed
    this.#status = TaskStatus.Cancelled;
    this.queue.cancelAll();

    // Ending with a TASK_CANCEL will propagate the Cancellation to all joiners
    this.end(TASK_CANCEL, false);
  }

  toPromise(): Promise<T> {
    if (this.#deferred) {
      return this.#deferred.unwrap;
    }

    this.#deferred = new Deferred<T>();

    if (this.#status === TaskStatus.Aborted) {
      this.#deferred.reject(this.#error);
    } else if (this.#status !== TaskStatus.Running) {
      this.#deferred.resolve(this.#result as T);
    }

    return this.#deferred.unwrap;
  }

  setContext<Context extends object>(props: Partial<Context>): void {
    assignWithSymbols(this.context, props);
  }

  end(result: T | TaskCancel, isError?: boolean): void {
    if (!isError) {
      if (isTaskCancel(result)) {
        this.#status = TaskStatus.Cancelled;
      } else if (this.#status !== TaskStatus.Cancelled) {
        this.#status = TaskStatus.Done;
      }
      this.#result = result as T;
      if (this.#deferred) {
        this.#deferred.resolve(this.#result as T);
      }
    } else {
      this.#status = TaskStatus.Aborted;
      SagaError.addSagaFrame({ meta: this.meta, cancelledTasks: this.#cancelledDueToErrorTasks });

      if (this.isRoot) {
        const sagaStack = SagaError.toString();
        // we've dumped the saga stack to string and are passing it to user's code
        // we know that it won't be needed anymore and we need to clear it
        SagaError.clear();
        this.#env.onError(result, { sagaStack });
      }
      this.#error = result;
      if (this.#deferred) {
        this.#deferred.reject(result);
      }
    }

    this.onEnd(result, isError);
    for (const joiner of this.joiners) {
      joiner(result, isError);
    }
    this.joiners = [];
  }
}
