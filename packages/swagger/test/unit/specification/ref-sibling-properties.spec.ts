/*
 * Copyright (c) 2024.
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
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generate } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createProperty,
    createRefObject,
    createResponse,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';

/**
 * OpenAPI 2.0 and 3.0 specification rule:
 * When a schema object contains a $ref, no sibling properties are allowed.
 * $ref must be the only key in the object.
 *
 * See: https://swagger.io/docs/specification/using-ref/
 */
describe('$ref sibling properties', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        Address: createRefObject('Address', [
            createProperty({ name: 'street', type: stringType() }),
            createProperty({ name: 'city', type: stringType() }),
        ]),
        Person: createRefObject('Person', [
            createProperty({
                name: 'address',
                type: refObjectType('Address'),
                description: 'Home address',
            }),
            createProperty({
                name: 'workplace',
                type: refObjectType('Address'),
                description: 'Work address',
                validators: { minLength: { value: 1 } },
            }),
            createProperty({
                name: 'backup',
                type: refObjectType('Address'),
                deprecated: true,
            }),
            createProperty({
                name: 'tagged',
                type: refObjectType('Address'),
                extensions: [{ key: 'x-custom', value: 'test' }],
            }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'PersonController',
                path: 'person',
                methods: [
                    createMethod({
                        name: 'get',
                        method: 'get',
                        path: '{id}',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: refObjectType('Person'),
                            }),
                        ],
                        type: refObjectType('Person'),
                        parameters: [
                            createParameter({
                                name: 'id',
                                in: 'path',
                                type: stringType(),
                            }),
                        ],
                    }),
                ],
            }),
        ],
        referenceTypes,
    );

    beforeAll(async () => {
        specV2 = await generate({
            version: Version.V2,
            options: {
                output: false, 
                servers: 'http://localhost:3000/', 
                metadata, 
            },
        });

        specV3 = await generate({
            version: Version.V3,
            options: {
                output: false, 
                servers: 'http://localhost:3000/', 
                metadata, 
            },
        });
    });

    describe('V2 - definitions', () => {
        it('should produce a $ref without sibling properties for reference-type properties', () => {
            const addressProp = specV2.definitions!.Person.properties!.address;
            expect(addressProp.$ref).toBeDefined();

            const keys = Object.keys(addressProp).filter((k) => k !== '$ref');
            expect(keys).toEqual([]);
        });

        it('should not merge validators alongside $ref', () => {
            const workplaceProp = specV2.definitions!.Person.properties!.workplace;
            expect(workplaceProp.$ref).toBeDefined();
            expect(workplaceProp).not.toHaveProperty('minLength');
        });

        it('should not merge x-deprecated alongside $ref', () => {
            const backupProp = specV2.definitions!.Person.properties!.backup;
            expect(backupProp.$ref).toBeDefined();
            expect(backupProp).not.toHaveProperty('x-deprecated');
        });

        it('should not merge extensions alongside $ref', () => {
            const taggedProp = specV2.definitions!.Person.properties!.tagged;
            expect(taggedProp.$ref).toBeDefined();
            expect(taggedProp).not.toHaveProperty('x-custom');
        });
    });

    describe('V3 - components/schemas', () => {
        it('should produce a $ref without sibling properties for reference-type properties', () => {
            const addressProp = specV3.components.schemas!.Person.properties!.address;
            expect(addressProp.$ref).toBeDefined();

            const keys = Object.keys(addressProp).filter((k) => k !== '$ref');
            expect(keys).toEqual([]);
        });

        it('should not merge validators alongside $ref', () => {
            const workplaceProp = specV3.components.schemas!.Person.properties!.workplace;
            expect(workplaceProp.$ref).toBeDefined();
            expect(workplaceProp).not.toHaveProperty('minLength');
        });

        it('should not merge deprecated alongside $ref', () => {
            const backupProp = specV3.components.schemas!.Person.properties!.backup;
            expect(backupProp.$ref).toBeDefined();
            expect(backupProp).not.toHaveProperty('deprecated');
        });

        it('should not merge extensions alongside $ref', () => {
            const taggedProp = specV3.components.schemas!.Person.properties!.tagged;
            expect(taggedProp.$ref).toBeDefined();
            expect(taggedProp).not.toHaveProperty('x-custom');
        });
    });
});
