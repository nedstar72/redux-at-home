import { describe, it, expect } from 'bun:test';
import { createStore, type Dispatch, type Reducer } from '../createStore';
import applyMiddleware from './applyMiddleware';
import type { Middleware, MiddlewareAPI } from './types/Middleware';

interface IncAction {
  type: 'INC';
}
interface AddAction {
  type: 'ADD';
  payload: number;
}

type Action = IncAction | AddAction;

const reducer: Reducer<number, Action> = (state = 0, action) => {
  switch (action.type) {
    case 'INC':
      return state + 1;
    case 'ADD':
      return state + action.payload;
    default:
      return state;
  }
};

describe('applyMiddleware', () => {
  it('должен возвращать store enhancer, если не предоставлено middleware', () => {
    const enhancer = applyMiddleware();
    const store = enhancer(createStore)(reducer);

    expect(store.getState()).toBe(0);
    store.dispatch({ type: 'INC' });
    expect(store.getState()).toBe(1);
  });

  it('должен применять middleware для перехвата dispatch', () => {
    const changelog: Array<{ before: number; action: Action } | { after: number }> = [];

    const middleware: Middleware<number, Dispatch<Action>> =
      (api: MiddlewareAPI<number, Dispatch<Action>>) => next => action => {
        changelog.push({ before: api.getState(), action: action as Action });
        const result = next(action);
        changelog.push({ after: api.getState() });
        return result;
      };

    const enhancer = applyMiddleware(middleware);
    const store = enhancer(createStore)(reducer);

    store.dispatch({ type: 'ADD', payload: 5 });
    expect(store.getState()).toBe(5);
    expect(changelog).toEqual([{ before: 0, action: { type: 'ADD', payload: 5 } }, { after: 5 }]);
  });

  it('должен композировать несколько middleware в правильном порядке', () => {
    const history: string[] = [];

    const mw1: Middleware<number, Dispatch<Action>> = () => next => action => {
      history.push('mw1-before');
      const result = next(action);
      history.push('mw1-after');
      return result;
    };

    const mw2: Middleware<number, Dispatch<Action>> = () => next => action => {
      history.push('mw2-before');
      const result = next(action);
      history.push('mw2-after');
      return result;
    };

    const enhancer = applyMiddleware(mw1, mw2);
    const store = enhancer(createStore)(reducer);

    store.dispatch({ type: 'INC' });

    expect(history).toEqual(['mw1-before', 'mw2-before', 'mw2-after', 'mw1-after']);
    expect(store.getState()).toBe(1);
  });

  it('должен предотвращать dispatch во время конструирования middleware', () => {
    const faultyMw: Middleware<number, Dispatch<Action>> = api => {
      expect(() => api.dispatch({ type: 'INC' })).toThrow(
        'Dispatching while constructing your middleware is not allowed',
      );
      return next => action => next(action);
    };

    const enhancer = applyMiddleware(faultyMw);
    const store = enhancer(createStore)(reducer);
    expect(() => store.dispatch({ type: 'INC' })).not.toThrow();
  });
});
