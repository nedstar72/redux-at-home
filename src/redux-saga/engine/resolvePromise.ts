import { ABORT, isAbortable } from '../utils';

export function resolvePromise(
  promise: PromiseLike<unknown>,
  handler: {
    (result: unknown, isError?: boolean): void;
    cancel?: () => void;
  },
) {
  if (isAbortable(promise)) {
    handler.cancel = promise[ABORT];
  }

  promise.then(handler, error => {
    handler(error, true);
  });
}
