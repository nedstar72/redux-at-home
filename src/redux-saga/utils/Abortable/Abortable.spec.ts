import { ABORT, abort, isAbortable, makeAbortable } from './index';

describe('Abortable', () => {
  test('isAbortable должен возвращать false для значений без обработчика отмены', () => {
    expect(isAbortable(null)).toBe(false);
    expect(isAbortable(undefined)).toBe(false);
    expect(isAbortable(42)).toBe(false);
    expect(isAbortable({})).toBe(false);
    expect(
      isAbortable({
        [ABORT]: 'not a function',
      }),
    ).toBe(false);
  });

  test('isAbortable должен подтверждать отменяемость объектов, созданных makeAbortable', () => {
    const target = {};
    const handler = jest.fn();

    const abortable = makeAbortable(target, handler);

    expect(isAbortable(abortable)).toBe(true);
    expect(abortable).toBe(target);

    const storedHandler = Reflect.get(abortable, ABORT);

    expect(typeof storedHandler).toBe('function');
    expect(storedHandler).toBe(handler);

    const descriptor = Object.getOwnPropertyDescriptor(abortable, ABORT);

    expect(descriptor).toMatchObject({
      configurable: true,
      enumerable: false,
      writable: false,
      value: handler,
    });
  });

  test('abort должен вызывать обработчик отмены', () => {
    const handler = jest.fn();
    const abortable = makeAbortable({}, handler);

    abort(abortable);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
