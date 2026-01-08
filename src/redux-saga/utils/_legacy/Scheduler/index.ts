type Task = () => void;

class Scheduler {
  #queue: Task[] = [];
  #semaphore = 0;

  /**
   * Выполняет задачу "атомарно".
   * Пока она выполняется, новые задачи попадают в очередь.
   */
  #exec(task: Task): void {
    try {
      this.#suspend();
      task();
    } finally {
      this.#release();
    }
  }

  /**
   * Добавляет задачу в очередь и запускает цикл,
   * если планировщик свободен.
   */
  asap(task: Task): void {
    this.#queue.push(task);

    if (this.#semaphore === 0) {
      this.#suspend();
      this.#flush();
    }
  }

  /**
   * Выполняет задачу немедленно (с `suspend`),
   * затем обрабатывает очередь.
   */
  immediately<T>(task: () => T): T {
    try {
      this.#suspend();
      return task();
    } finally {
      this.#flush();
    }
  }

  /**
   * Переводит планировщик в "suspended".
   * Все новые задачи будут складываться в очередь.
   */
  #suspend(): void {
    this.#semaphore++;
  }

  /**
   * Уменьшает счётчик семафора.
   */
  #release(): void {
    this.#semaphore--;
  }

  /**
   * Освобождает семафор и, если планировщик свободен,
   * выполняет все задачи из очереди.
   */
  #flush(): void {
    this.#release();

    while (this.#semaphore === 0 && this.#queue.length > 0) {
      const task = this.#queue.shift()!;
      this.#exec(task);
    }
  }
}

export const scheduler = new Scheduler();
