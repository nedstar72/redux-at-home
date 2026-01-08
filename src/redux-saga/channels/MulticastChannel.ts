import { once, remove } from '../utils';
import type { MaybeCancellable } from './Cancellable';
import { END, isEnd, type End } from './End';
import { MATCH, wildcard, type MaybeMatcher, type Predicate } from './Matcher';
import type { Taker } from './Taker';

export const MULTICAST = Symbol.for('saga.multicast');

export interface MulticastChannelLike<T> {
  take(taker: Taker<T> & MaybeMatcher<T> & MaybeCancellable, matcher?: Predicate<T>): void;
  put(message: T | End): void;
  close(): void;
  [MULTICAST]: true;
}

export class MulticastChannel<T> implements MulticastChannelLike<T> {
  [MULTICAST] = true as const;

  #closed = false;
  #currentTakers: Array<Taker<T> & MaybeMatcher<T> & MaybeCancellable> = [];
  #nextTakers = this.#currentTakers;

  #ensureCopyOnWrite(): void {
    if (this.#nextTakers !== this.#currentTakers) return;
    this.#nextTakers = this.#currentTakers.slice();
  }

  put(input: T | End): void {
    if (this.#closed) return;

    if (isEnd(input)) {
      this.close();
      return;
    }

    const takersSnapshot = (this.#currentTakers = this.#nextTakers);
    const totalTakers = takersSnapshot.length;

    for (let index = 0; index < totalTakers; index++) {
      const taker = takersSnapshot[index];
      const matcher = taker[MATCH];
      if (!matcher || matcher(input)) {
        if (typeof taker.cancel === 'function') {
          taker.cancel();
        }
        taker(input);
      }
    }
  }

  take(
    taker: Taker<T> & MaybeMatcher<T> & MaybeCancellable,
    matcher: Predicate<T> = wildcard,
  ): void {
    if (this.#closed) {
      taker(END);
      return;
    }

    taker[MATCH] = matcher;
    this.#ensureCopyOnWrite();
    this.#nextTakers.push(taker as any);
    taker.cancel = once(() => {
      this.#ensureCopyOnWrite();
      remove(this.#nextTakers, taker as any);
    });
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;

    const takersSnapshot = (this.#currentTakers = this.#nextTakers);
    this.#nextTakers = [];
    for (const taker of takersSnapshot) {
      taker(END);
    }
  }
}
