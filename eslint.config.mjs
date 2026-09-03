import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'src-tauri/target'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      // These React Compiler-oriented checks currently flag legitimate async
      // Tauri/SQLite loading effects and react-hook-form's watch() API. They are
      // not runtime correctness failures for this app, so keep them out of CI.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      // Short-circuit guards are intentionally used in click handlers where an
      // optional row action is present only when an id exists.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],
    },
  },
);
