export interface Cancellable {
  cancel(): void;
}

export type MaybeCancellable = Partial<Cancellable>;
