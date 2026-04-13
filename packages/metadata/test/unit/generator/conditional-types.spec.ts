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

    describe('generic conditional types (#782)', () => {
        it('should resolve ConditionalGeneric<string> to the true branch', () => {
            const method = getMethod('conditionalGeneric');
            expect(method.type.typeName).toEqual('refAlias');
            const outer = method.type as RefAliasType;
            expect(outer.refName).toEqual('ResolvedConditionalGeneric');
            // Inner is ConditionalGeneric<string> → resolves to { strVal: string }
            expect(outer.type.typeName).toEqual('refAlias');
            const inner = outer.type as RefAliasType;
            expect(inner.type.typeName).toEqual('nestedObjectLiteral');
            const obj = inner.type as NestedObjectLiteralType;
            expect(obj.properties.map((p) => p.name)).toEqual(['strVal']);
        });

        it('should resolve ConditionalGeneric<number> to the false branch', () => {
            const method = getMethod('conditionalGenericFalse');
            expect(method.type.typeName).toEqual('refAlias');
            const outer = method.type as RefAliasType;
            expect(outer.refName).toEqual('ResolvedConditionalGenericFalse');
            expect(outer.type.typeName).toEqual('refAlias');
            const inner = outer.type as RefAliasType;
            expect(inner.type.typeName).toEqual('nestedObjectLiteral');
            const obj = inner.type as NestedObjectLiteralType;
            expect(obj.properties.map((p) => p.name)).toEqual(['otherVal']);
        });
    });

    describe('typeof-globalThis conditional types (#753)', () => {
        it('should resolve typeof-globalThis conditional pattern', () => {
            const method = getMethod('webConditional');
            // With types: ['node'], globalThis has onmessage, so the conditional
            // resolves to the true branch: { resolved: boolean }
            expect(method.type.typeName).toEqual('refAlias');
            const alias = method.type as RefAliasType;
            expect(alias.refName).toEqual('WebStyleConditional');
            expect(alias.type.typeName).toEqual('nestedObjectLiteral');
            const obj = alias.type as NestedObjectLiteralType;
            expect(obj.properties.map((p) => p.name)).toEqual(['resolved']);
        });

        it('should resolve global Headers type from @types/node (#753)', () => {
            const method = getMethod('webHeaders');
            // The global Headers type from @types/node uses a complex
            // declaration chain (interface extends conditional type).
            // The resolver must handle this via the checker fallback.
            expect(method.type.typeName).toBeDefined();
            expect(method.type.typeName).not.toEqual('void');
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
