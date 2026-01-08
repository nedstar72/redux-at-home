import { BufferError } from './BufferError';

export enum OverflowStrategy {
  Throw,
  Drop,
  Slide,
  Expand,
}

export class Buffer<T> {
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

  #storage: (T | undefined)[];
  #occupancy = 0;
  #nextWriteIndex = 0;
  #nextReadIndex = 0;
  #overflowStrategy: OverflowStrategy;

  get occupancy(): number {
    return this.#occupancy;
  }
  get capacity(): number {
    return this.#storage.length;
  }

  constructor(capacity = 10, strategy: OverflowStrategy = OverflowStrategy.Throw) {
    if (!Number.isInteger(capacity)) {
      throw BufferError.InvalidCapacity;
    }
    if (capacity < 0) {
      throw BufferError.NegativeLimit;
    }
    this.#storage = Array.from({ length: capacity });
    this.#overflowStrategy = strategy;
  }

  put(message: T): void {
    if (this.occupancy < this.capacity) {
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
        this.#nextWriteIndex = (this.#nextWriteIndex + 1) % this.capacity;
        this.#nextReadIndex = this.#nextWriteIndex;
        // длина остаётся полной
        return;

      case OverflowStrategy.Expand: {
        const newCapacity = Math.max(1, this.capacity * 2);
        this.#storage = this.flush();
        this.#occupancy = this.#storage.length;
        this.#nextWriteIndex = this.#occupancy;
        this.#nextReadIndex = 0;
        this.#storage.length = newCapacity;
        this.#enqueue(message);
        return;
      }
    }
  }

  take(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const value = this.#storage[this.#nextReadIndex];
    this.#storage[this.#nextReadIndex] = undefined;
    this.#nextReadIndex = (this.#nextReadIndex + 1) % this.capacity;
    this.#occupancy = this.#occupancy - 1;
    return value;
  }

  flush(): T[] {
    if (this.isEmpty()) {
      return [];
    }
    const result = Array.from<T>({ length: this.#occupancy });
    let writeIndex = 0;
    while (!this.isEmpty()) {
      const value = this.take();
      if (value !== undefined) {
        result[writeIndex++] = value;
      }
    }
    return result;
  }

  isEmpty(): boolean {
    return this.#occupancy === 0;
  }

  #enqueue(message: T): void {
    this.#storage[this.#nextWriteIndex] = message;
    this.#nextWriteIndex = (this.#nextWriteIndex + 1) % this.capacity;
    this.#occupancy = this.#occupancy + 1;
  }
}
