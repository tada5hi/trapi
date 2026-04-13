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
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createProperty,
    createRefAlias,
    createRefObject,
    createResponse,
    enumType,
    integerType,
    refObjectType,
    stringType,
    unionType,
} from '../../helpers/metadata-builder';

/**
 * Nullable type handling differs between OpenAPI versions:
 * - V2: uses x-nullable: true extension
 * - V3 (3.0.x): uses nullable: true
 * - V3 (3.1.x): uses type arrays ["string", "null"]
 *
 * trapi targets 3.0.0 and uses the 3.0.x nullable pattern.
 */
describe('nullable types', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        NullableModel: createRefObject('NullableModel', [
            createProperty({
                name: 'requiredField',
                type: stringType(),
            }),
            createProperty({
                name: 'nullableString',
                type: unionType([
                    stringType(),
                    enumType([null]),
                ]),
            }),
            createProperty({
                name: 'nullableRef',
                type: unionType([
                    refObjectType('InnerModel'),
                    enumType([null]),
                ]),
            }),
        ]),
        InnerModel: createRefObject('InnerModel', [
            createProperty({ name: 'value', type: integerType() }),
        ]),
        NullableAlias: createRefAlias('NullableAlias', unionType([
            stringType(),
            enumType([null]),
        ])),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'NullableController',
                path: 'nullable',
                methods: [
                    createMethod({
                        name: 'get',
                        method: 'get',
                        path: '',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: refObjectType('NullableModel'),
                            }),
                        ],
                        type: refObjectType('NullableModel'),
                    }),
                ],
            }),
        ],
        referenceTypes,
    );

    beforeAll(async () => {
        specV2 = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });

        specV3 = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    describe('V2', () => {
        it('should use x-nullable for nullable string union', () => {
            const prop = specV2.definitions!.NullableModel.properties!.nullableString;
            expect(prop.type).toEqual('string');
            expect(prop['x-nullable']).toBe(true);
        });

        it('should handle nullable reference type', () => {
            const prop = specV2.definitions!.NullableModel.properties!.nullableRef;
            expect(prop.$ref).toBeDefined();
        });

        it('should not mark non-nullable fields as nullable', () => {
            const prop = specV2.definitions!.NullableModel.properties!.requiredField;
            expect(prop.type).toEqual('string');
            expect(prop['x-nullable']).toBeFalsy();
        });
    });

    describe('V3', () => {
        it('should use nullable for nullable string union', () => {
            const prop = specV3.components.schemas!.NullableModel.properties!.nullableString;
            expect(prop.type).toEqual('string');
            expect(prop.nullable).toBe(true);
        });

        it('should handle nullable reference type with allOf wrapper', () => {
            const prop = specV3.components.schemas!.NullableModel.properties!.nullableRef;
            // V3 wraps nullable refs in allOf to avoid sibling properties next to $ref
            expect(prop).not.toHaveProperty('$ref');
            expect(prop).toHaveProperty('allOf');
            expect(prop.allOf).toHaveLength(1);
            expect(prop.allOf[0].$ref).toEqual('#/components/schemas/InnerModel');
            expect(prop.nullable).toBe(true);
        });

        it('should not mark non-nullable fields as nullable', () => {
            const prop = specV3.components.schemas!.NullableModel.properties!.requiredField;
            expect(prop.type).toEqual('string');
            expect(prop.nullable).toBeFalsy();
        });

        it('should handle nullable alias type', () => {
            const schema = specV3.components.schemas!.NullableAlias;
            expect(schema).toBeDefined();
            expect(schema.nullable).toBe(true);
            expect(schema.type).toEqual('string');
        });
    });
});
