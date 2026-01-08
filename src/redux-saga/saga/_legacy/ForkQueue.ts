import { remove } from '../utils';
import type { Task } from './Task';

/**
 * Класс для управления "семейством" задач:
 * основной таск + все его форки.
 *
 * Поведение:
 * - Завершение родителя = завершение всех детей (успех или cancel).
 * - Cancel родителя = cancel всех детей.
 * - Ошибка в любом дочернем = abort всей группы.
 */
export class ForkQueue {
  #mainTask: Task;
  #onAbort: (err?: unknown) => void;
  #cont: (result: unknown, isError?: boolean) => void;
  #tasks: Task[] = [];
  #result: unknown;
  #completed = false;

  constructor(
    mainTask: Task,
    onAbort: (err?: unknown) => void,
    cont: (result: unknown, isError?: boolean) => void,
  ) {
    this.#mainTask = mainTask;
    this.#onAbort = onAbort;
    this.#cont = cont;
    this.addTask(mainTask);
  }

  getTasks(): Task[] {
    return this.#tasks;
  }

  abort(err: unknown): void {
    this.#onAbort();
    this.cancelAll();
    this.#cont(err, true);
  }

  addTask(task: Task): void {
    this.#tasks.push(task);

    task.cont = (res, isErr) => {
      if (this.#completed) return;

      remove(this.#tasks, task);
      task.cont = () => {};

      if (isErr) {
        this.abort(res);
      } else {
        if (task === this.#mainTask) {
          this.#result = res;
        }
        if (this.#tasks.length === 0) {
          this.#completed = true;
          this.#cont(this.#result);
        }
      }
    };
  }

  cancelAll(): void {
    if (this.#completed) return;

    this.#completed = true;
    for (const t of this.#tasks) {
      t.cont = () => {};
      t.cancel();
    }
    this.#tasks = [];
  }
}
