import type { Middleware } from '../../redux';
import { runSaga, StdChannel, type Saga, type TaskLike } from '../saga';
import { assignWithSymbols } from '../utils';

export interface SagaMiddleware<Context extends UnknownObject = EmptyObject> extends Middleware {
  run<S extends Saga>(rootSaga: S, ...args: Parameters<S>): TaskLike;
  setContext(props: Partial<Context>): void;
}

export default function createSagaMiddleware({
  context = {},
  channel = new StdChannel(),
  ...options
} = {}) {
  let boundRunSaga: typeof runSaga;

  const sagaMiddleware: SagaMiddleware = ({ getState, dispatch }) => {
    boundRunSaga = runSaga.bind(null, {
      ...options,
      context,
      channel,
      dispatch,
      getState,
    });

    return next => action => {
      const result = next(action);
      channel.put(action);
      return result;
    };
  };

  sagaMiddleware.run = (...args: Parameters<SagaMiddleware['run']>) => {
    return boundRunSaga(...args);
  };

  sagaMiddleware.setContext = props => {
    assignWithSymbols(context, props);
  };

  return sagaMiddleware;
}
