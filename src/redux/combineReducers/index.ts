import type { Reducer } from '../createStore';

type CombinedReducerState<M> =
  M[keyof M] extends Reducer<any, any>
    ? {
        [Slice in keyof M]: M[Slice] extends Reducer<infer State, any> ? State : never;
      }
    : never;

type CombinedReducerAction<M> = Expand<
  {
    [Slice in keyof M]: M[Slice] extends Reducer<any, infer A> ? A : never;
  }[keyof M]
>;

type CombinedReducer<M> =
  M[keyof M] extends Reducer<any, any>
    ? Reducer<CombinedReducerState<M>, CombinedReducerAction<M>>
    : never;

/**
 * Функция combineReducers объединяет несколько редьюсеров в один общий редьюсер состояния.
 * Каждый редьюсер отвечает за свою часть состояния, определяемую ключом в объекте reducersMapObject.
 * Возвращаемый редьюсер вызывает каждый вложенный редьюсер с соответствующей частью состояния и экшеном,
 * собирает новое состояние и определяет, изменилось ли оно, чтобы возвращать предыдущее состояние, если
 * ни один редьюсер не изменил свою часть — для оптимизации и предотвращения лишних обновлений.
 *
 * @param reducersMapObject - объект, где ключи соответствуют частям состояния, а значения — редьюсеры для этих частей
 * @returns общий редьюсер, объединяющий все переданные редьюсеры
 */
export default function combineReducers<
  ReducersMapObject extends Record<string, Reducer<any, any>>,
>(reducersMapObject: ReducersMapObject): CombinedReducer<ReducersMapObject> {
  return ((
    state: CombinedReducerState<ReducersMapObject> = {} as CombinedReducerState<ReducersMapObject>,
    action: CombinedReducerAction<ReducersMapObject>,
  ) => {
    let hasChanged = false;
    const nextState = {} as CombinedReducerState<ReducersMapObject>;
    for (const key in reducersMapObject) {
      const reducer = reducersMapObject[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
      nextState[key] = nextStateForKey;
    }
    return hasChanged ? nextState : state;
  }) as CombinedReducer<ReducersMapObject>;
}
