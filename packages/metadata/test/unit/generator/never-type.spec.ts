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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RefAliasType, UnionType } from '@trapi/core';
import type { Metadata } from '../../../src';
import { generateMetadata } from '../../../src';

describe('never type metadata extraction (#778)', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/never-type.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
    });

    function getMethod(methodName: string) {
        const controller = metadata.controllers.find(
            (c) => c.name === 'NeverTypeController',
        )!;
        const method = controller.methods.find((m) => m.name === methodName)!;
        expect(method).toBeDefined();
        return method;
    }

    it('should resolve standalone never return type', () => {
        const method = getMethod('alwaysThrows');
        expect(method.type.typeName).toEqual('refAlias');
        const alias = method.type as RefAliasType;
        expect(alias.refName).toEqual('AlwaysThrows');
        expect(alias.type.typeName).toEqual('never');
    });

    it('should resolve conditional type with never branch', () => {
        const method = getMethod('neverBranch');
        expect(method.type.typeName).toEqual('refAlias');
        const alias = method.type as RefAliasType;
        expect(alias.refName).toEqual('NeverBranch');
        expect(alias.type.typeName).toEqual('never');
    });

    it('should preserve never in union members (metadata fidelity)', () => {
        const method = getMethod('cleanUnion');
        // The metadata layer faithfully preserves the union AST structure.
        // `string | never` is stored as a union with both members.
        // Simplification (stripping never) happens in the swagger layer.
        expect(method.type.typeName).toEqual('refAlias');
        const alias = method.type as RefAliasType;
        expect(alias.refName).toEqual('CleanUnion');
        expect(alias.type.typeName).toEqual('union');
        const union = alias.type as UnionType;
        expect(union.members).toHaveLength(2);
        expect(union.members.map((m) => m.typeName).sort()).toEqual(['never', 'string']);
    });
});
