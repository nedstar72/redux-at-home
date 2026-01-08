/**
 * Уникальный символ, помечающий объекты с поддержкой отмены.
 */
export const ABORT: unique symbol = Symbol.for('@@redux-saga/ABORT');

/**
 * Описывает обработчик отмены.
 */
export type AbortHandler = () => void;

/**
 * Описывает значение, обладающее обработчиком отмены.
 */
export type Abortable = {
  readonly [ABORT]: AbortHandler;
};

/**
 * Проверяет объект на наличие обработчика отмены.
 *
 * @param value Проверяемое значение
 * @returns Подтверждение, что значение поддерживает отмену
 */
export function isAbortable(value: unknown): value is Abortable {
  return (
    typeof value === 'object' && value !== null && typeof (value as Abortable)[ABORT] === 'function'
  );
}

/**
 * Дополняет объект обработчиком отмены.
 *
 * @param target Целевой объект
 * @param handler Функция отмены
 * @returns Исходный объект с признаком отменяемости
 */
export function makeAbortable<T extends object>(target: T, handler: AbortHandler): T & Abortable {
  Object.defineProperty(target, ABORT, {
    configurable: true,
    enumerable: false,
    value: handler,
    writable: false,
  });

  return target as T & Abortable;
}

/**
 * Вызывает обработчик отмены у переданного значения.
 *
 * @param value Отменяемый объект
 */
export function abort(value: Abortable): void {
  value[ABORT]();
}
