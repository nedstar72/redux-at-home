import type { Action, UnknownAction } from './Action';

export interface Dispatch<A extends Action = UnknownAction> {
  <T extends A>(action: T): T;
}
