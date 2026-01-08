import { remove } from '../utils';
import type { MainTask, Task } from './Task';

/**
  Used to track a parent task and its forks
  In the fork model, forked tasks are attached by default to their parent
  We model this using the concept of Parent task && main Task
  main task is the main flow of the current Generator, the parent tasks is the
  aggregation of the main tasks + all its forked tasks.
  Thus the whole model represents an execution tree with multiple branches (vs the
  linear execution tree in sequential (non parallel) programming)

  A parent tasks has the following semantics
    - It completes if all its forks either complete or all cancelled
    - If it's cancelled, all forks are cancelled as well
    - It aborts if any uncaught error bubbles up from forks
    - If it completes, the return value is the one returned by the main task
 **/
export class TaskQueue {
  #mainTask: Task;
  #tasks: Task[] = [];
  #result: unknown;
  #completed = false;
  #onAbort: (error?: unknown) => void;
  #onEnd: (result: unknown, isError?: boolean) => void;

  constructor({
    mainTask,
    onAbort,
    onEnd,
  }: {
    mainTask: MainTask;
    onAbort: (error?: unknown) => void;
    onEnd: (result: unknown, isError?: boolean) => void;
  }) {
    this.#mainTask = mainTask as unknown as Task; // FIXME: fix type
    this.#onAbort = onAbort;
    this.#onEnd = onEnd;

    this.addTask(this.#mainTask);
  }

  getTasks(): Task[] {
    return this.#tasks;
  }

  addTask(task: Task): void {
    this.#tasks.push(task);

    task.onEnd = (result, isError) => {
      if (this.#completed) {
        return;
      }

      remove(this.#tasks, task);
      task.onEnd = () => {};

      if (isError) {
        this.abort(result);
        return;
      }

      if (task === this.#mainTask) {
        this.#result = result;
      }

      if (this.#tasks.length === 0) {
        this.#completed = true;
        this.#onEnd(this.#result);
      }
    };
  }

  abort(error: unknown): void {
    this.#onAbort(error);
    this.cancelAll();
    this.#onEnd(error, true);
  }

  cancelAll(): void {
    if (this.#completed) {
      return;
    }

    this.#completed = true;
    for (const task of this.#tasks) {
      task.onEnd = () => {};
      task.cancel();
    }
    this.#tasks = [];
  }
}
