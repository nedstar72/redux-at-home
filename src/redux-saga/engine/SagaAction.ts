import type { Dispatch, UnknownAction } from '../../redux';

export const SAGA_ACTION = Symbol.for('@@redux-saga/$SAGA_ACTION');

export interface SagaAction {
  [SAGA_ACTION]: unknown;
}

export function isSagaAction(action: unknown): action is SagaAction {
  return typeof action === 'object' && action !== null && SAGA_ACTION in action;
}

function makeSagaAction<T>(value: T): T & SagaAction {
  return Object.defineProperty<T>(value, SAGA_ACTION, { value: true }) as T & SagaAction;
}

export function wrapSagaDispatch(dispatch: Dispatch): Dispatch {
  return <T extends UnknownAction>(action: T): T => {
    return dispatch(makeSagaAction(action));
  };
}
