import { randomString } from '../utils';
import type { Action } from './types/Action';
import type { Dispatch } from './types/Dispatch';
import type { Reducer } from './types/Reducer';
import type { Listener, Store, Unsubscribe } from './types/Store';
import type { Enhancer } from './types/Enhancer';

export const InternalActionType = {
  // Специальный action type для инициализации store при запуске Redux
  Initial: `@@redux/INIT${randomString()}`,
};

/**
 * Создает Redux store - центральное хранилище состояния приложения
 * @param reducer - функция для обновления состояния на основе action
 * @param enhancer - опциональная функция для расширения функциональности store
 * @returns Store объект с методами getState, dispatch, subscribe
 */
export default function createStore<
  S,
  A extends Action,
  StoreExt extends UnknownObject = EmptyObject,
  StateExt extends UnknownObject = EmptyObject,
>(
  reducer: Reducer<S, A>,
  enhancer?: Enhancer<StoreExt, StateExt>,
): Store<S & StateExt, A> & StoreExt {
  if (enhancer) {
    return enhancer(createStore)(reducer);
  }

  let state: S | undefined;
  const listeners: Map<number, Listener> = new Map();
  let listenerIdCounter = 0;

  const dispatch = (action: A): A => {
    try {
      state = reducer(state, action);

      for (const listener of listeners.values()) {
        listener();
      }
    } catch {
      // do nothing
    }

    return action;
  };

  const getState = (): S => {
    return state as S;
  };

  const subscribe = (listener: Listener): Unsubscribe => {
    const listenerId = listenerIdCounter++;
    listeners.set(listenerId, listener);

    return () => {
      listeners.delete(listenerId);
    };
  };

  dispatch({ type: InternalActionType.Initial } as A);

  return {
    dispatch: dispatch as Dispatch<A>,
    getState,
    subscribe,
  } as Store<S & StateExt, A> & StoreExt;
}
