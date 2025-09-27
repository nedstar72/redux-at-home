import randomString from '.';

describe('randomString', () => {
  let originalMathRandom: typeof Math.random;

  beforeEach(() => {
    originalMathRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  it('должен создавать строку с точками из символов base-36 по случайному числу', () => {
    Math.random = () => 0.123456789;
    const result = randomString();
    expect(result).toBe('x.j.y.l.r.x');
  });

  it('должен возвращать строку, содержащую только строчные буквы, цифры и точки', () => {
    const result = randomString();
    expect(result).toMatch(/^[a-z0-9](?:\.[a-z0-9])*$/);
  });

  it('должен создавать разные строки при последовательных вызовах (крайне вероятно)', () => {
    const a = randomString();
    const b = randomString();
    expect(a).not.toBe(b);
  });
});
