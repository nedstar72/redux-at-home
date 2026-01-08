import { Deferred } from '../Deferred';
import { type Abortable, makeAbortable } from '../Abortable';

// https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value
const MAX_SIGNED_INT = 2_147_483_647;

/**
 * Возвращает промис, который разрешается через заданное количество миллисекунд.
 *
 * @param ms Количество миллисекунд ожидания. Значение ограничивается `MAX_SIGNED_INT`.
 * @param value Необязательное значение, с которым будет разрешён промис.
 * @returns Промис, который завершится через указанное время.
 */
export function delay<T = void>(ms: number, value?: T): Promise<T> & Abortable {
  const deferred = new Deferred<T>();

  const timeout = setTimeout(
    () => {
      deferred.resolve(value as T);
    },
    Math.min(MAX_SIGNED_INT, ms),
  );

  const promise = makeAbortable(deferred.unwrap, () => {
    clearTimeout(timeout);
    deferred.reject(new Error('Delay was cancelled'));
  });

  return promise;
}
