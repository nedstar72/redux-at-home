import type { BufferLike } from '../buffers';
import { remove } from '../utils';
import type { MaybeCancellable } from './Cancellable';
import { END, isEnd, type End } from './End';
import type { MultiTaker, Taker } from './Taker';

export interface ChannelLike<T> {
  take(taker: Taker<T> & MaybeCancellable): void;
  put(message: T | End): void;
  flush(multiTaker: MultiTaker<T>): void;
  close(): void;
}

export class Channel<T> implements ChannelLike<T> {
  #closed = false;
  #pendingTakers: Array<Taker<T>> = [];
  #buffer: BufferLike<T>;

  constructor(buffer: BufferLike<T>) {
    this.#buffer = buffer;
  }

  put(message: T | End): void {
    if (this.#closed) return;

    if (this.#pendingTakers.length === 0) {
      if (isEnd(message)) {
        this.close(); // END не буферизуем
      } else {
        this.#buffer.put(message as T);
      }
      return;
    }

    const nextTaker = this.#pendingTakers.shift()!;
    nextTaker(message);
  }

  take(taker: Taker<T> & MaybeCancellable): void {
    if (this.#closed && this.#buffer.isEmpty()) {
      taker(END);
      return;
    }

    if (!this.#buffer.isEmpty()) {
      const value = this.#buffer.take()!;
      taker(value);
      return;
    }

    this.#pendingTakers.push(taker);
    taker.cancel = () => {
      remove(this.#pendingTakers, taker);
    };
  }

  flush(multiTaker: MultiTaker<T>): void {
    if (this.#closed && this.#buffer.isEmpty()) {
      multiTaker(END);
      return;
    }
    multiTaker(this.#buffer.flush());
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;

    const takersToNotify = this.#pendingTakers;
    this.#pendingTakers = [];
    for (const taker of takersToNotify) {
      taker(END);
    }
  }
}
