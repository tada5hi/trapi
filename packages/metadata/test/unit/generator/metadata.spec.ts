/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import type { Metadata, NestedObjectLiteralType, RefAliasType } from '../../../src';
import { generateMetadata } from '../../../src';

describe('src/generator/metadata', () => {
    let metadata : Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.join(process.cwd(), '..', 'decorators'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });
    });

    it('should have properties', () => {
        expect(metadata).toHaveProperty('controllers');
        expect(metadata).toHaveProperty('referenceTypes');

        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should have utility-types controller', () => {
        let index = metadata.controllers.findIndex(
            (controller) => controller.name === 'UtilityTypes',
        );
        expect(index).toBeGreaterThanOrEqual(0);

        const controller = metadata.controllers[index];

        index = controller.methods.findIndex(
            (method) => method.name === 'pick',
        );
        expect(index).toBeGreaterThanOrEqual(0);

        let method = controller.methods[index];
        expect(method.name).toEqual('pick');
        let refAlias = ((method.type as RefAliasType).type as RefAliasType);
        let nestedObjectLiteral = (refAlias.type as NestedObjectLiteralType);
        expect(nestedObjectLiteral.properties.length).toEqual(1);
        let property = nestedObjectLiteral.properties.pop();
        expect(property.name).toEqual('bar');

        index = controller.methods.findIndex(
            (method) => method.name === 'omit',
        );
        expect(index).toBeGreaterThanOrEqual(0);

        method = controller.methods[index];
        expect(method.name).toEqual('omit');
        refAlias = ((method.type as RefAliasType).type as RefAliasType);
        nestedObjectLiteral = (refAlias.type as NestedObjectLiteralType);
        expect(nestedObjectLiteral.properties.length).toEqual(1);
        property = nestedObjectLiteral.properties.pop();
        expect(property.name).toEqual('baz');
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

        expect(controller).toHaveProperty('path');
        expect(controller.path).toEqual('unionTypes');

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
        const data = await generateMetadata({
            entryPoint: './test/fake-path',
        });

        expect(data).toBeDefined();
        expect(data).toEqual({ controllers: [], referenceTypes: {} });
    });
});
