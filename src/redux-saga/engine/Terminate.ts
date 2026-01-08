const TERMINATE_TOKEN = Symbol.for('@@redux-saga/$TERMINATE');

export type Terminate = {
  type: typeof TERMINATE_TOKEN;
};

export const TERMINATE: Terminate = Object.freeze({ type: TERMINATE_TOKEN });

export function isTerminate(value: unknown): value is Terminate {
  return !!value && (value as Terminate).type === TERMINATE_TOKEN;
}
