export interface BufferLike<T> {
  isEmpty(): boolean;
  put(message: T): void;
  take(): T | undefined;
  flush(): T[];
}
