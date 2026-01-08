export function remove<T>(list: T[], item: T): void {
  const index = list.indexOf(item);
  if (index >= 0) {
    list.splice(index, 1);
  }
}
