import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    {ignores: ['build/**', 'node_modules/**', 'src/gql/__generated__/**']},
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {globals: {...globals.browser}},
        plugins: {'react-hooks': reactHooks},
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // ported from the former tslint configuration
            '@typescript-eslint/array-type': ['error', {default: 'array-simple'}],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-namespace': ['error', {allowDeclarations: true}],
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/no-unused-vars': 'off', // checked by tsc (noUnusedLocals, noUnusedParameters)
            complexity: ['error', 20],
            curly: 'error',
            'default-case': 'error',
            eqeqeq: ['error', 'always', {null: 'ignore'}],
            'no-debugger': 'error',
            'no-empty': ['error', {allowEmptyCatch: true}],
            'no-duplicate-imports': 'error',
            'no-restricted-exports': ['error', {restrictDefaultExports: {direct: true}}],
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-const': 'error',
            'prefer-object-spread': 'error',
            radix: 'error',
        },
    },
    {
        // tools and type declarations of modules require default exports
        files: ['*.config.{ts,mjs}', 'codegen.ts', '**/*.d.ts'],
        languageOptions: {globals: {...globals.node}},
        rules: {'no-restricted-exports': 'off'},
    },
];
