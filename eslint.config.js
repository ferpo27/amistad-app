// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Configuración base proporcionada por Expo
  expoConfig,

  // Configuración global para TypeScript (parser, plugins y opciones comunes)
  {
    languageOptions: {
      parser: require.resolve('@typescript-eslint/parser'),
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    // Aquí pueden añadirse reglas globales si se desea
    rules: {},
    // Ignorar la carpeta de salida de compilación
    ignores: ['dist/*'],
  },

  // Reglas estrictas de TypeScript aplicadas solo a archivos .ts y .tsx
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: require.resolve('@typescript-eslint/parser'),
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);