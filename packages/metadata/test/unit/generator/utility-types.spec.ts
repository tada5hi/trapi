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
import process from 'node:process';
import type {
    Metadata,
    NestedObjectLiteralType,
    RefAliasType,
    RefObjectType,
    UnionType,
} from '../../../src';
import { generateMetadata } from '../../../src';

describe('utility type metadata extraction', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.join(process.cwd(), '..', 'decorators'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });
    });

    function getProperties(type: any): { name: string }[] {
        if (type.typeName === 'refObject') {
            return (type as RefObjectType).properties;
        }
        if (type.typeName === 'refAlias') {
            return getProperties((type as RefAliasType).type);
        }
        if (type.typeName === 'nestedObjectLiteral') {
            return (type as NestedObjectLiteralType).properties;
        }
        return [];
    }

    function resolveRefType(type: any): any {
        if (type.typeName === 'refAlias' || type.typeName === 'refObject' || type.typeName === 'refEnum') {
            const resolved = metadata.referenceTypes[type.refName];
            return resolved || type;
        }
        return type;
    }

    describe('existing utility types', () => {
        it('should resolve Pick<Foo, "bar">', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'pick')!;
            expect(method).toBeDefined();

            const resolved = resolveRefType(method.type);
            const propNames = getProperties(resolved).map((p) => p.name);
            expect(propNames).toContain('bar');
            expect(propNames).not.toContain('baz');
        });

        it('should resolve Omit<Foo, "bar">', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'omit')!;
            expect(method).toBeDefined();

            const resolved = resolveRefType(method.type);
            const propNames = getProperties(resolved).map((p) => p.name);
            expect(propNames).toContain('baz');
            expect(propNames).not.toContain('bar');
        });

        it('should resolve Partial<Foo> with all properties optional', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'partial')!;
            expect(method).toBeDefined();
        });
    });

    describe('Extract and Exclude', () => {
        function findUnionMembers(type: any): any[] {
            // Walk through refAlias wrappers to find the union
            if (type.typeName === 'refAlias') {
                return findUnionMembers((type as RefAliasType).type);
            }
            if (type.typeName === 'union') {
                return (type as UnionType).members;
            }
            return [];
        }

        it('should resolve Extract<Status, "active" | "inactive"> to two members', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'extract')!;
            expect(method).toBeDefined();

            // Extract<Status, 'active' | 'inactive'> = 'active' | 'inactive'
            const resolved = resolveRefType(method.type);
            const members = findUnionMembers(resolved);
            expect(members.length).toEqual(2);
        });

        it('should resolve Exclude<Status, "deleted"> to two members', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'exclude')!;
            expect(method).toBeDefined();

            // Exclude<Status, 'deleted'> = 'active' | 'inactive'
            const resolved = resolveRefType(method.type);
            const members = findUnionMembers(resolved);
            expect(members.length).toEqual(2);
        });
    });

    describe('ReturnType', () => {
        it('should resolve ReturnType<typeof createFoo> to Foo shape', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'returnType')!;
            expect(method).toBeDefined();

            // ReturnType<typeof createFoo> = Foo = { bar: string, baz: string }
            const { type } = method;
            if (type.typeName === 'refAlias') {
                const alias = type as RefAliasType;
                if (alias.type.typeName === 'nestedObjectLiteral') {
                    const obj = alias.type as NestedObjectLiteralType;
                    const propNames = obj.properties.map((p) => p.name);
                    expect(propNames).toContain('bar');
                    expect(propNames).toContain('baz');
                }
            } else if (type.typeName === 'refObject') {
                const obj = type as RefObjectType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('bar');
                expect(propNames).toContain('baz');
            } else if (type.typeName === 'nestedObjectLiteral') {
                const obj = type as NestedObjectLiteralType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('bar');
                expect(propNames).toContain('baz');
            }
        });
    });

    describe('Awaited', () => {
        it('should resolve Awaited<Promise<Foo>> to Foo shape', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'awaited')!;
            expect(method).toBeDefined();

            // Awaited<Promise<Foo>> = Foo
            const { type } = method;
            if (type.typeName === 'refObject') {
                const obj = type as RefObjectType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('bar');
                expect(propNames).toContain('baz');
            } else if (type.typeName === 'refAlias') {
                const alias = type as RefAliasType;
                if (alias.type.typeName === 'nestedObjectLiteral') {
                    const obj = alias.type as NestedObjectLiteralType;
                    const propNames = obj.properties.map((p) => p.name);
                    expect(propNames).toContain('bar');
                    expect(propNames).toContain('baz');
                }
            } else if (type.typeName === 'nestedObjectLiteral') {
                const obj = type as NestedObjectLiteralType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('bar');
                expect(propNames).toContain('baz');
            }
        });

        it('should resolve Awaited<Promise<Promise<Foo>>> to Foo shape (nested)', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'awaitedNested')!;
            expect(method).toBeDefined();

            // Awaited<Promise<Promise<Foo>>> = Foo
            const { type } = method;
            if (type.typeName === 'refObject') {
                const obj = type as RefObjectType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('bar');
                expect(propNames).toContain('baz');
            } else if (type.typeName === 'refAlias') {
                const alias = type as RefAliasType;
                if (alias.type.typeName === 'nestedObjectLiteral') {
                    const obj = alias.type as NestedObjectLiteralType;
                    const propNames = obj.properties.map((p) => p.name);
                    expect(propNames).toContain('bar');
                    expect(propNames).toContain('baz');
                }
            } else if (type.typeName === 'nestedObjectLiteral') {
                const obj = type as NestedObjectLiteralType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('bar');
                expect(propNames).toContain('baz');
            }
        });
    });

    describe('InstanceType', () => {
        it('should resolve InstanceType<typeof FooFactory> to FooFactory shape', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'UtilityTypes',
            )!;
            const method = controller.methods.find((m) => m.name === 'instanceType')!;
            expect(method).toBeDefined();

            // InstanceType<typeof FooFactory> = FooFactory = { name: string, count: number }
            const { type } = method;
            if (type.typeName === 'refObject') {
                const obj = type as RefObjectType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('name');
                expect(propNames).toContain('count');
            } else if (type.typeName === 'nestedObjectLiteral') {
                const obj = type as NestedObjectLiteralType;
                const propNames = obj.properties.map((p) => p.name);
                expect(propNames).toContain('name');
                expect(propNames).toContain('count');
            }
        });
    });
});
