export type Predicate<T> = (value: T) => boolean;

export const wildcard: Predicate<unknown> = () => true;

export const MATCH = Symbol.for('saga.matcher');

export interface MaybeMatcher<T> {
  [MATCH]?: Predicate<T>;
}
