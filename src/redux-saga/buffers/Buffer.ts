import { BufferError } from './BufferError';
import type { BufferLike } from './BufferLike';
import { createNoneBuffer } from './NoneBuffer';

export enum OverflowStrategy {
  Throw,
  Drop,
  Slide,
  Expand,
}

export class Buffer<T> implements BufferLike<T> {
  #storage: (T | undefined)[];
  #currentLength = 0;
  #nextWriteIndex = 0;
  #nextReadIndex = 0;
  #overflowStrategy: OverflowStrategy;

  constructor(capacity = 10, strategy: OverflowStrategy = OverflowStrategy.Throw) {
    if (!Number.isInteger(capacity)) {
      throw BufferError.InvalidCapacity;
    }
    if (capacity < 0) {
      throw BufferError.NegativeLimit;
    }
    this.#storage = Array.from<T | undefined>({ length: capacity });
    this.#overflowStrategy = strategy;
  }

  static none<T>(): BufferLike<T> {
    return createNoneBuffer<T>();
  }
  static fixed<T>(limit: number): Buffer<T> {
    return new Buffer<T>(limit, OverflowStrategy.Throw);
  }
  static dropping<T>(limit: number): Buffer<T> {
    return new Buffer<T>(limit, OverflowStrategy.Drop);
  }
  static sliding<T>(limit: number): Buffer<T> {
    return new Buffer<T>(limit, OverflowStrategy.Slide);
  }
  static expanding<T>(initialSize: number): Buffer<T> {
    return new Buffer<T>(initialSize, OverflowStrategy.Expand);
  }

  get size(): number {
    return this.#currentLength;
  }
  get capacity(): number {
    return this.#storage.length;
  }

  isEmpty(): boolean {
    return this.#currentLength === 0;
  }

  put(message: T): void {
    const capacity = this.capacity;

    if (this.#currentLength < capacity) {
      this.#enqueue(message);
      return;
    }

    switch (this.#overflowStrategy) {
      case OverflowStrategy.Throw:
        throw BufferError.BufferOverflow;

      case OverflowStrategy.Drop:
        // игнорируем входящее сообщение
        return;

      case OverflowStrategy.Slide:
        // перезаписываем самый старый элемент
        this.#storage[this.#nextWriteIndex] = message;
        this.#nextWriteIndex = (this.#nextWriteIndex + 1) % capacity;
        this.#nextReadIndex = this.#nextWriteIndex;
        // длина остаётся полной
        return;

      case OverflowStrategy.Expand: {
        const newCapacity = Math.max(1, capacity * 2);
        this.#resizeStorage(newCapacity);
        this.#enqueue(message);
        return;
      }
    }
  }

  take(): T | undefined {
    if (this.#currentLength === 0) {
      return undefined;
    }
    const value = this.#storage[this.#nextReadIndex];
    this.#storage[this.#nextReadIndex] = undefined;
    this.#nextReadIndex = (this.#nextReadIndex + 1) % this.capacity;
    this.#currentLength--;
    return value;
  }

  flush(): T[] {
    if (this.#currentLength === 0) {
      return [];
    }
    const result = Array.from<T>({ length: this.#currentLength });
    let writeIndex = 0;
    while (this.#currentLength > 0) {
      const value = this.take();
      if (value !== undefined) {
        result[writeIndex++] = value;
      }
    }
    return result;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    let currentIndex = this.#nextReadIndex;
    let remainingItemsCount = this.#currentLength;
    const capacity = this.capacity;

    while (remainingItemsCount-- > 0) {
      const value = this.#storage[currentIndex];
      if (value !== undefined) {
        yield value;
      }
      currentIndex = (currentIndex + 1) % capacity;
    }
  }

  #enqueue(message: T): void {
    this.#storage[this.#nextWriteIndex] = message;
    this.#nextWriteIndex = (this.#nextWriteIndex + 1) % this.capacity;
    this.#currentLength++;
  }

  #resizeStorage(newCapacity: number): void {
    const currentCapacity = this.capacity;
    if (newCapacity === currentCapacity) {
      return;
    }

    const newStorage: (T | undefined)[] = Array.from<T | undefined>({ length: newCapacity });
    let writeIndex = 0;

    for (const value of this) {
      newStorage[writeIndex++] = value;
    }

    this.#storage = newStorage;
    this.#nextReadIndex = 0;
    this.#nextWriteIndex = this.#currentLength;
  }
}
