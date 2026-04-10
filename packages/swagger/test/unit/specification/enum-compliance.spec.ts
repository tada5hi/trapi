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
    createProperty,
    createRefEnum,
    createRefObject,
    createResponse,
    refEnumType,
    refObjectType,
} from '../../helpers/metadata-builder';

describe('enum spec compliance', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        StringEnum: createRefEnum('StringEnum', ['active', 'inactive', 'pending']),
        NumericEnum: createRefEnum('NumericEnum', [0, 1, 2]),
        MixedEnum: createRefEnum('MixedEnum', ['option1', 0, 'option2']),
        NamedEnum: createRefEnum('NamedEnum', ['read', 'write', 'admin'], { memberNames: ['Read', 'Write', 'Admin'] }),
        EnumModel: createRefObject('EnumModel', [
            createProperty({
                name: 'status',
                type: refEnumType('StringEnum', ['active', 'inactive', 'pending']),
            }),
            createProperty({
                name: 'level',
                type: refEnumType('NumericEnum', [0, 1, 2]),
            }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'EnumController',
                path: 'enums',
                methods: [
                    createMethod({
                        name: 'get',
                        method: 'get',
                        path: '',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: refObjectType('EnumModel'),
                            }),
                        ],
                        type: refObjectType('EnumModel'),
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

    describe('V2', () => {
        it('should generate string enum with correct type', () => {
            const def = specV2.definitions!.StringEnum;
            expect(def.type).toEqual('string');
            expect(def.enum).toEqual(['active', 'inactive', 'pending']);
        });

        it('should generate numeric enum with number type', () => {
            const def = specV2.definitions!.NumericEnum;
            expect(def.type).toEqual('number');
            expect(def.enum).toEqual([0, 1, 2]);
        });

        it('should handle mixed enum', () => {
            const def = specV2.definitions!.MixedEnum;
            expect(def.type).toEqual('string');
            expect(def.enum).toBeDefined();
        });

        it('should include x-enum-varnames when memberNames are provided', () => {
            const def = specV2.definitions!.NamedEnum;
            expect(def['x-enum-varnames']).toEqual(['Read', 'Write', 'Admin']);
        });

        it('should not include null in enum values', () => {
            const def = specV2.definitions!.StringEnum;
            expect(def.enum).not.toContain(null);
        });
    });

    describe('V3', () => {
        it('should generate string enum with correct type', () => {
            const schema = specV3.components.schemas!.StringEnum;
            expect(schema.type).toEqual('string');
            expect(schema.enum).toEqual(['active', 'inactive', 'pending']);
        });

        it('should generate numeric enum with number type', () => {
            const schema = specV3.components.schemas!.NumericEnum;
            expect(schema.type).toEqual('number');
            expect(schema.enum).toEqual([0, 1, 2]);
        });

        it('should handle mixed enum with anyOf for multi-type', () => {
            const schema = specV3.components.schemas!.MixedEnum;
            expect(schema.anyOf).toBeDefined();
            if (schema.anyOf) {
                for (const entry of schema.anyOf) {
                    expect(entry.type).toBeDefined();
                    expect(entry.enum).toBeDefined();
                    expect(entry.enum).not.toContain(null);
                }
            }
        });

        it('should include x-enum-varnames when memberNames are provided', () => {
            const schema = specV3.components.schemas!.NamedEnum;
            expect(schema['x-enum-varnames']).toEqual(['Read', 'Write', 'Admin']);
        });
    });
});
