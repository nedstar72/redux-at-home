export type DeferredState = 'pending' | 'fulfilled' | 'rejected';

export class Deferred<T> {
  private _state: DeferredState = 'pending';

  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: any) => void;

  private _promise: Promise<T>;

  get unwrap(): Promise<T> {
    return this._promise;
  }

  get state(): DeferredState {
    return this._state;
  }

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  resolve = (value: T | PromiseLike<T>): void => {
    if (this._state === 'pending') {
      this._state = 'fulfilled';
      this._resolve(value);
    }
  };

  reject = (reason?: any): void => {
    if (this._state === 'pending') {
      this._state = 'rejected';
      this._reject(reason);
    }
  };
}
