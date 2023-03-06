/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import jsonata from 'jsonata';
import { load } from 'locter';
import type {
    Metadata,
    SpecificationV2,
    SpecificationV3,
} from '../../../src';
import {
    createSpecificationGenerator,
} from '../../../src';

describe('TypeEndpoint', () => {
    let spec : SpecificationV2.SpecV2 | SpecificationV3.SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        const specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });

        spec = await specGenerator.getSwaggerSpec();
    });

    it('should generate definitions for type aliases', async () => {
        expect(spec.paths).toHaveProperty('/type/{param}');
        let expression = jsonata('definitions.SimpleHelloType.properties.greeting.description');
        expect(await expression.evaluate(spec)).toEqual('Description for greeting property');

        expression = jsonata('definitions.UUID');
        expect(await expression.evaluate(spec)).toEqual({
            description: undefined,
            default: undefined,
            example: undefined,
            format: undefined,
            type: 'string',
        });
    });

    it('should generate nested object types in definitions', async () => {
        let expression = jsonata('definitions.SimpleHelloType.properties.profile.type');
        expect(await expression.evaluate(spec)).toEqual('object');
        expression = jsonata('definitions.SimpleHelloType.properties.profile.description');
        expect(await expression.evaluate(spec)).toEqual('Description for profile');
        expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.type');
        expect(await expression.evaluate(spec)).toEqual('string');
        expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.description');
        expect(await expression.evaluate(spec)).toEqual('Description for profile name');
    });

    it('should ignore properties that are functions', async () => {
        const expression = jsonata('definitions.SimpleHelloType.properties.comparePassword');
        expect(await expression.evaluate(spec)).toBeDefined(); // todo: fix
    });

    it('should support compilerOptions', async () => {
        let expression = jsonata('definitions.TestInterface');
        expect(await expression.evaluate(spec)).toEqual({
            description: undefined,
            properties: {
                a: { type: 'string', description: undefined },
                b: { type: 'number', format: 'double', description: undefined },
            },
            required: ['a', 'b'],
            type: 'object',
        });
        expect(spec.paths).toHaveProperty('/mypath/test-compiler-options');
        expression = jsonata('paths."/mypath/test-compiler-options".post.responses."200".schema');
        expect(await expression.evaluate(spec)).toEqual({ $ref: '#/definitions/TestInterface' });
        expression = jsonata('paths."/mypath/test-compiler-options".post.parameters[0].schema');
        expect(await expression.evaluate(spec)).toEqual({ $ref: '#/definitions/TestInterface' });
    });
    /*
    it('should support formparam', () => {
        expect(spec.paths).toHaveProperty('/mypath/test-form-param');
        let expression = jsonata('paths."/mypath/test-form-param".post.responses."200".schema');
        expect(expression.evaluate(spec)).toEqual({ type: 'string' });
        expression = jsonata('paths."/mypath/test-form-param".post.parameters[0]');
        expect(expression.evaluate(spec)).toEqual({
            description: '',
            in: 'formData',
            name: 'id',
            required: true,
            type: 'string',
        });
    });

     */
});
