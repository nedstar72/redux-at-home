export function assignWithSymbols(target: any, source: any) {
  Object.assign(target, source);

  if (Object.getOwnPropertySymbols) {
    Object.getOwnPropertySymbols(source).forEach(s => {
      target[s] = source[s];
    });
  }
}
