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
      // These two React Compiler-oriented rules are not correctness checks for
      // this Tauri app and currently produce false positives for legitimate
      // async resource-loading effects and react-hook-form's watch() API.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      // Keep unused-variable checking strict, except for the existing imported
      // CalendarRange icon while its related UI action is being wired up.
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^CalendarRange$' }],
    },
  },
);
