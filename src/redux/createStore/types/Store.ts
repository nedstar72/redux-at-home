import type { Action, UnknownAction } from './Action';
import type { Dispatch } from './Dispatch';

export interface Listener {
  (): void;
}

export interface Unsubscribe {
  (): void;
}

export interface Store<S = unknown, A extends Action = UnknownAction> {
  dispatch: Dispatch<A>;
  getState(): S;
  subscribe(listener: Listener): Unsubscribe;
}
