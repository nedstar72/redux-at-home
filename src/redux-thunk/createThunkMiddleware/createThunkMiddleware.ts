import type { Action, UnknownAction } from '../../redux';
import type { ThunkMiddleware } from './types';

/**
 * Создает Redux middleware для обработки thunk-экшенов (функций вместо обычных action).
 *
 * @param extraArgument - дополнительный аргумент, доступный третьим параметром внутри thunk-экшенов
 * @returns Middleware, обрабатывающий thunk-экшены
 */
export default function createThunkMiddleware<
  State extends UnknownObject = EmptyObject,
  BasicAction extends Action = UnknownAction,
  ExtraThunkArg = undefined,
>(extraArgument?: ExtraThunkArg): ThunkMiddleware<State, BasicAction, ExtraThunkArg> {
  return ({ dispatch, getState }) =>
    next =>
    action => {
      if (typeof action === 'function') {
        return action(dispatch, getState, extraArgument);
      }
      return next(action);
    };
}
