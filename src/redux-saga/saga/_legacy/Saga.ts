export type Saga<Args extends unknown[] = unknown[]> = (...args: Args) => Iterator<unknown>;
