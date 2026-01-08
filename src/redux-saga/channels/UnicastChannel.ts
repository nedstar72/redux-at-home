import type { Buffer } from '../buffers';
import { remove } from '../utils';
import { END, isEnd, type End } from './End';
import type { BatchConsumer, Consumer } from './Consumer';

export class UnicastChannel<T> {
  #closed = false;
  #pendingConsumers: Array<Consumer<T>> = [];
  #buffer: Buffer<T>;

  constructor(buffer: Buffer<T>) {
    this.#buffer = buffer;
  }

  put(message: T | End): void {
    if (this.#closed) return;

    if (this.#pendingConsumers.length === 0) {
      if (isEnd(message)) {
        this.close();
      } else {
        this.#buffer.put(message as T);
      }
      return;
    }

    const nextConsumer = this.#pendingConsumers.shift()!;
    nextConsumer(message);
  }

  take(consumer: Consumer<T>): void {
    if (this.#closed && this.#buffer.isEmpty()) {
      consumer(END);
      return;
    }

    if (!this.#buffer.isEmpty()) {
      const value = this.#buffer.take()!;
      consumer(value);
      return;
    }

    this.#pendingConsumers.push(consumer);
    consumer.cancel = () => {
      remove(this.#pendingConsumers, consumer);
    };
  }

  flush(batchConsumer: BatchConsumer<T>): void {
    if (this.#closed && this.#buffer.isEmpty()) {
      batchConsumer(END);
      return;
    }
    batchConsumer(this.#buffer.flush());
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;

    const consumersToNotify = this.#pendingConsumers;
    this.#pendingConsumers = [];
    for (const consumer of consumersToNotify) {
      consumer(END);
    }
  }
}
