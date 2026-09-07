/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    stringType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV3Spec } from '../../helpers/schema-validator';

/**
 * A method handler can push onto `MethodDraft.parameters`, producing a
 * `Parameter` that no `ParameterGenerator` built and that no TypeScript
 * argument declares. The emitters have to treat it like any other — this is
 * the only end-to-end coverage of that path, since @trapi/metadata cannot
 * depend on @trapi/swagger to assert it itself.
 */
describe('handler-contributed parameters', () => {
    const metadata = () => createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [createMethod({
                name: 'getMany',
                method: 'get',
                path: '',
                type: stringType(),
                parameters: [createParameter({
                    name: 'filter',
                    in: 'queryProp',
                    type: stringType(),
                    required: false,
                    description: 'runtime-registered filter vocabulary',
                })],
            })],
        }),
    ]);

    it('should emit a contributed queryProp parameter in v2', async () => {
        const spec = await generateSwagger({ version: Version.V2, metadata: metadata() });

        const { parameters } = spec.paths['/users']!.get!;
        expect(parameters).toHaveLength(1);
        expect(parameters![0]).toEqual({
            description: 'runtime-registered filter vocabulary',
            in: 'query',
            name: 'filter',
            required: false,
            type: 'string',
        });
        expect(validateV2Spec(spec).errors).toEqual([]);
    });

    it('should emit a contributed queryProp parameter in v3', async () => {
        const spec = await generateSwagger({ version: Version.V3, metadata: metadata() });

        const { parameters } = spec.paths['/users']!.get!;
        expect(parameters).toHaveLength(1);
        expect(parameters![0]).toEqual({
            allowEmptyValue: false,
            deprecated: false,
            description: 'runtime-registered filter vocabulary',
            examples: {},
            in: 'query',
            name: 'filter',
            required: false,
            schema: { type: 'string' },
        });
        expect(validateV3Spec(spec).errors).toEqual([]);
    });
});
