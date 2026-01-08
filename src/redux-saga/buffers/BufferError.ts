export type BufferErrorCode = 'BUFFER_OVERFLOW' | 'INVALID_CAPACITY' | 'NEGATIVE_LIMIT';

export class BufferError extends Error {
  override readonly name = 'BufferError' as const;
  readonly code: BufferErrorCode;

  private constructor(message: string, code: BufferErrorCode) {
    super(message);
    this.code = code;
  }

  static get BufferOverflow(): BufferError {
    return new BufferError("Channel's buffer overflow!", 'BUFFER_OVERFLOW');
  }
  static get InvalidCapacity(): BufferError {
    return new BufferError('Capacity must be an integer', 'INVALID_CAPACITY');
  }
  static get NegativeLimit(): BufferError {
    return new BufferError('Capacity must be >= 0', 'NEGATIVE_LIMIT');
  }
}
