import type { End } from './End';

export interface Taker<T> {
  (message: T | End): void;
}

export interface MultiTaker<T> {
  (message: T[] | End): void;
}
