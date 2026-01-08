import { compose } from '../../redux/applyMiddleware';
import type { Dispatch, UnknownAction } from '../../redux/createStore';
import { scheduler, uid } from '../utils';
import { makeSagaAction } from './SagaAction';
import { StdChannel } from './StdChannel';

const RUN_SAGA_SIGNATURE = 'runSaga(options, saga, ...args)';
const NON_GENERATOR_ERR = `${RUN_SAGA_SIGNATURE}: saga argument must be a Generator function!`;

const wrapSagaDispatch = (dispatch: Dispatch) => (action: unknown) => {
  return dispatch(makeSagaAction(action) as unknown as UnknownAction);
};

export function runSaga(
  {
    channel = new StdChannel(),
    dispatch,
    getState,
    context = {},
    sagaMonitor,
    effectMiddlewares,
    onError = logError,
  },
  saga,
  ...args
) {
  const iterator = saga(...args);

  const effectId = uid();

  let finalizeRunEffect;
  if (effectMiddlewares) {
    const middleware = compose(...effectMiddlewares);
    finalizeRunEffect = runEffect => {
      return (effect, effectId, currCb) => {
        const plainRunEffect = eff => runEffect(eff, effectId, currCb);
        return middleware(plainRunEffect)(effect);
      };
    };
  } else {
    finalizeRunEffect = identity;
  }

  const env = {
    channel,
    dispatch: wrapSagaDispatch(dispatch),
    getState,
    sagaMonitor,
    onError,
    finalizeRunEffect,
  };

  return scheduler.immediately(() => {
    const task = proc(
      env,
      iterator,
      context,
      effectId,
      getMetaInfo(saga),
      /* isRoot */ true,
      undefined,
    );

    return task;
  });
}
