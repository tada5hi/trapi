/*
 * Copyright (c) 2025.
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
    neverType,
    refObjectType,
    stringType,
    unionType,
} from '../../helpers/metadata-builder';

describe('never type in swagger output (#778)', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        User: createRefObject('User', [
            createProperty({ name: 'id', type: { typeName: 'integer' } }),
            createProperty({ name: 'name', type: stringType() }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'NeverController',
                path: 'never',
                methods: [
                    createMethod({
                        name: 'alwaysThrows',
                        method: 'get',
                        path: 'throws',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: neverType(),
                            }),
                        ],
                        type: neverType(),
                    }),
                    createMethod({
                        name: 'unionWithNever',
                        method: 'get',
                        path: 'union',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    refObjectType('User'),
                                    neverType(),
                                    stringType(),
                                ]),
                            }),
                        ],
                        type: unionType([
                            refObjectType('User'),
                            neverType(),
                            stringType(),
                        ]),
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

    describe('standalone never type', () => {
        it('V3: should produce no response body for never return type', () => {
            const response = specV3.paths['/never/throws'].get!.responses['200'];
            expect(response.description).toEqual('Success');
            expect(response).not.toHaveProperty('content');
        });

        it('V2: should produce no response body for never return type', () => {
            const response = specV2.paths['/never/throws'].get!.responses['200'];
            expect(response.description).toEqual('Success');
            expect(response).not.toHaveProperty('schema');
        });
    });

    describe('union containing never', () => {
        it('V3: should filter never from union members', () => {
            const { schema } = specV3.paths['/never/union'].get!.responses['200'].content['application/json'];
            // never is filtered out, leaving User (object) + string (primitive)
            // mixed union → anyOf
            expect(schema).toHaveProperty('anyOf');
            expect(schema.anyOf).toHaveLength(2);
        });

        it('V2: should filter never from union members', () => {
            const response = specV2.paths['/never/union'].get!.responses['200'];
            // V2 handles mixed unions as object type
            expect(response.schema).toBeDefined();
            expect(response.schema).not.toHaveProperty('oneOf');
        });
    });
});
