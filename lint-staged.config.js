export default {
  '**/*.{js,ts,tsx,json,md,yml}': 'prettier --write',
  '**/*.{js,ts,tsx}': 'oxlint',
  '**/*.ts?(x)': () => 'tsc -p tsconfig.json --noEmit',
};
