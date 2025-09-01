import type { Dispatch } from '../../createStore';

export interface MiddlewareAPI<S = unknown, D = Dispatch> {
  dispatch: D;
  getState: () => S;
}

export interface Middleware<S = unknown, D = Dispatch, _DispatchExt = EmptyObject> {
  (api: MiddlewareAPI<S, D>): (next: (action: unknown) => unknown) => (action: unknown) => unknown;
}
