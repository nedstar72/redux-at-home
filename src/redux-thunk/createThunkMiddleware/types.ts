import type { Action, UnknownAction, Middleware } from '../../redux';

/**
 * Тип thunk-экшена: функция, получающая `dispatch`, `getState` и дополнительный аргумент,
 * и возвращающая произвольное значение.
 */
export type ThunkAction<BasicAction extends Action, State, ExtraThunkArg, ReturnType> = (
  dispatch: ThunkDispatch<BasicAction, State, ExtraThunkArg>,
  getState: () => State,
  extraArgument: ExtraThunkArg,
) => ReturnType;

/**
 * Интерфейс `dispatch`, поддерживающего как обычные действия, так и thunk-экшены.
 * Перегруженные сигнатуры позволяют отправлять как обычные action, так и thunk-функции.
 */
export interface ThunkDispatch<BasicAction extends Action, State, ExtraThunkArg> {
  <Action extends BasicAction>(action: Action): Action;

  <ReturnType>(thunkAction: ThunkAction<BasicAction, State, ExtraThunkArg, ReturnType>): ReturnType;

  <ReturnType, A extends BasicAction>(
    action: A | ThunkAction<BasicAction, State, ExtraThunkArg, ReturnType>,
  ): A | ReturnType;
}

/**
 * Тип Redux middleware, расширяющего `dispatch` для поддержки thunk-экшенов.
 * Возвращаемый `dispatch` способен принимать как обычные action, так и thunk-функции.
 */
export type ThunkMiddleware<
  State extends UnknownObject = EmptyObject,
  BasicAction extends Action = UnknownAction,
  ExtraThunkArg = undefined,
> = Middleware<
  State,
  ThunkDispatch<BasicAction, State, ExtraThunkArg>,
  ThunkDispatch<BasicAction, State, ExtraThunkArg>
>;
