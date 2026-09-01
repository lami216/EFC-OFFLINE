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
      // Preserve strict unused-variable checking while allowing the currently
      // staged CalendarRange icon until its UI action is wired.
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^CalendarRange$' }],
    },
  },
);
