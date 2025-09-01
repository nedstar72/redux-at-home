export interface Action<T extends string = string> {
  type: T;
}

export interface UnknownAction extends Action {
  // Allows any extra properties to be defined in an action.
  [extraProps: string]: unknown;
}
