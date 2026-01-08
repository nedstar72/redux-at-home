import { MulticastChannel, type End } from '../channels';
import { Scheduler } from '../scheduler';
import { isSagaAction } from './SagaAction';

export class StdChannel<T = unknown> extends MulticastChannel<T> {
  put(input: T | End): void {
    if (isSagaAction(input)) {
      super.put(input);
    } else {
      Scheduler.asap(() => super.put(input));
    }
  }
}
