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
    arrayType,
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createResponse,
    fileType,
    stringType,
    voidType,
} from '../../helpers/metadata-builder';

describe('file upload / multipart form data', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const metadata = createMetadata(
        [
            createController({
                name: 'UploadController',
                path: 'upload',
                methods: [
                    createMethod({
                        name: 'singleFile',
                        method: 'post',
                        path: 'single',
                        parameters: [
                            createParameter({
                                name: 'file',
                                in: 'formData',
                                type: fileType(),
                            }),
                        ],
                        responses: [createResponse({ status: '200', description: 'File uploaded' })],
                        type: voidType(),
                    }),
                    createMethod({
                        name: 'multipleFiles',
                        method: 'post',
                        path: 'multiple',
                        parameters: [
                            createParameter({
                                name: 'files',
                                in: 'formData',
                                type: arrayType(fileType()),
                            }),
                        ],
                        responses: [createResponse({ status: '200', description: 'Files uploaded' })],
                        type: voidType(),
                    }),
                    createMethod({
                        name: 'fileWithField',
                        method: 'post',
                        path: 'mixed',
                        parameters: [
                            createParameter({
                                name: 'document',
                                in: 'formData',
                                type: fileType(),
                            }),
                            createParameter({
                                name: 'description',
                                in: 'formData',
                                type: stringType(),
                            }),
                        ],
                        responses: [createResponse({ status: '200', description: 'Upload with metadata' })],
                        type: voidType(),
                    }),
                    createMethod({
                        name: 'optionalFile',
                        method: 'post',
                        path: 'optional',
                        parameters: [
                            createParameter({
                                name: 'file',
                                in: 'formData',
                                type: fileType(),
                                required: false,
                            }),
                        ],
                        responses: [createResponse({ status: '200', description: 'Optional file' })],
                        type: voidType(),
                    }),
                ],
            }),
        ],
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
        it('should set consumes to multipart/form-data for file upload', () => {
            const op = specV2.paths['/upload/single'].post!;
            expect(op.consumes).toContain('multipart/form-data');
        });

        it('should produce formData parameter with type file', () => {
            const params = specV2.paths['/upload/single'].post!.parameters!;
            const fileParam = params.find((p: any) => p.name === 'file');
            expect(fileParam).toBeDefined();
            expect((fileParam as any).in).toEqual('formData');
            expect((fileParam as any).type).toEqual('file');
        });

        it('should handle mixed file and form field parameters', () => {
            const op = specV2.paths['/upload/mixed'].post!;
            expect(op.consumes).toContain('multipart/form-data');

            const params = op.parameters!;
            const docParam = params.find((p: any) => p.name === 'document');
            const descParam = params.find((p: any) => p.name === 'description');

            expect(docParam).toBeDefined();
            expect((docParam as any).type).toEqual('file');
            expect(descParam).toBeDefined();
            expect((descParam as any).type).toEqual('string');
        });

        it('should mark optional file as not required', () => {
            const params = specV2.paths['/upload/optional'].post!.parameters!;
            const fileParam = params.find((p: any) => p.name === 'file');
            expect(fileParam).toBeDefined();
            expect((fileParam as any).required).toBe(false);
        });
    });

    describe('V3', () => {
        it('should use requestBody with multipart/form-data for single file', () => {
            const op = specV3.paths['/upload/single'].post!;
            expect(op.requestBody).toBeDefined();
            expect(op.requestBody!.content).toHaveProperty('multipart/form-data');

            const schema = op.requestBody!.content['multipart/form-data'].schema!;
            expect(schema.type).toEqual('object');
            expect(schema.properties).toBeDefined();
            expect(schema.properties!.file).toBeDefined();
        });

        it('should handle file type in multipart schema', () => {
            const schema = specV3.paths['/upload/single'].post!
                .requestBody!.content['multipart/form-data'].schema!;
            const fileProp = schema.properties!.file;
            expect(fileProp.type).toEqual('string');
            expect(fileProp.format).toEqual('binary');
        });

        it('should handle mixed file and form field in multipart', () => {
            const schema = specV3.paths['/upload/mixed'].post!
                .requestBody!.content['multipart/form-data'].schema!;
            expect(schema.properties!.document).toBeDefined();
            expect(schema.properties!.description).toBeDefined();
            expect(schema.properties!.description.type).toEqual('string');
        });

        it('should not include optional file in required array', () => {
            const schema = specV3.paths['/upload/optional'].post!
                .requestBody!.content['multipart/form-data'].schema!;
            if (schema.required) {
                expect(schema.required).not.toContain('file');
            }
        });

        it('should include required file in required array', () => {
            const schema = specV3.paths['/upload/single'].post!
                .requestBody!.content['multipart/form-data'].schema!;
            expect(schema.required).toBeDefined();
            expect(schema.required).toContain('file');
        });
    });
});
