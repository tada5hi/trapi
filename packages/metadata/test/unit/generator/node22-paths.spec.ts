import { expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMetadata } from '../../../src';

it('extracts colon path parameters without RegExp.escape on the consumer runtime', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(RegExp, 'escape');

    Object.defineProperty(RegExp, 'escape', { configurable: true, value: undefined });

    try {
        const metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/parameterized.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
        const controller = metadata.controllers.find((value) => value.name === 'ParameterizedEndpoint');

        expect(controller?.methods[0]?.parameters).toContainEqual(expect.objectContaining({
            in: 'path',
            name: 'objectId',
        }));
    } finally {
        if (descriptor) {
            Object.defineProperty(RegExp, 'escape', descriptor);
        } else {
            Reflect.deleteProperty(RegExp, 'escape');
        }
    }
});
