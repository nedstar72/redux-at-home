import type { Dispatch } from '../../redux';
import type { MulticastChannel } from '../channels';
import { wrapSagaDispatch } from './SagaAction';

export interface SagaEnvironmentOptions {
  channel: MulticastChannel<unknown>;
  dispatch: Dispatch;
  getState: () => unknown;
  onError: (...args: unknown[]) => void;
}

/**
 * Создает окружение для выполнения саг.
 *
 * Экземпляр хранит канал, диспетчер, функцию чтения состояния, обработчик ошибок и завершающую функцию для runEffect.
 */
export class SagaEnvironment {
  #channel: MulticastChannel<unknown>;
  #dispatch: Dispatch;
  #getState: () => unknown;
  #onError: (...args: unknown[]) => void;

  constructor({ channel, dispatch, getState, onError }: SagaEnvironmentOptions) {
    this.#channel = channel;
    this.#dispatch = wrapSagaDispatch(dispatch);
    this.#getState = getState;
    this.#onError = onError;
  }

  get channel() {
    return this.#channel;
  }

  get dispatch() {
    return this.#dispatch;
  }

  set dispatch(nextDispatch: Dispatch) {
    this.#dispatch = wrapSagaDispatch(nextDispatch);
  }

  get getState() {
    return this.#getState;
  }

  get onError() {
    return this.#onError;
  }

  createChildEnvironment(overrides: Partial<SagaEnvironmentOptions>) {
    return new SagaEnvironment({
      channel: overrides.channel ?? this.#channel,
      dispatch: overrides.dispatch ?? this.#dispatch,
      getState: overrides.getState ?? this.#getState,
      onError: overrides.onError ?? this.#onError,
    });
  }
}
