import type { Buffer } from '../buffers';
import { once } from '../utils';
import { isEnd, type End } from './End';
import type { BatchConsumer, Consumer } from './Consumer';
import { UnicastChannel } from './UnicastChannel';

export type Subscribe<T> = (emit: (input: T | End) => void) => Unsubscribe;
export type Unsubscribe = () => void;

export class EventChannel<T> {
  #channel: UnicastChannel<T>;
  #unsubscribe: Unsubscribe | undefined;
  #closed = false;

  constructor(subscribe: Subscribe<T>, buffer: Buffer<T>) {
    this.#channel = new UnicastChannel<T>(buffer);

    const emit = (input: T | End) => {
      if (isEnd(input)) {
        this.close();
        return;
      }
      this.#channel.put(input);
    };

    this.#unsubscribe = once(subscribe(emit));

    // Если канал закрыт во время конструктора (редкий кейс) — сразу отпишемся
    if (this.#closed) {
      this.#unsubscribe();
    }
  }

  take(consumer: Consumer<T>): void {
    this.#channel.take(consumer);
  }

  flush(batchConsumer: BatchConsumer<T>): void {
    this.#channel.flush(batchConsumer);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#unsubscribe) {
      this.#unsubscribe();
    }
    this.#channel.close();
  }
}
