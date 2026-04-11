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
import process from 'node:process';
import type {
    Metadata,
    NestedObjectLiteralType,
    RefAliasType,
} from '../../../src';
import { generateMetadata } from '../../../src';

describe('conditional type and generic context metadata extraction', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.join(process.cwd(), '..', 'decorators'),
                pattern: './test/data/controllers/conditional-types.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });
    });

    function getMethod(methodName: string) {
        const controller = metadata.controllers.find(
            (c) => c.name === 'ConditionalTypesController',
        )!;
        const method = controller.methods.find((m) => m.name === methodName)!;
        expect(method).toBeDefined();
        return method;
    }

    describe('conditional types (#753)', () => {
        it('should resolve conditional type to the true branch', () => {
            const method = getMethod('conditional');
            expect(method.type.typeName).toEqual('refAlias');
            const alias = method.type as RefAliasType;
            expect(alias.refName).toEqual('ConditionalFoo');
            expect(alias.type.typeName).toEqual('nestedObjectLiteral');
            const obj = alias.type as NestedObjectLiteralType;
            const propNames = obj.properties.map((p) => p.name).sort();
            expect(propNames).toEqual(['bar', 'baz']);
        });
    });

    describe('wrapped generic utility types (#777)', () => {
        it('should resolve Box<Promise<Foo>> (wrapped Awaited) to Foo shape', () => {
            const method = getMethod('wrappedAwaited');
            expect(method.type.typeName).toEqual('refAlias');
            const outer = method.type as RefAliasType;
            expect(outer.refName).toEqual('UnboxedFoo');
            // Inner is BoxPromiseFoo → nestedObjectLiteral
            expect(outer.type.typeName).toEqual('refAlias');
            const inner = outer.type as RefAliasType;
            expect(inner.type.typeName).toEqual('nestedObjectLiteral');
            const obj = inner.type as NestedObjectLiteralType;
            const propNames = obj.properties.map((p) => p.name).sort();
            expect(propNames).toEqual(['bar', 'baz']);
        });

        it('should resolve MyPick<Foo, "bar"> (wrapped Pick) to only bar property', () => {
            const method = getMethod('wrappedPick');
            expect(method.type.typeName).toEqual('refAlias');
            const outer = method.type as RefAliasType;
            expect(outer.refName).toEqual('PickedFoo');
            expect(outer.type.typeName).toEqual('refAlias');
            const inner = outer.type as RefAliasType;
            expect(inner.type.typeName).toEqual('nestedObjectLiteral');
            const obj = inner.type as NestedObjectLiteralType;
            expect(obj.properties).toHaveLength(1);
            expect(obj.properties[0].name).toEqual('bar');
        });
    });
});
