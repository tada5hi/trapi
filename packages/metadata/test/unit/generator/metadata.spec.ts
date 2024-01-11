/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { generateMetadata } from '../../../src';

describe('src/generator/metadata', () => {
    it('should generate metadata', async () => {
        const metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.join(process.cwd(), '..', 'decorators'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });

        expect(metadata).toBeDefined();
        expect(metadata).toHaveProperty('controllers');
        expect(metadata).toHaveProperty('referenceTypes');

        expect(metadata.controllers.length).toBeGreaterThan(0);

        const controllers = metadata.controllers.reverse();

        expect(controllers[0]).toHaveProperty('consumes');
        expect(controllers[0].consumes.length).toEqual(0);

        expect(controllers[0]).toHaveProperty('location');

        expect(controllers[0]).toHaveProperty('methods');
        expect(controllers[0].methods.length).toBeGreaterThan(0);

        expect(controllers[0]).toHaveProperty('name');
        expect(controllers[0].name).toEqual('TestUnionType');

        expect(controllers[0]).toHaveProperty('path');
        expect(controllers[0].path).toEqual('unionTypes');

        expect(controllers[0]).toHaveProperty('produces');
        expect(controllers[0].produces.length).toEqual(0);

        expect(controllers[0]).toHaveProperty('responses');
        expect(controllers[0].responses.length).toEqual(0);

        expect(controllers[0]).toHaveProperty('tags');
        expect(controllers[0].tags.length).toEqual(0);

        const method = controllers[0].methods[0];

        expect(method).toHaveProperty('consumes');
        expect(method.consumes.length).toEqual(0);

        expect(method).toHaveProperty('deprecated');
        expect(method.deprecated).toBeFalsy();

        expect(method).toHaveProperty('extensions');
        expect(method.extensions.length).toEqual(0);

        expect(method).toHaveProperty('hidden');
        expect(method.hidden).toBeFalsy();

        expect(method).toHaveProperty('method');
        expect(method.method).toEqual('post');

        expect(method).toHaveProperty('name');
        expect(method.name).toEqual('post');

        expect(method).toHaveProperty('parameters');
        expect(method.parameters.length).toBeGreaterThan(0);

        expect(method).toHaveProperty('path');
        expect(method.path).toEqual('');

        expect(method).toHaveProperty('produces');
        expect(method.produces.length).toEqual(0);

        expect(method).toHaveProperty('responses');
        expect(method.responses.length).toEqual(1);

        expect(method).toHaveProperty('tags');
        expect(method.tags.length).toEqual(0);

        expect(method).toHaveProperty('type');
        expect(method.type).toHaveProperty('typeName');
        expect(method.type.typeName).toEqual('string');
    });

    it('should not generate metadata', async () => {
        const data = await generateMetadata({
            entryPoint: './test/fake-path',
        });

        expect(data).toBeDefined();
        expect(data).toEqual({ controllers: [], referenceTypes: {} });
    });
});
