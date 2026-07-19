import globals from 'globals';
import reviewableConfigBaseline from 'reviewable-configs/eslint-config/baseline.js';
import reviewableConfigTypescript from 'reviewable-configs/eslint-config/typescript.js';

export default [
  ...reviewableConfigBaseline,
  ...reviewableConfigTypescript,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.node
    }
  },
];
