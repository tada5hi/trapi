import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx,js,jsx}'],
            exclude: [
                'src/**/*.d.ts',
                'src/bin.ts',
                'src/utils.ts',
                'src/module.ts',
                'src/index.ts',
                'src/commands/index.ts',
                'src/commands/watch.ts',
                'src/config/index.ts',
                'src/config/define.ts',
            ],
        },
    },
});
