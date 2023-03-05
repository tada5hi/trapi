/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type {
    Metadata,
} from '../../../../../src';
import { MetadataGenerator } from '../../../../../src';

describe('library/typescript-rest', () => {
    let metadata : Metadata;

    beforeAll(async () => {
        const generator = new MetadataGenerator({
            entryPoint: ['./test/data/preset/typescript-rest/api.ts'],
            cache: false,
            preset: '@trapi/preset-typescript-rest',
        }, {});

        metadata = await generator.generate();
    });

    it('should be generated and have top level properties', () => {
        expect(metadata).toBeDefined();
        expect(metadata).toHaveProperty('controllers');
        expect(metadata).toHaveProperty('referenceTypes');
    });

    it('should have elements', () => {
        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should have abstract structure', () => {
        expect(metadata.controllers[0]).toHaveProperty('consumes');
        expect(metadata.controllers[0].consumes.length).toEqual(0);

        expect(metadata.controllers[0]).toHaveProperty('location');

        expect(metadata.controllers[0]).toHaveProperty('methods');
        expect(metadata.controllers[0].methods.length).toBeGreaterThan(0);

        expect(metadata.controllers[0]).toHaveProperty('name');
        expect(metadata.controllers[0].name).toEqual('TestUnionType');

        expect(metadata.controllers[0]).toHaveProperty('path');
        expect(metadata.controllers[0].path).toEqual('unionTypes');

        expect(metadata.controllers[0]).toHaveProperty('produces');
        expect(metadata.controllers[0].produces.length).toEqual(0);

        expect(metadata.controllers[0]).toHaveProperty('responses');
        expect(metadata.controllers[0].responses.length).toEqual(0);

        expect(metadata.controllers[0]).toHaveProperty('tags');
        expect(metadata.controllers[0].tags.length).toEqual(0);
    });

    it('should have methods', () => {
        const method = metadata.controllers[0].methods[0];

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
});
