/**
 * Интерфейс IdentityFunction описывает функцию-идентичность, которая возвращает
 * переданные ей аргументы без изменений. Может принимать как один аргумент, так
 * и массив аргументов.
 */
interface IdentityFunction {
  <A>(arg: A): A;
  <T extends unknown[]>(...args: T): T;
}

/**
 * Определяет первую функцию в кортеже функций.
 * Нужен для получения возвращаемого значения итоговой композиции.
 */
type FirstFunction<Funcs extends AnyFunction[]> = Funcs extends [
  infer First extends AnyFunction,
  ...unknown[],
]
  ? First
  : never;

/**
 * Определяет последнюю функцию в кортеже функций.
 * Нужен для сохранения исходной сигнатуры аргументов.
 */
type LastFunction<Funcs extends AnyFunction[]> = Funcs extends [
  ...unknown[],
  infer Last extends AnyFunction,
]
  ? Last
  : never;

/**
 * Проверяет, что каждая функция принимает результат следующей.
 * Возвращает кортеж функций, если сигнатуры совместимы, иначе never.
 */
type EnsureComposable<Funcs extends AnyFunction[]> = Funcs extends [
  infer First extends AnyFunction,
  infer Second extends AnyFunction,
  ...infer Rest extends AnyFunction[],
]
  ? Parameters<First> extends [infer Argument]
    ? ReturnType<Second> extends Argument
      ? [First, ...EnsureComposable<[Second, ...Rest]>]
      : never
    : never
  : Funcs;

/**
 * Функция compose выполняет композицию функций справа налево.
 * Она принимает несколько функций в качестве аргументов и возвращает новую функцию,
 * которая при вызове передает результат каждой функции следующей, начиная с последней.
 * Если функций не передано, возвращается функция-идентичность.
 *
 * Пример: compose(f, g, h) создает функцию x => f(g(h(x)))
 */

export default function compose(): IdentityFunction;

export default function compose<Func extends AnyFunction>(func: Func): Func;

export default function compose<Funcs extends AnyFunction[]>(
  ...funcs: Funcs
): (
  ...args: Parameters<LastFunction<EnsureComposable<Funcs>>>
) => ReturnType<FirstFunction<EnsureComposable<Funcs>>>;

export default function compose<ReturnValue>(
  ...funcs: Function[]
): (...args: unknown[]) => ReturnValue;

export default function compose(...funcs: Function[]): Function {
  if (funcs.length === 0) {
    return <T>(arg: T) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce(
    (a, b) =>
      (...args: unknown[]) =>
        a(b(...args)),
  );
}
