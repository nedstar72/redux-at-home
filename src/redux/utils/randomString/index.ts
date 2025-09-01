/**
 * Генерирует строку из случайных символов base-36,
 * разделённых точками. Используется для создания уникальных идентификаторов.
 *
 * @returns Строку из случайных символов, разделённых точками
 */
export default function randomString(): string {
  return Math.random().toString(36).substring(7).split('').join('.');
}
