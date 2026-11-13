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
import { generateMetadata } from '../../../src';

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
                            draft.successStatus = String(readNumber(ctx.argument(0)));
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
});
