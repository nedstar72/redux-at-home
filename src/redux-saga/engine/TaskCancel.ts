const TASK_CANCEL_TOKEN = Symbol.for('@@redux-saga/$TASK_CANCEL');

export type TaskCancel = {
  type: typeof TASK_CANCEL_TOKEN;
};

export const TASK_CANCEL: TaskCancel = Object.freeze({ type: TASK_CANCEL_TOKEN });

export function isTaskCancel(value: unknown): value is TaskCancel {
  return !!value && (value as TaskCancel).type === TASK_CANCEL_TOKEN;
}
