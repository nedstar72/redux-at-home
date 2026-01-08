import type { End } from './End';
import type { MaybeCancellable } from './Cancellable';

export interface Consumer<T> extends MaybeCancellable {
  (message: T | End): void;
}

export interface BatchConsumer<T> {
  (message: T[] | End): void;
}
