export function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function isNotDefined<T>(value: T): value is Extract<T, null | undefined> {
  return value === null || value === undefined;
}

export function isFunction(value: unknown): value is (...args: any[]) => unknown {
  return typeof value === 'function';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isArrayOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(predicate);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !isArray(value);
}

export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

export function isPromise(value: unknown): value is PromiseLike<unknown> {
  return !!value && typeof (value as any).then === 'function';
}

export function isIterator(value: unknown): value is Iterator<unknown> {
  const v: any = value;
  return !!v && isFunction(v.next) && isFunction(v.throw);
}

export function isIterable(value: unknown): value is Iterable<unknown> {
  return !!value && typeof (value as any)[Symbol.iterator] === 'function';
}

// export function isTask(value: unknown): value is TaskLike {
//   return !!value && !!(value as any)[TASK];
// }

// export function isSagaAction(value: unknown): value is SagaActionLike {
//   return !!value && !!(value as any)[SAGA_ACTION];
// }

// export function isObservable(value: unknown): value is ObservableLike {
//   return !!value && isFunction((value as any).subscribe);
// }

// export function isBuffer(value: unknown): value is BufferLike {
//   const v: any = value;
//   return !!v && isFunction(v.isEmpty) && isFunction(v.take) && isFunction(v.put);
// }

// export function isPattern(pat: unknown): pat is Pattern {
//   return (
//     !!pat &&
//     (isString(pat) ||
//       isSymbol(pat) ||
//       isFunction(pat) ||
//       (isArray(pat) && (pat as unknown[]).every(isPattern)))
//   );
// }

// export function isChannel(value: unknown): value is ChannelLike {
//   const v: any = value;
//   return !!v && isFunction(v.take) && isFunction(v.close);
// }

export function isStringableFunc(
  value: unknown,
): value is ((...args: any[]) => unknown) & { toString: (...a: any[]) => string } {
  return isFunction(value) && Object.prototype.hasOwnProperty.call(value, 'toString');
}

// export function isMulticast(value: unknown): value is MulticastChannelLike {
//   return isChannel(value) && !!(value as any)[MULTICAST];
// }

// export function isEffect(value: unknown): value is EffectLike {
//   return !!value && !!(value as any)[IO];
// }
