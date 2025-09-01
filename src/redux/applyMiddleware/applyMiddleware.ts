import type { Dispatch, Enhancer } from '../createStore';
import type { Middleware, MiddlewareAPI } from './types/Middleware';
import compose from './compose';

/**
 * Функция applyMiddleware позволяет расширять возможности dispatch с помощью цепочки middleware.
 * Она возвращает enhancer, который оборачивает store и позволяет middleware перехватывать и изменять действия.
 *
 * @param middlewares - список middleware, которые будут применяться к dispatch
 * @returns enhancer, который добавляет middleware в процесс обработки действий
 */

export default function applyMiddleware(): Enhancer<{}, {}>;

export default function applyMiddleware<S, D extends Dispatch, Ext1>(
  middleware1: Middleware<S, D, Ext1>,
): Enhancer<{ dispatch: Dispatch & Ext1 }>;

export default function applyMiddleware<S, D extends Dispatch, Ext1, Ext2>(
  middleware1: Middleware<S, D, Ext1>,
  middleware2: Middleware<S, D, Ext2>,
): Enhancer<{ dispatch: Dispatch & Ext1 & Ext2 }>;

export default function applyMiddleware<S, D extends Dispatch, Ext1, Ext2, Ext3>(
  middleware1: Middleware<S, D, Ext1>,
  middleware2: Middleware<S, D, Ext2>,
  middleware3: Middleware<S, D, Ext3>,
): Enhancer<{ dispatch: Dispatch & Ext1 & Ext2 & Ext3 }>;

export default function applyMiddleware<S, D extends Dispatch, Ext1, Ext2, Ext3, Ext4>(
  middleware1: Middleware<S, D, Ext1>,
  middleware2: Middleware<S, D, Ext2>,
  middleware3: Middleware<S, D, Ext3>,
  middleware4: Middleware<S, D, Ext4>,
): Enhancer<{ dispatch: Dispatch & Ext1 & Ext2 & Ext3 & Ext4 }>;

export default function applyMiddleware<S, D extends Dispatch, Ext1, Ext2, Ext3, Ext4, Ext5>(
  middleware1: Middleware<S, D, Ext1>,
  middleware2: Middleware<S, D, Ext2>,
  middleware3: Middleware<S, D, Ext3>,
  middleware4: Middleware<S, D, Ext4>,
  middleware5: Middleware<S, D, Ext5>,
): Enhancer<{ dispatch: Dispatch & Ext1 & Ext2 & Ext3 & Ext4 & Ext5 }>;

export default function applyMiddleware(...middlewares: Middleware[]): Enhancer;

export default function applyMiddleware(...middlewares: Middleware[]): Enhancer {
  return createStore => reducer => {
    const store = createStore(reducer);
    let dispatch: Dispatch = () => {
      throw new Error('Dispatching while constructing your middleware is not allowed');
    };

    const middlewareAPI: MiddlewareAPI = {
      getState: store.getState,
      dispatch: (action, ...args) => dispatch(action, ...args),
    };

    const chain = middlewares.map(middleware => middleware(middlewareAPI));
    dispatch = compose<typeof dispatch>(...chain)(store.dispatch);

    return {
      ...store,
      dispatch,
    };
  };
}
