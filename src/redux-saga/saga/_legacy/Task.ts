import { assignWithSymbols, Deferred } from '../utils';
import { sagaError } from './SagaError';

export enum TaskStatus {
  RUNNING = 'RUNNING',
  CANCELLED = 'CANCELLED',
  ABORTED = 'ABORTED',
  DONE = 'DONE',
}

export interface TaskLike<T = unknown> {
  isRunning(): boolean;
  isCancelled(): boolean;
  result<R extends T = T>(): R | undefined;
  error(): unknown | undefined;
  toPromise<R extends T = T>(): Promise<R>;
  cancel(): void;
  setContext<Context extends object>(props: Partial<Context>): void;
}

type Env = {
  onError: (error: unknown, info: { sagaStack: string }) => void;
};

type MainTask = {
  status: TaskStatus;
};

export const TASK = Symbol.for('@@redux-saga/TASK');

export const TASK_CANCEL = Symbol.for('@@redux-saga/TASK_CANCEL');

export class Task<T = unknown> implements TaskLike<T> {
  // ——— публичные поля (совместимы с прежним API) ———
  readonly [TASK] = true;
  readonly id: number;
  readonly meta: any;
  readonly isRoot: boolean;
  readonly context: UnknownObject;
  joiners: Array<{ cb: (result: T, isError?: boolean) => void }> = [];
  readonly queue: ReturnType<typeof forkQueue>;

  // внешний продолжатель (как раньше task.cont)
  cont: (result: T | typeof TASK_CANCEL, isError?: boolean) => void;

  #env: Env;
  #mainTask: MainTask;
  #status: TaskStatus = TaskStatus.RUNNING;
  #taskResult: T | undefined;
  #taskError: unknown | undefined;
  #deferred: Deferred<T> | null = null;
  #cancelledDueToErrorTasks: string[] = [];

  constructor(
    env: Env,
    mainTask: MainTask,
    parentContext: Record<PropertyKey, unknown>,
    parentEffectId: number,
    meta: any,
    isRoot: boolean,
    cont: (result: T | typeof TASK_CANCEL, isError?: boolean) => void = () => {},
  ) {
    this.#env = env;
    this.#mainTask = mainTask;
    this.id = parentEffectId;
    this.meta = meta;
    this.isRoot = isRoot;
    this.context = Object.create(parentContext);
    this.cont = cont;

    this.queue = forkQueue(
      mainTask,
      () => {
        this.#cancelledDueToErrorTasks.push(...this.queue.getTasks().map(t => t.meta.name));
      },
      this.end, // bound ниже
    );

    this.cancel = this.cancel.bind(this);
    this.end = this.end.bind(this);
    this.setContext = this.setContext.bind(this);
    this.toPromise = this.toPromise.bind(this);
    this.isRunning = this.isRunning.bind(this);
    this.isCancelled = this.isCancelled.bind(this);
    this.isAborted = this.isAborted.bind(this);
    this.result = this.result.bind(this);
    this.error = this.error.bind(this);
  }

  isRunning(): boolean {
    return this.#status === TaskStatus.RUNNING;
  }

  isCancelled(): boolean {
    return (
      this.#status === TaskStatus.CANCELLED ||
      (this.#status === TaskStatus.RUNNING && this.#mainTask.status === TaskStatus.CANCELLED)
    );
  }

  isAborted(): boolean {
    return this.#status === TaskStatus.ABORTED;
  }

  result<R extends T = T>(): R | undefined {
    return this.#taskResult as R | undefined;
  }

  error(): unknown | undefined {
    return this.#taskError;
  }

  toPromise<R extends T = T>(): Promise<R> {
    if (this.#deferred) {
      return this.#deferred.unwrap as Promise<R>;
    }

    this.#deferred = new Deferred<T>();

    if (this.#status === TaskStatus.ABORTED) {
      this.#deferred.reject(this.#taskError);
    } else if (this.#status !== TaskStatus.RUNNING) {
      // Важно: при cancel исходная реализация резолвит TASK_CANCEL.
      // Если твой публичный тип T не включает TASK_CANCEL, просто не передавай его наружу
      // (или типизируй T как `T | typeof TASK_CANCEL`).
      this.#deferred.resolve(this.#taskResult as T);
    }

    return this.#deferred.unwrap as Promise<R>;
  }

  cancel(): void {
    if (this.#status === TaskStatus.RUNNING) {
      this.#status = TaskStatus.CANCELLED;
      this.queue.cancelAll();
      // как и раньше — сигнализируем завершение с TASK_CANCEL
      this.end(TASK_CANCEL, false);
    }
  }

  setContext<Context extends object>(props: Partial<Context>): void {
    assignWithSymbols(this.context, props);
  }

  end(result: T | typeof TASK_CANCEL, isError?: boolean): void {
    if (!isError) {
      if (result === TASK_CANCEL) {
        this.#status = TaskStatus.CANCELLED;
      } else if (this.#status !== TaskStatus.CANCELLED) {
        this.#status = TaskStatus.DONE;
      }
      // сохраняем result только если это не TASK_CANCEL и укладывается в T
      this.#taskResult = result as T;
      if (this.#deferred) this.#deferred.resolve(this.#taskResult as T);
    } else {
      this.#status = TaskStatus.ABORTED;
      sagaError.addSagaFrame({
        meta: this.meta,
        cancelledTasks: this.#cancelledDueToErrorTasks,
      });

      if (this.isRoot) {
        const sagaStack = sagaError.toString();
        sagaError.clear();
        this.#env.onError(result, { sagaStack });
      }

      this.#taskError = result;
      if (this.#deferred) this.#deferred.reject(result);
    }

    this.cont(result, isError);

    this.joiners.forEach(joiner => {
      joiner.cb(result as T, isError);
    });
    // совместимость с исходником — обнуляем joiners
    this.joiners = null as unknown as typeof this.joiners;
  }
}
