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
    ArrayType,
    IntersectionType,
    Metadata,
    NestedObjectLiteralType,
    RefAliasType,
    RefObjectType, 
    UnionType, 
} from '@trapi/core';
import { generateMetadata } from '../../../src';

describe('complex type metadata extraction', () => {
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

    describe('circular references', () => {
        it('should resolve self-referencing TreeNode type', () => {
            const treeNode = metadata.referenceTypes.TreeNode as RefObjectType;
            expect(treeNode).toBeDefined();
            expect(treeNode.typeName).toEqual('refObject');
            expect(treeNode.properties.length).toEqual(2);

            const valueProp = treeNode.properties.find((p) => p.name === 'value');
            expect(valueProp!.type.typeName).toEqual('string');

            const childrenProp = treeNode.properties.find((p) => p.name === 'children');
            expect(childrenProp!.type.typeName).toEqual('array');
            // The element type should reference TreeNode itself
            const { elementType } = (childrenProp!.type as ArrayType);
            expect(elementType.typeName).toEqual('refObject');
            expect((elementType as RefObjectType).refName).toEqual('TreeNode');
        });

        it('should resolve mutually recursive TypeA and TypeB', () => {
            const typeA = metadata.referenceTypes.TypeA as RefObjectType;
            expect(typeA).toBeDefined();
            expect(typeA.typeName).toEqual('refObject');

            const nameProp = typeA.properties.find((p) => p.name === 'name');
            expect(nameProp!.type.typeName).toEqual('string');

            const bProp = typeA.properties.find((p) => p.name === 'b');
            expect(bProp).toBeDefined();
            expect(bProp!.required).toBe(false);
            // Should reference TypeB
            expect(bProp!.type.typeName).toEqual('refObject');
            expect((bProp!.type as RefObjectType).refName).toEqual('TypeB');
        });

        it('should resolve TypeB referencing TypeA', () => {
            const typeB = metadata.referenceTypes.TypeB as RefObjectType;
            expect(typeB).toBeDefined();

            const aProp = typeB.properties.find((p) => p.name === 'a');
            expect(aProp).toBeDefined();
            expect(aProp!.type.typeName).toEqual('refObject');
            expect((aProp!.type as RefObjectType).refName).toEqual('TypeA');
        });
    });

    describe('generic types', () => {
        it('should resolve GenericWrapper with Person', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'ComplexTypesController',
            )!;
            const method = controller.methods.find(
                (m) => m.name === 'getGeneric',
            )!;
            expect(method).toBeDefined();
            // Return type should be a reference to a resolved generic
            expect(method.type.typeName).toEqual('refObject');

            // The resolved type should have 'data' and 'meta' properties
            const { refName } = method.type as RefObjectType;
            const resolved = metadata.referenceTypes[refName] as RefObjectType;
            expect(resolved).toBeDefined();
            const propNames = resolved.properties.map((p) => p.name);
            expect(propNames).toContain('data');
            expect(propNames).toContain('meta');
        });

        it('should resolve nested generic GenericWrapper<GenericWrapper<string>>', () => {
            const nestedGeneric = metadata.referenceTypes.NestedGeneric;
            expect(nestedGeneric).toBeDefined();
            expect(nestedGeneric.typeName).toEqual('refAlias');
            const alias = nestedGeneric as RefAliasType;
            expect(alias.type.typeName).toEqual('refObject');
            const obj = alias.type as RefObjectType;
            const propNames = obj.properties.map((p) => p.name);
            expect(propNames).toContain('data');
            expect(propNames).toContain('meta');
        });
    });

    describe('intersection types', () => {
        it('should resolve TimestampedPerson as intersection', () => {
            const tp = metadata.referenceTypes.TimestampedPerson;
            expect(tp).toBeDefined();
            expect(tp.typeName).toEqual('refAlias');
            const alias = tp as RefAliasType;
            expect(alias.type.typeName).toEqual('intersection');
            const intersection = alias.type as IntersectionType;
            expect(intersection.members).toHaveLength(2);
            // First member: Person, second: Timestamped
            expect(intersection.members[0].typeName).toEqual('refObject');
            expect((intersection.members[0] as RefObjectType).refName).toEqual('Person');
            expect(intersection.members[1].typeName).toEqual('refObject');
            expect((intersection.members[1] as RefObjectType).refName).toEqual('Timestamped');
        });
    });

    describe('nullable types', () => {
        it('should resolve ModelWithNullable', () => {
            const model = metadata.referenceTypes.ModelWithNullable as RefObjectType;
            expect(model).toBeDefined();
            expect(model.typeName).toEqual('refObject');

            const nicknameProp = model.properties.find((p) => p.name === 'nickname');
            expect(nicknameProp).toBeDefined();
            // string | null should be a union type
            expect(nicknameProp!.type.typeName).toEqual('union');
            const union = nicknameProp!.type as UnionType;
            const typeNames = union.members.map((m) => m.typeName);
            expect(typeNames).toContain('string');
            expect(typeNames).toContain('enum'); // null is represented as enum
        });

        it('should resolve NullableString alias', () => {
            const alias = metadata.referenceTypes.NullableString;
            expect(alias).toBeDefined();
            expect(alias.typeName).toEqual('refAlias');
            const refAlias = alias as RefAliasType;
            // string | null
            expect(refAlias.type.typeName).toEqual('union');
        });

        it('should mark optional properties correctly', () => {
            const model = metadata.referenceTypes.ModelWithNullable as RefObjectType;
            const ageProp = model.properties.find((p) => p.name === 'age');
            expect(ageProp).toBeDefined();
            expect(ageProp!.required).toBe(false);
        });
    });

    describe('utility types', () => {
        it('should resolve PartialPerson with all properties optional', () => {
            const pp = metadata.referenceTypes.PartialPerson;
            expect(pp).toBeDefined();
            expect(pp.typeName).toEqual('refAlias');
            const alias = pp as RefAliasType;
            expect(alias.type.typeName).toEqual('nestedObjectLiteral');
            const obj = alias.type as NestedObjectLiteralType;
            const propNames = obj.properties.map((p) => p.name).sort();
            expect(propNames).toEqual(['address', 'name']);
            for (const prop of obj.properties) {
                expect(prop.required).toBe(false);
            }
        });

        it('should resolve RecordOfStrings as nestedObjectLiteral with additionalProperties', () => {
            const record = metadata.referenceTypes.RecordOfStrings;
            expect(record).toBeDefined();
            expect(record.typeName).toEqual('refAlias');
            const alias = record as RefAliasType;
            expect(alias.type.typeName).toEqual('nestedObjectLiteral');
            const obj = alias.type as NestedObjectLiteralType;
            expect(obj.properties).toHaveLength(0);
            expect(obj.additionalProperties).toBeDefined();
            expect(obj.additionalProperties!.typeName).toEqual('string');
        });
    });

    describe('controller method return types', () => {
        it('should have ComplexTypesController with all methods', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'ComplexTypesController',
            )!;
            expect(controller).toBeDefined();
            expect(controller.paths).toEqual(['complex']);

            const methodNames = controller.methods.map((m) => m.name);
            expect(methodNames).toContain('getTree');
            expect(methodNames).toContain('getMutualRef');
            expect(methodNames).toContain('getPartial');
            expect(methodNames).toContain('getRecord');
            expect(methodNames).toContain('getGeneric');
            expect(methodNames).toContain('getNestedGeneric');
            expect(methodNames).toContain('getIntersection');
            expect(methodNames).toContain('getNullable');
            expect(methodNames).toContain('getNullableAlias');
            expect(methodNames).toContain('getDeprecated');
        });
    });
});
