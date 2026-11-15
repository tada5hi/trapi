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
import { CoreErrorCode } from '@trapi/core';
import { generateMetadata } from '../../../src';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/description-status');

const generate = (preset: string, directory: string) => generateMetadata({
    entryPoint: [{
        cwd: path.join(fixtures, directory),
        pattern: '**/*.ts',
    }],
    cache: false,
    preset,
});

describe.each([
    ['@trapi/preset-decorators-express', 'express'],
    ['@trapi/preset-typescript-rest', 'typescript-rest'],
])('@Description status argument (%s)', (preset, directory) => {
    let metadata: Metadata;

    const findMethod = (name: string): Method => metadata.controllers[0]!.methods.find((m) => m.name === name)!;

    beforeAll(async () => {
        metadata = await generate(preset, `${directory}/resolved`);
    });

    it.each([
        ['local', '404', 'Not found'],
        ['imported', '409', 'Conflict'],
        ['enumMember', '201', 'Created'],
        ['asConst', '202', 'Accepted'],
        ['literal', '400', 'Bad request'],
    ])('documents a status given as a resolved constant (%s)', (name, status, description) => {
        const { responses } = findMethod(name);

        expect(responses.map((r) => r.status)).toEqual([status, '200']);
        expect(responses[0]).toMatchObject({
            name: status,
            status,
            description,
            examples: [],
        });
    });

    it('defaults to 200 when the status is absent', () => {
        const { responses } = findMethod('absent');

        expect(responses).toHaveLength(1);
        expect(responses[0]).toMatchObject({
            name: '200',
            status: '200',
            description: 'Response',
        });
    });

    it('throws DECORATOR_ARGUMENT_INVALID for an unresolvable status', async () => {
        await expect(generate(preset, `${directory}/unresolvable`)).rejects.toMatchObject({
            code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID,
            message: expect.stringContaining(
                'Argument 0 of \'@Description\' on \'UnresolvableStatusController.computed\' must be a status code',
            ),
        });
    });
});
