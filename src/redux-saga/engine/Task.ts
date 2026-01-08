export enum TaskStatus {
  Running,
  Cancelled,
  Aborted,
  Done,
}

export interface TaskMeta {
  name: string;
}

export interface Task<T = unknown> {
  readonly meta: TaskMeta;
  isRunning(): boolean;
  isCancelled(): boolean;
  isAborted(): boolean;
  getResult(): T | undefined;
  getError(): unknown | undefined;
  cancel(): void;
  toPromise(): Promise<T>;
  setContext<Context extends object>(props: Partial<Context>): void;
  onEnd?(result: unknown, isError?: boolean): void;
}

export interface MainTask {
  readonly meta: TaskMeta;
  status: TaskStatus;
  cancel(): void;
  onEnd?(result: unknown, isError?: boolean): void;
}
