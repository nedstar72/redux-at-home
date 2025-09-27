import type { Dispatch } from '../../createStore';

export interface MiddlewareAPI<S = unknown, D = Dispatch> {
  dispatch: D;
  getState: () => S;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Middleware<S = unknown, D = Dispatch, _DispatchExt = EmptyObject> {
  (api: MiddlewareAPI<S, D>): (next: (action: unknown) => unknown) => (action: unknown) => unknown;
}
