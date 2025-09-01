import { describe, it, expect } from 'bun:test';
import { createStore, type Reducer } from '../createStore';
import combineReducers from './index';

const reducerA: Reducer<number, { type: 'actionA' }> = (state = 0, action) => {
  if (action.type != 'actionA') {
    return state;
  }
  return state + 1;
};
const reducerB: Reducer<string, { type: 'actionB' }> = (state = '', action) => {
  if (action.type != 'actionB') {
    return state;
  }
  return state + '-';
};

const reducerС: Reducer<{ c: boolean }, { type: 'actionC' }> = (state = { c: true }, _) => {
  return state;
};

describe('combineReducers', () => {
  it('должен правильно обновлять соответствующие состояния', () => {
    const combinedReducer = combineReducers({
      a: reducerA,
      b: reducerB,
    });

    const store = createStore(combinedReducer);
    expect(store.getState().a).toBe(0);
    expect(store.getState().b).toBe('');

    store.dispatch({ type: 'actionA' });
    expect(store.getState().a).toBe(1);
    expect(store.getState().b).toBe('');

    store.dispatch({ type: 'actionB' });
    expect(store.getState().a).toBe(1);
    expect(store.getState().b).toBe('-');
  });

  it('должен не изменять состояние, когда нет изменений', () => {
    const combinedReducer = combineReducers({
      c: reducerС,
    });
    const store = createStore(combinedReducer);
    const initialState = store.getState();
    store.dispatch({ type: 'actionC' });
    expect(store.getState()).toBe(initialState);
  });
});
