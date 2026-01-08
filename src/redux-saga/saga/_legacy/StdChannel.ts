import { MulticastChannel, type End } from '../channels';
import { asap } from '../utils';
import { isSagaAction } from './SagaAction';

export class StdChannel<T = unknown> extends MulticastChannel<T> {
  put(input: T | End): void {
    if (isSagaAction(input)) {
      super.put(input);
    } else {
      asap(() => super.put(input));
    }
  }
}
