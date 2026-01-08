import { isEnd, UnicastChannel } from '../channels';
import { Scheduler } from '../scheduler';
import {
  assignWithSymbols,
  isArray,
  isDefined,
  isFunction,
  isIterator,
  isNotDefined,
  isPromise,
  isString,
  isStringableFunc,
  isSymbol,
} from '../utils';
import * as effectTypes from './EffectTypes'
import proc from './proc';
import { resolvePromise } from './resolvePromise';
import type { SagaEnvironment } from './SagaEnvironment';
import { TERMINATE } from './Terminate';

export const array = (patterns: string[]) => (input: unknown) =>
  patterns.some(p => matcher(p)(input));
export const predicate = (predicate: AnyFunction) => (input: unknown) => predicate(input);
export const string = (pattern: string) => (input: any) => input.type === String(pattern);
export const symbol = (pattern: symbol) => (input: any) => input.type === pattern;
export const wildcard = () => () => true;

function matcher(pattern: unknown) {
  // prettier-ignore
  const matcherCreator: any = (
      pattern === '*'            ? wildcard
    : isString(pattern)         ? string
    : isArray(pattern)          ? array
    : isStringableFunc(pattern) ? string
    : isFunction(pattern)           ? predicate
    : isSymbol(pattern)         ? symbol
    : null
  )

  if (matcherCreator === null) {
    throw new Error(`invalid pattern: ${pattern}`);
  }

  return matcherCreator(pattern);
}

function makeIterator(
  next: AnyFunction,
  thro = (error: unknown) => {
    throw error;
  },
  name = 'iterator',
) {
  const iterator = {
    meta: { name },
    next,
    throw: thro,
    return: (value: any) => ({ value, done: true }),
    isSagaIterator: true,
    [Symbol.iterator]: () => iterator,
  };

  return iterator;
}

function getMetaInfo(fn: AnyFunction) {
  return {
    name: fn.name || 'anonymous',
  };
}

function getIteratorMetaInfo(iterator: any, fn: AnyFunction) {
  if (iterator.isSagaIterator) {
    return { name: iterator.meta.name };
  }
  return getMetaInfo(fn);
}

function createTaskIterator({ context, fn, args }: any) {
  // catch synchronous failures; see #152 and #441
  try {
    const result = fn.apply(context, args);

    // i.e. a generator function returns an iterator
    if (isIterator(result)) {
      return result;
    }

    let resolved = false;

    const next = arg => {
      if (!resolved) {
        resolved = true;
        // Only promises returned from fork will be interpreted. See #1573
        return { value: result, done: !is.promise(result) };
      } else {
        return { value: arg, done: true };
      }
    };

    return makeIterator(next);
  } catch (err) {
    // do not bubble up synchronous failures for detached forks
    // instead create a failed task. See #152 and #441
    return makeIterator(() => {
      throw err;
    });
  }
}

function runPutEffect(env: SagaEnvironment, { channel, action, resolve }: any, cb: any) {
  /**
   Schedule the put in case another saga is holding a lock.
   The put will be executed atomically. ie nested puts will execute after
   this put has terminated.
   **/
  Scheduler.asap(() => {
    let result;
    try {
      result = (channel ? channel.put : env.dispatch)(action);
    } catch (error) {
      cb(error, true);
      return;
    }

    if (resolve && isPromise(result)) {
      resolvePromise(result, cb);
    } else {
      cb(result);
    }
  });
  // Put effects are non cancellables
}

function runTakeEffect(
  env: SagaEnvironment,
  { channel = env.channel, pattern, maybe }: any,
  cb: any,
) {
  const takeCb = (input: unknown) => {
    if (input instanceof Error) {
      cb(input, true);
      return;
    }
    if (isEnd(input) && !maybe) {
      cb(TERMINATE);
      return;
    }
    cb(input);
  };
  try {
    channel.take(takeCb, isDefined(pattern) ? matcher(pattern) : null);
  } catch (err) {
    cb(err, true);
    return;
  }
  cb.cancel = takeCb.cancel;
}

function runCallEffect(env: SagaEnvironment, { context, fn, args }: any, cb: any, { task }: any) {
  // catch synchronous failures; see #152
  try {
    const result = fn.apply(context, args);

    if (isPromise(result)) {
      resolvePromise(result, cb);
      return;
    }

    if (isIterator(result)) {
      // resolve iterator
      proc({env, result, task.context, currentEffectId, getMetaInfo(fn), /* isRoot */ false, cb});
      return;
    }

    cb(result);
  } catch (error) {
    cb(error, true);
  }
}

function runCPSEffect(env: SagaEnvironment, { context, fn, args }: any, cb: any) {
  // CPS (ie node style functions) can define their own cancellation logic
  // by setting cancel field on the cb

  // catch synchronous failures; see #152
  try {
    const cpsCb = (err, res) => {
      if (isNotDefined(err)) {
        cb(res);
      } else {
        cb(err, true);
      }
    };

    fn.apply(context, args.concat(cpsCb));

    if (cpsCb.cancel) {
      cb.cancel = cpsCb.cancel;
    }
  } catch (error) {
    cb(error, true);
  }
}

