export let COUNTER = 0;

export function uid() {
  return ++COUNTER;
}
