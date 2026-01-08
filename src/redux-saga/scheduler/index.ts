export type SchedulerTask = () => void;

/**
 * Планировщик выполнения задач.
 * Помогает избежать ситуацию гонок между задачами.
 */
export class Scheduler {
  static #queue: SchedulerTask[] = [];
  static #semaphore = 0;

  /**
   * Ставит задачу в очередь и запускает обработку, если планировщик свободен.
   *
   * @param task Задача без аргументов
   */
  static asap(task: SchedulerTask): void {
    this.#queue.push(task);

    if (this.#semaphore === 0) {
      this.#suspend();
      this.#flush();
    }
  }

  /**
   * Выполняет задачу немедленно в заблокированном режиме.
   *
   * @param task Задача, которую нужно выполнить
   * @returns Результат выполнения задачи
   */
  static immediately<T>(task: () => T): T {
    try {
      this.#suspend();
      return task();
    } finally {
      this.#flush();
    }
  }

  /**
   * Выполняет задачу атомарно с учётом текущей блокировки.
   *
   * @param task Задача без аргументов
   */
  static #exec(task: SchedulerTask): void {
    try {
      this.#suspend();
      task();
    } finally {
      this.#release();
    }
  }

  /**
   * Переводит планировщик в состояние блокировки.
   */
  static #suspend(): void {
    this.#semaphore++;
  }

  /**
   * Снижает уровень блокировки на единицу.
   */
  static #release(): void {
    this.#semaphore--;
  }

  /**
   * Снимает блокировку и выполняет очередь задач при отсутствии активных блокировок.
   */
  static #flush(): void {
    this.#release();

    while (this.#semaphore === 0 && this.#queue.length > 0) {
      const task = this.#queue.shift();

      if (task) {
        this.#exec(task);
      }
    }
  }

  private constructor() {
    // private
  }
}
