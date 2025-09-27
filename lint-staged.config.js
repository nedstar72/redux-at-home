export default {
  '**/*.{js,ts,tsx,json,md,yml}': 'prettier --write',
  '**/*.{js,ts,tsx}': 'eslint --max-warnings=0',
  '**/*.ts?(x)': () => 'tsc -p tsconfig.json --noEmit',
};
