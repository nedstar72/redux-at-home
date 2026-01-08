export function asap(task: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(task);
  } else {
    Promise.resolve().then(task);
  }
}