function runForkEffect(env, { context, fn, args, detached }, cb, { task: parent }) {
  const taskIterator = createTaskIterator({ context, fn, args });
  const meta = getIteratorMetaInfo(taskIterator, fn);

  Scheduler.immediately(() => {
    const child = proc(
      env,
      taskIterator,
      parent.context,
      currentEffectId,
      meta,
      detached,
      undefined,
    );

    if (detached) {
      cb(child);
    } else {
      if (child.isRunning()) {
        parent.queue.addTask(child);
        cb(child);
      } else if (child.isAborted()) {
        parent.queue.abort(child.error());
      } else {
        cb(child);
      }
    }
  });
  // Fork effects are non cancellables
}

function runJoinEffect(env, taskOrTasks, cb, { task }) {
  const joinSingleTask = (taskToJoin, cb) => {
    if (taskToJoin.isRunning()) {
      const joiner = { task, cb };
      cb.cancel = () => {
        if (taskToJoin.isRunning()) remove(taskToJoin.joiners, joiner);
      };
      taskToJoin.joiners.push(joiner);
    } else {
      if (taskToJoin.isAborted()) {
        cb(taskToJoin.error(), true);
      } else {
        cb(taskToJoin.result());
      }
    }
  };

  if (is.array(taskOrTasks)) {
    if (taskOrTasks.length === 0) {
      cb([]);
      return;
    }

    const childCallbacks = createAllStyleChildCallbacks(taskOrTasks, cb);
    taskOrTasks.forEach((t, i) => {
      joinSingleTask(t, childCallbacks[i]);
    });
  } else {
    joinSingleTask(taskOrTasks, cb);
  }
}

function cancelSingleTask(taskToCancel) {
  if (taskToCancel.isRunning()) {
    taskToCancel.cancel();
  }
}

function runCancelEffect(env, taskOrTasks, cb, { task }) {
  if (taskOrTasks === SELF_CANCELLATION) {
    cancelSingleTask(task);
  } else if (is.array(taskOrTasks)) {
    taskOrTasks.forEach(cancelSingleTask);
  } else {
    cancelSingleTask(taskOrTasks);
  }
  cb();
  // cancel effects are non cancellables
}

function runAllEffect(env, effects, cb, { digestEffect }) {
  const effectId = currentEffectId;
  const keys = Object.keys(effects);
  if (keys.length === 0) {
    cb(is.array(effects) ? [] : {});
    return;
  }

  const childCallbacks = createAllStyleChildCallbacks(effects, cb);
  keys.forEach(key => {
    digestEffect(effects[key], effectId, childCallbacks[key], key);
  });
}

function runRaceEffect(env, effects, cb, { digestEffect }) {
  const effectId = currentEffectId;
  const keys = Object.keys(effects);
  const response = is.array(effects) ? createEmptyArray(keys.length) : {};
  const childCbs = {};
  let completed = false;

  keys.forEach(key => {
    const chCbAtKey = (res, isErr) => {
      if (completed) {
        return;
      }
      if (isErr || shouldComplete(res)) {
        // Race Auto cancellation
        cb.cancel();
        cb(res, isErr);
      } else {
        cb.cancel();
        completed = true;
        response[key] = res;
        cb(response);
      }
    };
    chCbAtKey.cancel = noop;
    childCbs[key] = chCbAtKey;
  });

  cb.cancel = () => {
    // prevents unnecessary cancellation
    if (!completed) {
      completed = true;
      keys.forEach(key => childCbs[key].cancel());
    }
  };
  keys.forEach(key => {
    if (completed) {
      return;
    }
    digestEffect(effects[key], effectId, childCbs[key], key);
  });
}

function runSelectEffect(env, { selector, args }, cb) {
  try {
    const state = selector(env.getState(), ...args);
    cb(state);
  } catch (error) {
    cb(error, true);
  }
}

function runChannelEffect(env: SagaEnvironment, { pattern, buffer }: any, cb: any) {
  const chan = new UnicastChannel(buffer);
  const match = matcher(pattern);

  const taker = (action: any) => {
    if (!isEnd(action)) {
      env.channel.take(taker, match);
    }
    chan.put(action);
  };

  const { close } = chan;

  chan.close = () => {
    (taker as any).cancel();
    close();
  };

  env.channel.take(taker, match);
  cb(chan);
}

function runCancelledEffect(env: SagaEnvironment, data: any, cb: any, { task }: any) {
  cb(task.isCancelled());
}

function runFlushEffect(env: SagaEnvironment, channel: any, cb: any) {
  channel.flush(cb);
}

function runGetContextEffect(env: SagaEnvironment, prop: any, cb: any, { task }: any) {
  cb(task.context[prop]);
}

function runSetContextEffect(env: SagaEnvironment, props: any, cb: any, { task }: any) {
  assignWithSymbols(task.context, props);
  cb();
}

const effectRunnerMap = {
  [effectTypes.TAKE]: runTakeEffect,
  [effectTypes.PUT]: runPutEffect,
  [effectTypes.ALL]: runAllEffect,
  [effectTypes.RACE]: runRaceEffect,
  [effectTypes.CALL]: runCallEffect,
  [effectTypes.CPS]: runCPSEffect,
  [effectTypes.FORK]: runForkEffect,
  [effectTypes.JOIN]: runJoinEffect,
  [effectTypes.CANCEL]: runCancelEffect,
  [effectTypes.SELECT]: runSelectEffect,
  [effectTypes.ACTION_CHANNEL]: runChannelEffect,
  [effectTypes.CANCELLED]: runCancelledEffect,
  [effectTypes.FLUSH]: runFlushEffect,
  [effectTypes.GET_CONTEXT]: runGetContextEffect,
  [effectTypes.SET_CONTEXT]: runSetContextEffect,
};

export default effectRunnerMap;
