import type { UnknownAction } from '../../redux/createStore';
import type { ThunkAction } from './types';
import createThunkMiddleware from './createThunkMiddleware';

describe('ThunkMiddleware', () => {
  it('должен передавать в action-функцию dispatch и getState', () => {
    const api = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };
    const next = jest.fn();
    const thunkAction: ThunkAction<UnknownAction, string, never, void> = (dispatch, getState) => {
      expect(dispatch).toBe(api.dispatch);
      expect(getState).toBe(api.getState);
    };

    createThunkMiddleware()(api)(next)(thunkAction);
  });

  it('должен пропускать action, если это не функция', () => {
    const api = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };
    const next = jest.fn();
    const action: UnknownAction = { type: 'TestAction' };

    createThunkMiddleware()(api)(next)(action);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenNthCalledWith(1, action);
  });

  it('должен возвращать значение из next, если action это не функция', () => {
    const api = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };
    const next = (action: unknown) => action;
    const action: UnknownAction = { type: 'TestAction' };

    const result = createThunkMiddleware()(api)(next)(action);

    expect(result).toBe(action);
  });

  it('должен возвращать значение из action-функции', () => {
    const api = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };
    const next = jest.fn();
    const thunkAction: ThunkAction<UnknownAction, string, never, void> = () => {
      return 'result';
    };

    const result = createThunkMiddleware()(api)(next)(thunkAction);
    expect(result).toBe('result');
  });

  it('должен вызывать action-функцию синхронно', () => {
    let mutated = 0;

    const api = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };
    const next = jest.fn();
    const thunkAction: ThunkAction<UnknownAction, string, never, void> = () => {
      mutated += 1;
    };

    createThunkMiddleware()(api)(next)(thunkAction);
    expect(mutated).toBe(1);
  });

  it('должен передавать extra аргумент в action-функцию', () => {
    const extra = { lol: true };
    const api = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };
    const next = jest.fn();
    const thunkAction: ThunkAction<UnknownAction, string, typeof extra, void> = (
      _,
      __,
      extraArg,
    ) => {
      expect(extraArg).toBe(extra);
    };

    createThunkMiddleware(extra)(api)(next)(thunkAction);
  });
});
