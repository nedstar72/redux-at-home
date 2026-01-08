import type { BufferLike } from './BufferLike';

export function createNoneBuffer<T>(): BufferLike<T> {
  return Object.freeze({
    isEmpty: () => true,
    put: () => {},
    take: () => undefined,
    flush: () => [],
  });
}
