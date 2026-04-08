import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx,js,jsx}'],
            exclude: [
                'src/**/*.d.ts',
                'src/decorator/functions.ts',
                'src/decorator/mapper/maps/**/*',
                'src/decorator/utils/validator.ts',
                'src/resolver/**/*.ts',
                'src/utils/validator.ts',
            ],
            thresholds: {
                branches: 58,
                functions: 77,
                lines: 73,
                statements: 73,
            },
        },
    },
});
