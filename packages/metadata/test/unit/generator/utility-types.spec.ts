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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
    Metadata,
    NestedObjectLiteralType,
    RefAliasType,
    RefObjectType,
    TupleType,
    UnionType,
} from '../../../src';
import { generateMetadata } from '../../../src';

describe('utility type metadata extraction', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
    });

    function getMethod(methodName: string) {
        const controller = metadata.controllers.find(
            (c) => c.name === 'UtilityTypes',
        )!;
        const method = controller.methods.find((m) => m.name === methodName)!;
        expect(method).toBeDefined();
        return method;
    }

    function expectRefAlias(method: { type: any }, refName: string): RefAliasType {
        expect(method.type.typeName).toEqual('refAlias');
        const alias = method.type as RefAliasType;
        expect(alias.refName).toEqual(refName);
        return alias;
    }

    function expectNestedObjectProps(type: any, expectedProps: string[]) {
        expect(type.typeName).toEqual('nestedObjectLiteral');
        const obj = type as NestedObjectLiteralType;
        const propNames = obj.properties.map((p) => p.name).sort();
        expect(propNames).toEqual(expectedProps.sort());
    }

    describe('existing utility types', () => {
        it('should resolve Pick<Foo, "bar"> to only bar property', () => {
            const method = getMethod('pick');
            const alias = expectRefAlias(method, 'FooBar');
            expectNestedObjectProps(alias.type, ['bar']);
        });

        it('should resolve Omit<Foo, "bar"> to only baz property', () => {
            const method = getMethod('omit');
            const alias = expectRefAlias(method, 'FooBaz');
            expectNestedObjectProps(alias.type, ['baz']);
        });

        it('should resolve Partial<Foo> with all properties optional', () => {
            const method = getMethod('partial');
            const alias = expectRefAlias(method, 'FooPartial');
            expect(alias.type.typeName).toEqual('nestedObjectLiteral');
            const obj = alias.type as NestedObjectLiteralType;
            const propNames = obj.properties.map((p) => p.name).sort();
            expect(propNames).toEqual(['bar', 'baz']);
            for (const prop of obj.properties) {
                expect(prop.required).toEqual(false);
            }
        });
    });

    describe('Extract and Exclude', () => {
        it('should resolve Extract<Status, "active" | "inactive"> to two enum members', () => {
            const method = getMethod('extract');
            const alias = expectRefAlias(method, 'ActiveStatus');
            expect(alias.type.typeName).toEqual('union');
            const union = alias.type as UnionType;
            expect(union.members).toHaveLength(2);
        });

        it('should resolve Exclude<Status, "deleted"> to two enum members', () => {
            const method = getMethod('exclude');
            const alias = expectRefAlias(method, 'NonDeletedStatus');
            expect(alias.type.typeName).toEqual('union');
            const union = alias.type as UnionType;
            expect(union.members).toHaveLength(2);
        });
    });

    describe('ReturnType', () => {
        it('should resolve ReturnType<typeof createFoo> to Foo shape', () => {
            const method = getMethod('returnType');
            const alias = expectRefAlias(method, 'FooReturn');
            expectNestedObjectProps(alias.type, ['bar', 'baz']);
        });
    });

    describe('Awaited', () => {
        it('should resolve Awaited<Promise<Foo>> to Foo shape', () => {
            const method = getMethod('awaited');
            const alias = expectRefAlias(method, 'AwaitedFoo');
            expectNestedObjectProps(alias.type, ['bar', 'baz']);
        });

        it('should resolve Awaited<Promise<Promise<Foo>>> to Foo shape (nested)', () => {
            const method = getMethod('awaitedNested');
            const alias = expectRefAlias(method, 'AwaitedNested');
            expectNestedObjectProps(alias.type, ['bar', 'baz']);
        });
    });

    describe('Parameters', () => {
        it('should resolve Parameters<typeof createFoo> (no-arg function) to empty tuple', () => {
            const method = getMethod('parameters');
            const alias = expectRefAlias(method, 'FooParams');
            expect(alias.type.typeName).toEqual('tuple');
            const tuple = alias.type as TupleType;
            expect(tuple.elements).toHaveLength(0);
        });
    });

    describe('ConstructorParameters', () => {
        it('should resolve ConstructorParameters<typeof FooFactory> to named tuple [name: string, count: number]', () => {
            const method = getMethod('constructorParameters');
            const alias = expectRefAlias(method, 'FooCtorParams');
            expect(alias.type.typeName).toEqual('tuple');
            const tuple = alias.type as TupleType;
            expect(tuple.elements).toHaveLength(2);
            expect(tuple.elements[0].name).toEqual('name');
            expect(tuple.elements[0].type.typeName).toEqual('string');
            expect(tuple.elements[1].name).toEqual('count');
            expect(tuple.elements[1].type.typeName).toEqual('double');
        });
    });

    describe('InstanceType', () => {
        it('should resolve InstanceType<typeof FooFactory> to FooFactory shape', () => {
            const method = getMethod('instanceType');
            const alias = expectRefAlias(method, 'FooInstance');
            expect(alias.type.typeName).toEqual('refObject');
            const obj = alias.type as RefObjectType;
            expect(obj.refName).toEqual('FooFactory');
            const propNames = obj.properties.map((p) => p.name).sort();
            expect(propNames).toEqual(['count', 'name']);
            const nameType = obj.properties.find((p) => p.name === 'name')!;
            expect(nameType.type.typeName).toEqual('string');
            const countType = obj.properties.find((p) => p.name === 'count')!;
            expect(countType.type.typeName).toEqual('double');
        });
    });
});
