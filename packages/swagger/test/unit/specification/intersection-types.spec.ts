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
    integerType,
    intersectionType,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';

describe('intersection types', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        HasName: createRefObject('HasName', [
            createProperty({ name: 'name', type: stringType() }),
        ]),
        HasAge: createRefObject('HasAge', [
            createProperty({ name: 'age', type: integerType() }),
        ]),
        NameAndAge: createRefAlias('NameAndAge', intersectionType([
            refObjectType('HasName'),
            refObjectType('HasAge'),
        ])),
        PersonModel: createRefObject('PersonModel', [
            createProperty({
                name: 'info',
                type: intersectionType([
                    refObjectType('HasName'),
                    refObjectType('HasAge'),
                ]),
            }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'IntersectionController',
                path: 'intersection',
                methods: [
                    createMethod({
                        name: 'get',
                        method: 'get',
                        path: '',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: refObjectType('PersonModel'),
                            }),
                        ],
                        type: refObjectType('PersonModel'),
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
        it('should flatten intersection to object with merged properties', () => {
            const infoProp = specV2.definitions!.PersonModel.properties!.info;
            expect(infoProp.type).toEqual('object');
            expect(infoProp.properties).toBeDefined();
        });

        it('should handle intersection ref alias', () => {
            const schema = specV2.definitions!.NameAndAge;
            expect(schema).toBeDefined();
            expect(schema.type).toEqual('object');
        });
    });

    describe('V3', () => {
        it('should use allOf for intersection types', () => {
            const infoProp = specV3.components.schemas!.PersonModel.properties!.info;
            expect(infoProp.allOf).toBeDefined();
            expect(infoProp.allOf).toHaveLength(2);
        });

        it('should reference component schemas in allOf members', () => {
            const infoProp = specV3.components.schemas!.PersonModel.properties!.info;
            const refs = infoProp.allOf!.map((m: any) => m.$ref);
            expect(refs).toContain('#/components/schemas/HasName');
            expect(refs).toContain('#/components/schemas/HasAge');
        });

        it('should handle intersection ref alias with allOf', () => {
            const schema = specV3.components.schemas!.NameAndAge;
            expect(schema).toBeDefined();
            expect(schema.allOf).toBeDefined();
        });
    });
});
