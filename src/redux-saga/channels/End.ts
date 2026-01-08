export const CHANNEL_END = Symbol.for('saga.channelEnd');

export type End = { type: typeof CHANNEL_END };

export const END: End = Object.freeze({ type: CHANNEL_END });

export function isEnd(value: unknown): value is End {
  return !!value && (value as End).type === CHANNEL_END;
}
