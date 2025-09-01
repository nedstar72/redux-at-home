import type { Action, UnknownAction } from './Action';

export interface Reducer<S, A extends Action = UnknownAction> {
  (state: S | undefined, action: A): S;
}
