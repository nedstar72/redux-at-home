import { Buffer, type BufferLike } from '../buffers';
import { once } from '../utils';
import type { MaybeCancellable } from './Cancellable';
import { Channel, type ChannelLike } from './Channel';
import { isEnd, type End } from './End';
import type { MultiTaker, Taker } from './Taker';

export type Unsubscribe = () => void;
export type Subscribe<T> = (emit: (input: T | End) => void) => Unsubscribe;

export type EventChannelLike<T> = Pick<ChannelLike<T>, 'take' | 'flush' | 'close'>;

export class EventChannel<T> implements EventChannelLike<T> {
  #channel: Channel<T>;
  #unsubscribe: Unsubscribe | undefined;
  #closed = false;

  constructor(subscribe: Subscribe<T>, buffer: BufferLike<T> = Buffer.none<T>()) {
    this.#channel = new Channel<T>(buffer);

    const closeSelf = () => {
      if (this.#closed) return;
      this.#closed = true;
      if (typeof this.#unsubscribe === 'function') {
        this.#unsubscribe();
      }
      this.#channel.close();
    };

    const emit = (input: T | End) => {
      if (isEnd(input)) {
        closeSelf();
        return;
      }
      this.#channel.put(input);
    };

    const unsubscribe = subscribe(emit);
    this.#unsubscribe = once(unsubscribe);

    // Если канал закрыт во время конструктора (редкий кейс) — сразу отпишемся
    if (this.#closed) {
      this.#unsubscribe();
    }
  }

  take(taker: Taker<T> & MaybeCancellable): void {
    this.#channel.take(taker);
  }

  flush(multiTaker: MultiTaker<T>): void {
    this.#channel.flush(multiTaker);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    if (typeof this.#unsubscribe === 'function') {
      this.#unsubscribe();
    }
    this.#channel.close();
  }
}
