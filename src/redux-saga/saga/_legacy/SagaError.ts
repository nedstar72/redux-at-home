export const SAGA_LOCATION = Symbol.for('@@redux-saga/SAGA_LOCATION');

export type SourceLocation = {
  fileName: string;
  lineNumber: number;
  code: string;
};

export interface Instrumented {
  [SAGA_LOCATION]?: SourceLocation;
}

function getLocation(instrumented: Instrumented) {
  return instrumented[SAGA_LOCATION];
}

type SagaMeta = {
  name: string;
  location?: SourceLocation;
};

export type SagaFrame = {
  meta: SagaMeta;
  cancelledTasks?: string[];
  crashedEffect?: string | null;
};

export class SagaError {
  #crashedEffect: string | null = null;
  #sagaStack: SagaFrame[] = [];

  addSagaFrame(frame: Omit<SagaFrame, 'crashedEffect'>): void {
    const frameWithCrash: SagaFrame = { ...frame, crashedEffect: this.#crashedEffect };
    this.#sagaStack.push(frameWithCrash);
  }

  clear(): void {
    this.#crashedEffect = null;
    this.#sagaStack.length = 0;
  }

  setCrashedEffect(effect: string): void {
    this.#crashedEffect = effect;
  }

  toString(): string {
    if (this.#sagaStack.length === 0) return '';

    const [firstSaga, ...otherSagas] = this.#sagaStack;
    const crashedEffectLocation = firstSaga.crashedEffect
      ? this.#effectLocationAsString(firstSaga.crashedEffect)
      : null;

    const header =
      `The above error occurred in task ${this.#sagaLocationAsString(firstSaga.meta)}` +
      (crashedEffectLocation ? ` \n when executing effect ${crashedEffectLocation}` : '');

    const createdByLines = otherSagas.map(
      frame => `    created by ${this.#sagaLocationAsString(frame.meta)}`,
    );

    const cancelledLines = this.#cancelledTasksAsString(this.#sagaStack);

    return [header, ...createdByLines, cancelledLines].filter(Boolean).join('\n');
  }

  #formatLocation(fileName: string, lineNumber: number): string {
    return `${fileName}?${lineNumber}`;
  }

  #effectLocationAsString(instrumented: Instrumented): string {
    const location = getLocation(instrumented);
    if (location) {
      const { code, fileName, lineNumber } = location;
      const source = `${code}  ${this.#formatLocation(fileName, lineNumber)}`;
      return source;
    }
    return '';
  }

  #sagaLocationAsString(meta: SagaMeta): string {
    const { name, location } = meta;
    if (location) {
      return `${name}  ${this.#formatLocation(location.fileName, location.lineNumber)}`;
    }
    return name;
  }

  #cancelledTasksAsString(stack: SagaFrame[]): string {
    const cancelledTasks = stack.flatMap(frame => frame.cancelledTasks ?? []);
    if (!cancelledTasks.length) return '';
    return ['Tasks cancelled due to error:', ...cancelledTasks].join('\n');
  }
}

export const sagaError = new SagaError();
