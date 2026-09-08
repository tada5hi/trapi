/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
} from 'vitest';
import { Version, generateSwagger } from '../../../src';
import {
    bufferType,
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createResponse,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';

describe('error paths', () => {
    describe('V2 - duplicate body parameters', () => {
        it('should throw when method has multiple body parameters', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'BadController',
                    paths: ['bad'],
                    methods: [
                        createMethod({
                            name: 'twoBody',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'body1',
                                    in: 'body',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'body2',
                                    in: 'body',
                                    type: stringType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            await expect(generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/body parameter/i);
        });
    });

    describe('V3 - duplicate body parameters', () => {
        it('should throw when method has multiple body parameters', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'BadController',
                    paths: ['bad'],
                    methods: [
                        createMethod({
                            name: 'twoBody',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'body1',
                                    in: 'body',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'body2',
                                    in: 'body',
                                    type: stringType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            await expect(generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/body parameter/i);
        });
    });

    describe('V2 - body and form conflict', () => {
        it('should throw when method has both body and form parameters', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'ConflictController',
                    paths: ['conflict'],
                    methods: [
                        createMethod({
                            name: 'bodyAndForm',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'body',
                                    in: 'body',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'file',
                                    in: 'formData',
                                    type: stringType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            await expect(generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/Cannot mix body and form parameters/);
        });
    });

    describe('V3 - body and form conflict', () => {
        it('should throw when method has both body and form parameters', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'ConflictController',
                    paths: ['conflict'],
                    methods: [
                        createMethod({
                            name: 'bodyAndForm',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'body',
                                    in: 'body',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'file',
                                    in: 'formData',
                                    type: stringType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            await expect(generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/body.*form|form.*body/i);
        });
    });

    describe('V2 - bodyProp and form conflict', () => {
        // Unlike `@Body` + form, this pair is reachable from ordinary decorated
        // source: V2 emitted `in: body` beside `in: formData`, V3 dropped the
        // upload while still advertising `multipart/form-data`.
        it('should throw when method has both bodyProp and form parameters', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'UploadController',
                    paths: ['uploads'],
                    methods: [
                        createMethod({
                            name: 'bodyPropAndFile',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'title',
                                    in: 'bodyProp',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'avatar',
                                    in: 'formData',
                                    type: bufferType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            await expect(generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/Cannot mix body and form parameters/);
        });
    });

    describe('V3 - bodyProp and form conflict', () => {
        it('should throw when method has both bodyProp and form parameters', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'UploadController',
                    paths: ['uploads'],
                    methods: [
                        createMethod({
                            name: 'bodyPropAndFile',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'title',
                                    in: 'bodyProp',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'avatar',
                                    in: 'formData',
                                    type: bufferType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            await expect(generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/Cannot mix body and form parameters/);
        });
    });

    describe('V2 - unsupported parameter sources', () => {
        it('should silently ignore cookie parameters in V2', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'CookieController',
                    paths: ['cookie'],
                    methods: [
                        createMethod({
                            name: 'getCookie',
                            method: 'get',
                            path: '{id}',
                            parameters: [
                                createParameter({
                                    name: 'id',
                                    in: 'path',
                                    type: stringType(),
                                }),
                                createParameter({
                                    name: 'session',
                                    in: 'cookie',
                                    type: stringType(),
                                }),
                            ],
                        }),
                    ],
                }),
            ]);

            // V2 only processes path, queryProp, header, formData — cookie is filtered out
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            const params = spec.paths['/cookie/{id}'].get!.parameters!;
            const paramNames = params.map((p: any) => p.name);
            expect(paramNames).toContain('id');
            expect(paramNames).not.toContain('session');
        });
    });

    describe('enum error handling', () => {
        it('should throw for unsupported enum value types', async () => {
            const metadata = createMetadata(
                [
                    createController({
                        name: 'EnumController',
                        paths: ['enum'],
                        methods: [
                            createMethod({
                                name: 'get',
                                method: 'get',
                                path: '',
                                responses: [
                                    createResponse({
                                        status: '200',
                                        schema: refObjectType('BadEnum'),
                                    }),
                                ],
                                type: refObjectType('BadEnum'),
                            }),
                        ],
                    }),
                ],
                {
                    BadEnum: {
                        typeName: 'refEnum',
                        refName: 'BadEnum',
                        // Symbol is not a valid enum value type
                        members: [Symbol('bad') as any],
                        deprecated: false,
                    },
                },
            );

            await expect(generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            })).rejects.toThrow(/unsupported type/i);
        });
    });

    describe('hidden methods', () => {
        it('V3 should skip hidden methods', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'HiddenController',
                    paths: ['hidden'],
                    methods: [
                        createMethod({
                            name: 'visible',
                            method: 'get',
                            path: 'visible',
                        }),
                        createMethod({
                            name: 'invisible',
                            method: 'get',
                            path: 'invisible',
                            hidden: true,
                        }),
                    ],
                }),
            ]);

            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            expect(spec.paths).toHaveProperty('/hidden/visible');
            expect(spec.paths).not.toHaveProperty('/hidden/invisible');
        });
    });

    describe('empty metadata', () => {
        it('should handle empty controllers array', async () => {
            const metadata = createMetadata([]);

            const specV2 = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            expect(specV2.paths).toEqual({});
            expect(specV2.definitions).toEqual({});
        });

        it('V3 should handle empty controllers array', async () => {
            const metadata = createMetadata([]);

            const specV3 = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            expect(specV3.paths).toEqual({});
            expect(specV3.components.schemas).toEqual({});
        });
    });
});
