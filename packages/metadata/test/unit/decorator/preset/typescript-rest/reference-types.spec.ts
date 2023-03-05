/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import jsonata from 'jsonata';
import { MetadataGenerator } from '../../../../../src';
import type {
    ArrayType, Metadata,
    NestedObjectLiteralType,
    RefAliasType,
    RefEnumType,
    RefObjectType,
    ResolverProperty,
    UnionType,
} from '../../../../../src';

describe('check referenceTypes', () => {
    let metadata : Metadata;

    beforeAll(async () => {
        const generator = new MetadataGenerator({
            entryPoint: ['./test/data/preset/typescript-rest/api.ts'],
            cache: false,
            preset: '@trapi/preset-typescript-rest',
        }, {});

        metadata = await generator.generate();
    });

    it('referenceTypes should be defined', () => {
        expect(metadata.referenceTypes).toHaveProperty('MyTypeWithUnion');
        expect(metadata.referenceTypes).toHaveProperty('Address');
        expect(metadata.referenceTypes).toHaveProperty('Person');
        expect(metadata.referenceTypes).toHaveProperty('TestEnum');
        expect(metadata.referenceTypes).toHaveProperty('TestNumericEnum');
        expect(metadata.referenceTypes).toHaveProperty('TestMixedEnum');
        expect(metadata.referenceTypes).toHaveProperty('TestInterface');
        // todo: tod object keys seem not to work :(
        // expect(metadata.referenceTypes).toHaveProperty('Return\.NewResourcePerson');
        // expect(metadata.referenceTypes).toHaveProperty('Return\.DownloadBinaryData');
        expect(metadata.referenceTypes).toHaveProperty('MyDataType2');
        expect(metadata.referenceTypes).toHaveProperty('UUID');
        expect(metadata.referenceTypes).toHaveProperty('Something');
        expect(metadata.referenceTypes).toHaveProperty('SimpleHelloType');
        expect(metadata.referenceTypes).toHaveProperty('PrimitiveClassModel');
        expect(metadata.referenceTypes).toHaveProperty('PrimitiveInterfaceModel');
        expect(metadata.referenceTypes).toHaveProperty('ResponseBodystringarray');
        expect(metadata.referenceTypes).toHaveProperty('NamedEntity');
    });

    it('referenceType MyTypeWithUnion', async () => {
        const expression = jsonata('MyTypeWithUnion.properties[0]');
        const value: ResolverProperty = await expression.evaluate(metadata.referenceTypes);

        expect(value.name).toEqual('property');
        expect(value.required).toBeTruthy();
        expect(value.type).toBeDefined();
        expect(value.type.typeName).toEqual('union');
        expect((value.type as UnionType).members).toBeDefined();
        expect((value.type as UnionType).members.length).toEqual(2);
        expect((value.type as UnionType).members[0].typeName).toEqual('enum');
        expect((value.type as UnionType).members[1].typeName).toEqual('enum');
    });

    it('referenceType Address', async () => {
        const expression = jsonata('Address.properties[0]');
        const value: ResolverProperty = await expression.evaluate(metadata.referenceTypes);

        expect(value.name).toEqual('street');
        expect(value.required).toBeTruthy();
        expect(value.type).toBeDefined();
        expect(value.type.typeName).toEqual('string');
    });

    it('referenceType Person', async () => {
        let expression = jsonata('Person.properties[0]');
        let value: ResolverProperty = await expression.evaluate(metadata.referenceTypes);

        expect(value.name).toEqual('name');
        expect(value.required).toBeTruthy();
        expect(value.type).toBeDefined();
        expect(value.type.typeName).toEqual('string');

        expression = jsonata('Person.properties[1]');
        value = await expression.evaluate(metadata.referenceTypes);

        expect(value.name).toEqual('address');
        expect(value.required).toBeFalsy();
        expect(value.type).toBeDefined();
        expect(value.type.typeName).toEqual('refObject');
    });

    it('referenceType TestEnum', async () => {
        const expression = jsonata('TestEnum');
        const value: RefEnumType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refEnum');
        expect(value.members).toEqual(['option1', 'option2']);
        expect(value.memberNames).toEqual(['Option1', 'Option2']);
        expect(value.deprecated).toBeFalsy();
    });

    it('referenceType TestNumericEnum', async () => {
        const expression = jsonata('TestNumericEnum');
        const value: RefEnumType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refEnum');
        expect(value.members).toEqual([0, 1]);
        expect(value.memberNames).toEqual(['Option1', 'Option2']);
        expect(value.deprecated).toBeFalsy();
    });

    it('referenceType TestMixedEnum', async () => {
        const expression = jsonata('TestMixedEnum');
        const value: RefEnumType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refEnum');
        expect(value.members).toEqual([0, 'option2']);
        expect(value.memberNames).toEqual(['Option1', 'Option2']);
        expect(value.deprecated).toBeFalsy();
    });

    it('referenceType TestInterface', async () => {
        const expression = jsonata('TestInterface');
        const value: RefObjectType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refObject');

        expect(value.properties).toBeDefined();
        expect(value.properties.length).toEqual(2);

        expect(value.properties[0].name).toEqual('a');
        expect(value.properties[0].type.typeName).toEqual('string');

        expect(value.properties[1].name).toEqual('b');
        expect(value.properties[1].type.typeName).toEqual('double');
    });

    it('referenceType MyDataType2', async () => {
        const expression = jsonata('MyDataType2');
        const value: RefObjectType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refObject');

        expect(value.properties).toBeDefined();
        expect(value.properties.length).toEqual(2);

        expect(value.properties[0].name).toEqual('prop');
        expect(value.properties[0].type.typeName).toEqual('string');

        expect(value.properties[1].name).toEqual('property1');
        expect(value.properties[1].type.typeName).toEqual('string');
    });

    it('referenceType UUID', async () => {
        const expression = jsonata('UUID');
        const value: RefAliasType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refAlias');
        expect(value.refName).toEqual('UUID');
        expect(value.type.typeName).toEqual('string');
    });

    it('referenceType Something', async () => {
        const expression = jsonata('Something');
        const value: RefObjectType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refObject');

        expect(value.properties).toBeDefined();
        expect(value.properties.length).toEqual(3);

        expect(value.properties[0].name).toEqual('id');
        expect(value.properties[0].type.typeName).toEqual('refAlias');
        expect((value.properties[0].type as RefAliasType).refName).toEqual('UUID');

        expect(value.properties[1].name).toEqual('someone');
        expect(value.properties[1].type.typeName).toEqual('string');

        expect(value.properties[2].name).toEqual('kind');
        expect(value.properties[2].type.typeName).toEqual('string');
    });

    it('referenceType SimpleHelloType', async () => {
        const expression = jsonata('SimpleHelloType');
        const value: RefAliasType = await expression.evaluate(metadata.referenceTypes);

        expect(value.typeName).toEqual('refAlias');

        expect(value.type.typeName).toEqual('nestedObjectLiteral');

        const typeValue = value.type as NestedObjectLiteralType;

        expect(typeValue.properties).toBeDefined();
        expect(typeValue.properties.length).toEqual(4);

        expect(typeValue.properties[0].name).toEqual('comparePassword');
        expect(typeValue.properties[0].type.typeName).toEqual('object');

        expect(typeValue.properties[1].name).toEqual('profile');
        expect(typeValue.properties[1].description).toEqual('Description for profile');
        expect(typeValue.properties[1].type.typeName).toEqual('nestedObjectLiteral');

        expect(typeValue.properties[2].name).toEqual('arrayOfSomething');
        expect(typeValue.properties[2].type.typeName).toEqual('array');

        const arrayElementTypeValue = (typeValue.properties[2].type as ArrayType).elementType;

        expect(arrayElementTypeValue.typeName).toEqual('refObject');
        expect((arrayElementTypeValue as RefObjectType).refName).toEqual('Something');

        expect(typeValue.properties[3].name).toEqual('greeting');
        expect(typeValue.properties[3].type.typeName).toEqual('string');
    });

    it('referenceType PrimitiveClassModel & PrimitiveInterfaceModel', async () => {
        const values: RefObjectType[] = [
            await jsonata('PrimitiveClassModel').evaluate(metadata.referenceTypes),
            await jsonata('PrimitiveInterfaceModel').evaluate(metadata.referenceTypes),
        ];

        values.map((value) => {
            expect(value.typeName).toEqual('refObject');
            expect(value.properties).toBeDefined();
            expect(value.properties.length).toEqual(4);

            expect(value.properties[0].name).toEqual('int');
            expect(value.properties[0].description).toEqual('An integer');
            expect(value.properties[0].type.typeName).toEqual('integer');

            expect(value.properties[1].name).toEqual('long');
            expect(value.properties[1].type.typeName).toEqual('long');

            expect(value.properties[2].name).toEqual('float');
            expect(value.properties[2].type.typeName).toEqual('float');

            expect(value.properties[3].name).toEqual('double');
            expect(value.properties[3].type.typeName).toEqual('double');

            return value;
        });
    });

    it('referenceType ResponseBodystringarray', async () => {
        const expression = jsonata('ResponseBodystringarray');
        const value: RefObjectType = await expression.evaluate(metadata.referenceTypes);

        expect(value.properties).toBeDefined();
        expect(value.properties[0].name).toEqual('data');
        expect(value.properties[0].required).toBeTruthy();
        expect(value.properties[0].type.typeName).toEqual('array');
        expect((value.properties[0].type as ArrayType).elementType.typeName).toEqual('string');
    });

    it('referenceType NamedEntity', async () => {
        const expression = jsonata('NamedEntity');
        const value: RefObjectType = await expression.evaluate(metadata.referenceTypes);

        expect(value).toBeDefined();
        // todo: better testing.
    });
});
