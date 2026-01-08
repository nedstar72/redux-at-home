import type { TaskMeta } from './Task';

/**
 * Представляет кадр стека саги при формировании ошибки.
 */
export type SagaFrame = {
  meta: TaskMeta;
  cancelledTasks?: string[];
  crashedEffect?: string | null;
};

/**
 * Входные данные для добавления нового кадра стека.
 */
export type SagaFrameInput = Omit<SagaFrame, 'crashedEffect'>;

/**
 * Формирует описание ошибки выполнения саги на основе накопленных кадров выполнения.
 */
export class SagaError {
  static #crashedEffect: string | null = null;
  static #sagaStack: SagaFrame[] = [];

  /**
   * Добавляет кадр с информацией о саге и задаёт для него сбойный эффект, если он определён.
   *
   * @param frame Кадр с информацией о саге и отменённых задачах
   */
  static addSagaFrame(frame: SagaFrameInput): void {
    const frameWithCrash: SagaFrame = {
      ...frame,
      crashedEffect: this.#crashedEffect,
    };
    this.#sagaStack.push(frameWithCrash);
  }

  /**
   * Фиксирует информацию о сбойном эффекте для следующего кадра саги.
   *
   * @param effect Информация о сбойном эффекте или null для сброса значения
   */
  static setCrashedEffect(effect: string | null): void {
    this.#crashedEffect = effect;
  }

  /**
   * Очищает накопленные данные об ошибке и сбойном эффекте.
   */
  static clear(): void {
    this.#crashedEffect = null;
    this.#sagaStack.length = 0;
  }

  /**
   * Возвращает текстовое представление накопленной информации об ошибке.
   *
   * @returns Подробное описание ошибки выполнения саги
   */
  static toString(): string {
    if (this.#sagaStack.length === 0) {
      return '';
    }

    const [firstSaga, ...otherSagas] = this.#sagaStack;
    const crashedEffectDescription = firstSaga.crashedEffect ?? null;

    const header =
      `The above error occurred in task ${this.#sagaMetaAsString(firstSaga.meta)}` +
      (crashedEffectDescription ? ` \n when executing effect ${crashedEffectDescription}` : '');

    const createdByLines = otherSagas.map(
      sagaFrame => `    created by ${this.#sagaMetaAsString(sagaFrame.meta)}`,
    );

    const cancelledTasks = this.#cancelledTasksAsString(this.#sagaStack);

    return [header, ...createdByLines, cancelledTasks].filter(Boolean).join('\n');
  }

  static #sagaMetaAsString({ name }: TaskMeta): string {
    return name;
  }

  static #cancelledTasksAsString(stack: SagaFrame[]): string {
    const cancelledTasks = stack.flatMap(frame => frame.cancelledTasks ?? []);
    if (cancelledTasks.length === 0) {
      return '';
    }

    return ['Tasks cancelled due to error:', ...cancelledTasks].join('\n');
  }
}
