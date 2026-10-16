import config from '@tada5hi/eslint-config';

export default [
    {
        ignores: [
            '**/dist/**',
            '**/bin/**',
            'packages/docs/**',
            '.claude/**',
        ],
    },
    ...await config(),
    {
        rules: {
            'class-methods-use-this': 'off',
            'no-continue': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                args: 'after-used',
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],
        },
    },
    {
        // typescript@7 exports no compiler API; runtime values come from the
        // core/compiler loader, which falls back to @typescript/typescript6.
        files: ['packages/metadata/src/**/*.ts', 'packages/metadata/test/unit/**/*.ts'],
        rules: {
            '@typescript-eslint/no-restricted-imports': ['error', {
                paths: [{
                    name: 'typescript',
                    message: 'Import runtime values via `ts` from core/compiler (TypeScript 7 has no compiler API). Type imports are fine.',
                    allowTypeImports: true,
                }],
            }],
        },
    },
    {
        files: ['**/test/data/**', '**/decorators/src/decorators/**'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'max-classes-per-file': 'off',
        },
    },
];
