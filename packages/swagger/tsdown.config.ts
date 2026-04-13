import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts', 'src/metadata.ts'],
    format: 'esm',
    dts: true,
    sourcemap: true,
});
