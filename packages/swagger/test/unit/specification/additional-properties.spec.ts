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
    createRefObject,
    createResponse,
    integerType,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';

describe('additionalProperties', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        StringMap: createRefObject('StringMap', [], { additionalProperties: stringType() }),
        TypedMap: createRefObject('TypedMap', [
            createProperty({ name: 'known', type: stringType() }),
        ], { additionalProperties: integerType() }),
        BooleanMap: createRefObject('BooleanMap', [], { additionalProperties: { typeName: 'boolean' } }),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'MapController',
                paths: ['maps'],
                methods: [
                    createMethod({
                        name: 'getStringMap',
                        method: 'get',
                        path: 'string',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: refObjectType('StringMap'),
                            }),
                        ],
                        type: refObjectType('StringMap'),
                    }),
                    createMethod({
                        name: 'getTypedMap',
                        method: 'get',
                        path: 'typed',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: refObjectType('TypedMap'),
                            }),
                        ],
                        type: refObjectType('TypedMap'),
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
        it('should set additionalProperties for string map', () => {
            const def = specV2.definitions!.StringMap;
            expect(def.type).toEqual('object');
            expect(def.additionalProperties).toBeDefined();
        });

        it('should set additionalProperties to true (V2 limitation)', () => {
            const def = specV2.definitions!.StringMap;
            // V2 generator uses boolean additionalProperties (doesn't preserve type)
            expect(def.additionalProperties).toBe(true);
        });

        it('should support additionalProperties alongside named properties', () => {
            const def = specV2.definitions!.TypedMap;
            expect(def.properties).toBeDefined();
            expect(def.properties!.known).toBeDefined();
            expect(def.additionalProperties).toBeDefined();
        });
    });

    describe('V3', () => {
        it('should set typed additionalProperties for string map', () => {
            const schema = specV3.components.schemas!.StringMap;
            expect(schema.type).toEqual('object');
            expect(schema.additionalProperties).toBeDefined();
            expect(typeof schema.additionalProperties).toBe('object');
            expect((schema.additionalProperties as any).type).toEqual('string');
        });

        it('should support additionalProperties alongside named properties', () => {
            const schema = specV3.components.schemas!.TypedMap;
            expect(schema.properties).toBeDefined();
            expect(schema.properties!.known).toBeDefined();
            expect(schema.additionalProperties).toBeDefined();
            expect(typeof schema.additionalProperties).toBe('object');
            expect((schema.additionalProperties as any).type).toEqual('integer');
        });

        it('should not use bare $ref in additionalProperties', () => {
            const schema = specV3.components.schemas!.StringMap;
            expect(typeof schema.additionalProperties).toBe('object');
            const ap = schema.additionalProperties as any;
            // StringMap has string additionalProperties, not a $ref
            expect(ap.type).toEqual('string');
            expect(ap.$ref).toBeUndefined();
        });
    });
});
