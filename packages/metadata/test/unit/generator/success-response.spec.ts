/*
 * Copyright (c) 2026.
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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Metadata, Method, Response } from '@trapi/core';
import {
    controller,
    createRegistry,
    method,
    readNumber,
    readString,
} from '@trapi/core';
import { generateMetadata } from '../../../src';

const report = {
    typeName: 'refObject',
    refName: 'IReport',
};

const readStrings = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []);

describe('success response', () => {
    let metadata: Metadata;
    const finalized: string[] = [];

    const findMethod = (controllerName: string, name: string): Method => {
        const owner = metadata.controllers.find((c) => c.name === controllerName)!;

        return owner.methods.find((m) => m.name === name)!;
    };

    const own = (name: string) => findMethod('SuccessResponseController', name);
    const xml = (name: string) => findMethod('ControllerSuccessProducesController', name);

    // The response that carries the return type is always the last one here.
    const successResponse = (m: Method): Response => m.responses[m.responses.length - 1]!;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/success-response'),
                pattern: '**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
            registry: createRegistry({
                methodFinalizers: [(ctx) => {
                    finalized.push(`${ctx.host.parentName}.${ctx.host.name}`);
                }],
                controllers: [
                    controller({
                        match: { name: 'SuccessProduces', on: 'class' },
                        apply: (ctx, draft) => {
                            draft.successProduces.push(readString(ctx.argument(0))!);
                        },
                    }),
                ],
                methods: [
                    method({
                        match: { name: 'Status', on: 'method' },
                        apply: (ctx, draft) => {
                            draft.successStatus = String(readNumber(ctx.argument(0)));
                        },
                    }),
                    method({
                        match: { name: 'SuccessProduces', on: 'method' },
                        apply: (ctx, draft) => {
                            draft.successProduces.push(readString(ctx.argument(0))!);
                        },
                    }),
                    method({
                        match: { name: 'Respond', on: 'method' },
                        apply: (ctx, draft) => {
                            const status = String(readNumber(ctx.argument(0)));
                            const produces = readStrings(ctx.argument(2)?.raw);

                            draft.responses.push({
                                name: status,
                                status,
                                description: readString(ctx.argument(1))!,
                                ...(produces.length > 0 ? { produces } : {}),
                            });
                        },
                    }),
                ],
            }),
        });
    });

    describe('successProduces', () => {
        it('should attach the media types to the implicit 200', () => {
            const { responses } = own('pdf');

            expect(responses).toHaveLength(1);
            expect(responses[0]).toMatchObject({
                status: '200',
                description: 'Ok',
                produces: ['application/pdf'],
            });
        });

        it('should attach the media types to the success status', () => {
            const { responses } = own('created');

            expect(responses).toHaveLength(1);
            expect(responses[0]).toMatchObject({
                status: '201',
                description: 'Created',
                schema: report,
                produces: ['application/pdf'],
            });
        });

        it('should give the media types to a handler response at the status without its own', () => {
            const { responses } = own('respondWithout');

            expect(responses).toHaveLength(1);
            expect(responses[0]).toEqual({
                name: '201',
                status: '201',
                description: 'Report created',
                schema: expect.objectContaining(report),
                produces: ['application/pdf'],
            });
        });

        it('should keep the own media types of a handler response at the status', () => {
            const { responses } = own('respondWithOwn');

            expect(responses).toHaveLength(1);
            expect(responses[0]).toMatchObject({
                status: '201',
                description: 'Report created',
                produces: ['text/csv'],
            });
        });

        it('should give the media types to every handler response at the status', () => {
            const { responses } = own('respondTwice');

            // Both emitters keep the last response of a status, so the
            // media types must not land on the first one only.
            expect(responses.map((r) => [r.status, r.produces])).toEqual([
                ['200', ['application/pdf']],
                ['200', ['application/pdf']],
            ]);
            expect(responses[0]!.produces).not.toBe(responses[1]!.produces);
        });

        it('should apply the controller media types to every method without its own', () => {
            expect(successResponse(xml('xml'))).toMatchObject({ status: '200', produces: ['application/xml'] });
        });

        it('should let the method media types replace the controller ones', () => {
            expect(successResponse(xml('pdf'))).toMatchObject({ status: '200', produces: ['application/pdf'] });
        });

        it('should apply the controller media types to an inherited method', () => {
            expect(successResponse(xml('inherited'))).toMatchObject({
                status: '200',
                schema: report,
                produces: ['application/xml'],
            });
        });

        it('should run the method finalizer for an inherited method', () => {
            // The host names the class that declares the method, not the
            // controller that inherits it.
            expect(finalized).toContain('ReportBase.inherited');
        });

        it('should not attach media types to a never method', () => {
            const { responses } = own('neverReturns');

            expect(responses).toHaveLength(1);
            expect(responses[0]!.schema).toEqual({ typeName: 'never' });
            expect('produces' in responses[0]!).toBe(false);
        });

        it('should de-duplicate the media types, keeping their order', () => {
            expect(successResponse(own('duplicateProduces')).produces).toEqual(['application/pdf', 'application/xml']);
        });

        it('should give each method its own copy of the controller media types', () => {
            const a = successResponse(xml('xml')).produces;
            const b = successResponse(xml('inherited')).produces;

            expect(a).toEqual(['application/xml']);
            expect(b).toEqual(['application/xml']);
            expect(a).not.toBe(b);
        });

        it('should not attach media types to a void method', () => {
            const ownVoid = successResponse(own('voidProduces'));
            const inheritedVoid = successResponse(xml('voided'));

            expect(ownVoid.status).toEqual('204');
            expect('produces' in ownVoid).toBe(false);
            expect(inheritedVoid.status).toEqual('204');
            expect('produces' in inheritedVoid).toBe(false);
        });

        it('should not attach media types under an explicit 204', () => {
            const response = successResponse(own('noContentProduces'));

            expect(response.status).toEqual('204');
            expect('produces' in response).toBe(false);
        });

        it('should leave no produces key on a method without any', () => {
            const response = successResponse(own('plain'));

            expect('produces' in response).toBe(false);
        });

        it('attaches successProduces to a handler response with its own schema on a void method', () => {
            const { responses } = own('voidWithSchema');

            expect(responses).toEqual([{
                name: '200',
                status: '200',
                description: 'Pdf',
                examples: [],
                schema: { typeName: 'string' },
                produces: ['application/pdf'],
            }]);
        });

        it('does not attach successProduces to a schema-less handler response on a void method', () => {
            const { responses } = own('voidSchemaless');

            expect(responses).toHaveLength(1);
            expect(responses[0]!.status).toEqual('200');
            expect(responses[0]!.schema).toEqual({ typeName: 'void' });
            expect('produces' in responses[0]!).toBe(false);
        });

        it('does not attach under an explicit 204 even when the handler response has a schema', () => {
            const { responses } = own('noContentWithSchema');

            expect(responses).toHaveLength(1);
            expect(responses[0]!.status).toEqual('204');
            expect(responses[0]!.schema).toEqual({ typeName: 'string' });
            expect('produces' in responses[0]!).toBe(false);
        });

        it('should keep the method-wide produces untouched', () => {
            expect(own('pdf').produces).toEqual([]);
        });
    });

    describe('no-content statuses and descriptions', () => {
        it('should document no body for Promise<null> under 204 but keep the method type', () => {
            const m = own('nullNoContent');

            expect(m.responses).toEqual([{
                name: '204',
                status: '204',
                description: 'No content',
                examples: [],
                schema: undefined,
            }]);
            expect(m.responses[0]!.schema).toBeUndefined();
            expect('schema' in m.responses[0]!).toBe(false);
            expect(m.type).toEqual({ typeName: 'enum', members: [null] });
        });

        it.each([
            ['reset', '205', 'Reset Content'],
            ['notModified', '304', 'Not Modified'],
        ])('should document no body for %s (%s)', (name, status, description) => {
            const m = own(name);

            expect(m.responses).toHaveLength(1);
            expect(m.responses[0]!.status).toEqual(status);
            expect(m.responses[0]!.description).toEqual(description);
            expect(m.responses[0]!.schema).toBeUndefined();
            expect('schema' in m.responses[0]!).toBe(false);
            expect(m.type).toMatchObject(report);
        });

        it.each([
            ['created', '201', 'Created'],
            ['accepted', '202', 'Accepted'],
            ['unknown', '299', 'Ok'],
            ['teapot', '418', 'I\'m a teapot'],
            ['notExtended', '510', 'Not Extended'],
        ])('should describe %s by its status %s', (name, status, description) => {
            const response = successResponse(own(name));

            expect(response.status).toEqual(status);
            expect(response.description).toEqual(description);
            expect(response.schema).toMatchObject(report);
        });

        it('should keep 200/Ok without a success status', () => {
            const { responses } = own('plain');

            expect(responses).toHaveLength(1);
            expect(responses[0]).toMatchObject({
                status: '200',
                description: 'Ok',
                schema: report,
            });
        });

        it('should keep 204/No content with the void schema for a void method', () => {
            const { responses } = own('voided');

            expect(responses).toEqual([{
                name: '204',
                status: '204',
                description: 'No content',
                examples: [],
                schema: { typeName: 'void' },
            }]);
        });

        it('should not fill a schema into a handler response at an explicit 204', () => {
            const { responses } = own('handlerNoContent');

            expect(responses).toHaveLength(1);
            expect(responses[0]!.status).toEqual('204');
            expect(responses[0]!.description).toEqual('Deleted');
            expect(responses[0]!.schema).toBeUndefined();
        });
    });
});
