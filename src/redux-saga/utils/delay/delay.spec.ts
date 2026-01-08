import { abort } from '../Abortable';
import { delay } from './index';

describe('delay', () => {
  jest.useFakeTimers();

  test('должен разрешаться после указанного времени', async () => {
    const ms = 1000;
    const delayPromise = delay(ms);

    jest.advanceTimersByTime(ms);

    await expect(delayPromise).resolves.toBeUndefined();
  });

  test('должен не разрешаться до указанного времени', async () => {
    const ms = 1000;
    const delayPromise = delay(ms);

    jest.advanceTimersByTime(ms / 2);

    await expect(Promise.race([delayPromise, Promise.resolve('not resolved')])).resolves.toBe(
      'not resolved',
    );
  });

  test('должен возвращать переданное значение', async () => {
    const ms = 500;
    const expectedValue = 'payload';
    const delayPromise = delay(ms, expectedValue);

    jest.advanceTimersByTime(ms);

    await expect(delayPromise).resolves.toBe(expectedValue);
  });

  test('должен отклонять промис при вызове функции отмены', async () => {
    const ms = 500;
    const delayPromise = delay(ms);

    abort(delayPromise);

    await expect(delayPromise).rejects.toThrow('Delay was cancelled');
  });
});
