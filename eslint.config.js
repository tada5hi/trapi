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
        files: ['**/test/data/**', '**/decorators/src/decorators/**'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'max-classes-per-file': 'off',
        },
    },
];
