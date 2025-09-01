import { describe, it, expect } from 'bun:test';
import compose from '.';

const double = (x: number): number => x * 2;
const increment = (x: number): number => x + 1;
const toString = (x: number): string => `#${x}`;

describe('compose', () => {
  it('должен возвращать тождественную функцию, когда не предоставлено функций', () => {
    const fn = compose();
    expect(fn(5)).toBe(5);
    expect(fn('test')).toBe('test');
  });

  it('должен возвращать ту же функцию, когда предоставлена одна функция', () => {
    const fn = compose(double);
    expect(fn).toBe(double);
    expect(fn(4)).toBe(8);
  });

  it('должен правильно композировать две функции', () => {
    const fn = compose(double, increment);
    expect(fn(3)).toBe(8);
  });

  it('должен обрабатывать функции с разными типами возвращаемых значений', () => {
    const fn = compose(toString, increment);
    expect(fn(7)).toBe('#8');
  });

  it('должен правильно композировать три функции', () => {
    const fn = compose(toString, double, increment);
    expect(fn(2)).toBe('#6');
  });

  it('должен поддерживать различное количество аргументов для самой внутренней функции', () => {
    const sum = (a: number, b: number, c: number): number => a + b + c;
    const fn = compose(double, sum);
    expect(fn(1, 2, 3)).toBe(12);
  });

  it('должен композировать длинную цепочку функций', () => {
    const fn = compose(
      (s: string) => s.length,
      toString,
      double,
      increment,
      (sum: number) => sum - 5,
    );
    expect(fn(3)).toBe(3);
  });
});
