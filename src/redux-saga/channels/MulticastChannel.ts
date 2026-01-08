import { once, remove } from '../utils';
import { END, isEnd, type End } from './End';
import type { Consumer } from './Consumer';

export type Predicate<T> = (value: T) => boolean;

export class MulticastChannel<T> {
  #closed = false;
  #currentConsumers: Array<Consumer<T>> = [];
  #nextConsumers = this.#currentConsumers;
  #predicates: WeakMap<Consumer<T>, Predicate<T>> = new WeakMap();

  #ensureCanMutateNextConsumers(): void {
    if (this.#nextConsumers !== this.#currentConsumers) return;
    this.#nextConsumers = this.#currentConsumers.slice();
  }

  #ensureConsumersAreEqual(): void {
    this.#currentConsumers = this.#nextConsumers;
  }

  put(input: T | End): void {
    if (this.#closed) return;

    if (isEnd(input)) {
      this.close();
      return;
    }

    this.#ensureConsumersAreEqual();
    const consumersSnapshot = this.#currentConsumers;
    for (const consumer of consumersSnapshot) {
      const predicate = this.#predicates.get(consumer);
      if (!predicate || predicate(input)) {
        if (consumer.cancel) {
          consumer.cancel();
        }
        consumer(input);
      }
    }
  }

  take(consumer: Consumer<T>, predicate?: Predicate<T>): void {
    if (this.#closed) {
      consumer(END);
      return;
    }

    if (predicate) {
      this.#predicates.set(consumer, predicate);
    } else {
      this.#predicates.delete(consumer);
    }

    this.#ensureCanMutateNextConsumers();
    this.#nextConsumers.push(consumer);
    consumer.cancel = once(() => {
      this.#predicates.delete(consumer);
      this.#ensureCanMutateNextConsumers();
      remove(this.#nextConsumers, consumer);
    });
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;

    this.#ensureConsumersAreEqual();
    const consumersSnapshot = this.#currentConsumers;
    this.#nextConsumers = [];
    for (const consumer of consumersSnapshot) {
      consumer(END);
    }
  }
}
