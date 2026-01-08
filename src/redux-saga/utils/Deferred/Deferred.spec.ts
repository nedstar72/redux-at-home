import { Deferred } from './index';

describe('Deferred', () => {
  let deferred: Deferred<number>;

  beforeEach(() => {
    deferred = new Deferred<number>();
  });

  test('начальное состояние должно быть "pending"', () => {
    expect(deferred.state).toBe('pending');
  });

  test('unwrap должен возвращать промис', () => {
    expect(deferred.unwrap).toBeInstanceOf(Promise);
  });

  test('resolve должен завершить промис и установить состояние в "fulfilled"', async () => {
    const value = 42;
    deferred.resolve(value);

    await expect(deferred.unwrap).resolves.toBe(value);
    expect(deferred.state).toBe('fulfilled');
  });

  test('reject должен отклонить промис и установить состояние в "rejected"', async () => {
    const reason = new Error('Что-то пошло не так');
    deferred.reject(reason);

    await expect(deferred.unwrap).rejects.toThrow(reason);
    expect(deferred.state).toBe('rejected');
  });

  test('resolve не должен менять состояние, если промис уже завершен', async () => {
    const value1 = 42;
    const value2 = 100;

    deferred.resolve(value1);
    deferred.resolve(value2); // Это не должно изменить состояние

    await expect(deferred.unwrap).resolves.toBe(value1);
    expect(deferred.state).toBe('fulfilled');
  });

  test('reject не должен менять состояние, если промис уже завершен', async () => {
    const reason1 = new Error('Ошибка 1');
    const reason2 = new Error('Ошибка 2');

    deferred.reject(reason1);
    deferred.reject(reason2); // Это не должно изменить состояние

    await expect(deferred.unwrap).rejects.toThrow(reason1);
    expect(deferred.state).toBe('rejected');
  });

  test('вызов reject после resolve не должен менять состояние', async () => {
    deferred.resolve(42);
    deferred.reject(new Error('Ошибка')); // Это не должно изменить состояние

    await expect(deferred.unwrap).resolves.toBe(42);
    expect(deferred.state).toBe('fulfilled');
  });

  test('вызов resolve после reject не должен менять состояние', async () => {
    deferred.reject(new Error('Ошибка'));
    deferred.resolve(42); // Это не должно изменить состояние

    await expect(deferred.unwrap).rejects.toThrow('Ошибка');
    expect(deferred.state).toBe('rejected');
  });
});
