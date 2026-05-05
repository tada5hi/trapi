/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { 
    beforeAll, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NestedObjectLiteralType, RefAliasType } from '@trapi/core';
import type { Metadata } from '../../../src';
import { generateMetadata } from '../../../src';

describe('src/generator/metadata', () => {
    let metadata : Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
    });

    it('should have properties', () => {
        expect(metadata).toHaveProperty('controllers');
        expect(metadata).toHaveProperty('referenceTypes');

        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should have utility-types controller', () => {
        const controller = metadata.controllers.find(
            (c) => c.name === 'UtilityTypes',
        )!;
        expect(controller).toBeDefined();

        // pick
        const pick = controller.methods.find((m) => m.name === 'pick')!;
        expect(pick).toBeDefined();
        expect(pick.type.typeName).toEqual('refAlias');
        const pickAlias = pick.type as RefAliasType;
        expect(pickAlias.type.typeName).toEqual('nestedObjectLiteral');
        const pickObj = pickAlias.type as NestedObjectLiteralType;
        expect(pickObj.properties).toHaveLength(1);
        expect(pickObj.properties[0].name).toEqual('bar');

        // omit
        const omit = controller.methods.find((m) => m.name === 'omit')!;
        expect(omit).toBeDefined();
        expect(omit.type.typeName).toEqual('refAlias');
        const omitAlias = omit.type as RefAliasType;
        expect(omitAlias.type.typeName).toEqual('nestedObjectLiteral');
        const omitObj = omitAlias.type as NestedObjectLiteralType;
        expect(omitObj.properties).toHaveLength(1);
        expect(omitObj.properties[0].name).toEqual('baz');

        // partial
        const partial = controller.methods.find((m) => m.name === 'partial')!;
        expect(partial).toBeDefined();
        expect(partial.type.typeName).toEqual('refAlias');
        const partialAlias = partial.type as RefAliasType;
        expect(partialAlias.type.typeName).toEqual('nestedObjectLiteral');
    });

    it('should generate metadata', async () => {
        const index = metadata.controllers.findIndex(
            (controller) => controller.name === 'TestUnionType',
        );
        expect(index).toBeGreaterThanOrEqual(0);

        const controller = metadata.controllers[index];

        expect(controller).toHaveProperty('consumes');
        expect(controller.consumes.length).toEqual(0);

        expect(controller).toHaveProperty('location');

        expect(controller).toHaveProperty('methods');
        expect(controller.methods.length).toBeGreaterThan(0);

        expect(controller).toHaveProperty('name');
        expect(controller.name).toEqual('TestUnionType');

        expect(controller).toHaveProperty('paths');
        expect(controller.paths).toEqual(['unionTypes']);

        expect(controller).toHaveProperty('produces');
        expect(controller.produces.length).toEqual(0);

        expect(controller).toHaveProperty('responses');
        expect(controller.responses.length).toEqual(0);

        expect(controller).toHaveProperty('tags');
        expect(controller.tags.length).toEqual(0);

        const method = controller.methods[0];

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
        const data = await generateMetadata({ entryPoint: './test/fake-path' });

        expect(data).toBeDefined();
        expect(data).toEqual({ controllers: [], referenceTypes: {} });
    });
});
