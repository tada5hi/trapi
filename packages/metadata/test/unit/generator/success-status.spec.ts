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
import type { Metadata, Method } from '@trapi/core';
import { createRegistry, method, readNumber } from '@trapi/core';
import { GeneratorErrorCode, generateMetadata } from '../../../src';

const runView = {
    typeName: 'refObject',
    refName: 'IRunView',
};

describe('success status', () => {
    let metadata: Metadata;

    const findMethod = (name: string): Method => metadata.controllers[0]!.methods.find((m) => m.name === name)!;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/success-status'),
                pattern: '**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
            registry: createRegistry({
                methods: [
                    method({
                        match: { name: 'Status', on: 'method' },
                        apply: (ctx, draft) => {
                            const status = readNumber(ctx.argument(0));

                            if (status !== undefined) {
                                draft.successStatus = String(status);
                            }
                        },
                    }),
                ],
            }),
        });
    });

    it('should document the return type under 200 without an opt-in', () => {
        const { responses } = findMethod('list');

        expect(responses.map((r) => r.status)).toEqual(['200']);
    });

    it('should document the return type under the success status instead of 200', () => {
        const { responses } = findMethod('start');

        expect(responses).toHaveLength(1);
        expect(responses[0]).toMatchObject({
            status: '202',
            name: '202',
            schema: runView,
        });
    });

    it('should fill the schema of a handler response declared at the success status', () => {
        const { responses } = findMethod('create');

        expect(responses).toHaveLength(1);
        expect(responses[0]).toMatchObject({
            status: '201',
            description: 'Created',
            schema: runView,
        });
    });

    it('should attach default-response examples to the success status', () => {
        const { responses } = findMethod('withExample');

        expect(responses).toHaveLength(1);
        expect(responses[0]!.status).toEqual('202');
        expect(responses[0]!.examples).toEqual([{ value: { id: '1' } }]);
    });

    it('should keep other handler responses beside the success status', () => {
        const { responses } = findMethod('withError');

        expect(responses.map((r) => r.status)).toEqual(['400', '202']);
        expect(responses[1]).toMatchObject({ status: '202', schema: runView });
    });

    it('should use the success status for a void method instead of 204', () => {
        const { responses } = findMethod('remove');

        expect(responses).toHaveLength(1);
        expect(responses[0]).toMatchObject({ status: '202', schema: { typeName: 'void' } });
    });

    it('should keep a handler 200 beside a different success status', () => {
        const { responses } = findMethod('withLegacy');

        expect(responses.map((r) => r.status)).toEqual(['200', '202']);
        expect(responses[0]!.schema).toBeUndefined();
        expect(responses[1]).toMatchObject({ status: '202', schema: runView });
    });

    it('should not overwrite the schema of a handler response at the success status', () => {
        const { responses } = findMethod('withOwnSchema');

        expect(responses).toHaveLength(1);
        expect(responses[0]).toMatchObject({ status: '201', schema: { typeName: 'string' } });
    });

    it('should not merge default examples into a handler response that has its own', () => {
        const { responses } = findMethod('withOwnExamples');

        expect(responses).toHaveLength(1);
        expect(responses[0]!.examples).toEqual([{ value: { id: '2' } }]);
    });

    it('should let the last handler that sets the success status win', () => {
        const { responses } = findMethod('twice');

        expect(responses.map((r) => r.status)).toEqual(['202']);
    });
});

describe('success status validation', () => {
    const generate = (successStatus: string) => generateMetadata({
        entryPoint: [{
            cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/inline-registry'),
            pattern: '**/*.ts',
        }],
        cache: false,
        registry: createRegistry({
            controllers: [{
                match: { name: 'Controller', on: 'class' },
                apply: (_ctx, draft) => {
                    draft.paths = ['/widgets'];
                },
            }],
            methods: [{
                match: { name: 'Get', on: 'method' },
                apply: (_ctx, draft) => {
                    draft.verb = 'get';
                    draft.successStatus = successStatus;
                },
            }],
        }),
    });

    it.each(['', 'abc', 'undefined', '600', '20', '2XXX'])('should reject the success status %j', async (value) => {
        await expect(generate(value)).rejects.toMatchObject({ code: GeneratorErrorCode.SUCCESS_STATUS_INVALID });
    });

    it.each(['201', '202', '2XX'])('should accept the success status %j', async (value) => {
        const metadata = await generate(value);

        expect(metadata.controllers[0]!.methods[0]!.responses.map((r) => r.status)).toEqual([value]);
    });
});
