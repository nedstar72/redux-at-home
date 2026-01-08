type ChannelErrorCode =
  | 'CLOSED_WITH_TAKERS'
  | 'PENDING_TAKERS_WITH_BUFFER'
  | 'UNDEFINED_INPUT'
  | 'INVALID_BUFFER';

export class ChannelError extends Error {
  override readonly name = 'ChannelError' as const;
  readonly code: ChannelErrorCode;

  private constructor(message: string, code: ChannelErrorCode) {
    super(message);
    this.code = code;
  }

  static get ClosedWithPendingTakers(): ChannelError {
    return new ChannelError(
      'Cannot have a closed channel with pending takers',
      'CLOSED_WITH_TAKERS',
    );
  }

  static get PendingTakersWithNonEmptyBuffer(): ChannelError {
    return new ChannelError(
      'Cannot have pending takers with non empty buffer',
      'PENDING_TAKERS_WITH_BUFFER',
    );
  }

  static get UndefinedInput(): ChannelError {
    return new ChannelError(
      `Saga or channel was provided with an undefined action
Hints:
  - check that your Action Creator returns a non-undefined value
  - if the Saga was started using runSaga, check that your subscribe source provides the action to its listeners`,
      'UNDEFINED_INPUT',
    );
  }

  static get InvalidBuffer(): ChannelError {
    return new ChannelError('Invalid buffer passed to channel factory function', 'INVALID_BUFFER');
  }
}
