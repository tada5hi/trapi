/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AnyType,
    ArrayType,
    BaseType,
    NestedObjectLiteralType,
    RefAliasType,
    RefEnumType,
    RefObjectType,
    UnionType,
} from '../../../src';
import {
    isArrayType,
    isNestedObjectLiteralType,
    isRefAliasType,
    isRefEnumType,
    isRefObjectType,
    isReferenceType,
    isUnionType,
    isVoidType,
} from '../../../src';

describe('type.ts', () => {
    it('check void type', () => {
        const type : BaseType = {
            typeName: 'void',
        };
        expect(isVoidType(type)).toBeTruthy();

        type.typeName = 'any';

        expect(isVoidType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check array type', () => {
        let type : ArrayType | AnyType = {
            typeName: 'array',
            elementType: {
                typeName: 'void',
            },
        };
        expect(isArrayType(type)).toBeTruthy();

        type = {
            typeName: 'any',
        };

        expect(isArrayType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check nested object literal type', () => {
        let type : NestedObjectLiteralType | AnyType = {
            typeName: 'nestedObjectLiteral',
            properties: [],
        };
        expect(isNestedObjectLiteralType(type)).toBeTruthy();

        type = {
            typeName: 'any',
        };

        expect(isNestedObjectLiteralType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check union type', () => {
        let type : UnionType | AnyType = {
            typeName: 'union',
            members: [],
        };
        expect(isUnionType(type)).toBeTruthy();

        type = {
            typeName: 'any',
        };

        expect(isUnionType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check ref enum type', () => {
        let type : RefEnumType | AnyType = {
            deprecated: false,
            typeName: 'refEnum',
            members: [],
            refName: 'test',
        };

        expect(isRefEnumType(type)).toBeTruthy();
        expect(isReferenceType(type)).toBeTruthy();

        type = {
            typeName: 'any',
        };

        expect(isRefEnumType(type)).toBeFalsy();
        expect(isReferenceType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check ref object type', () => {
        let type : RefObjectType | AnyType = {
            deprecated: false,
            typeName: 'refObject',
            refName: 'test',
            properties: [],
        };

        expect(isRefObjectType(type)).toBeTruthy();
        expect(isReferenceType(type)).toBeTruthy();

        type = {
            typeName: 'any',
        };

        expect(isRefObjectType(type)).toBeFalsy();
        expect(isReferenceType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check ref alias type', () => {
        let type : RefAliasType | AnyType = {
            deprecated: false,
            typeName: 'refAlias',
            refName: 'test',
            type: null,
        };

        expect(isRefAliasType(type)).toBeTruthy();
        expect(isReferenceType(type)).toBeTruthy();

        type = {
            typeName: 'any',
        };

        expect(isRefAliasType(type)).toBeFalsy();
        expect(isReferenceType(type)).toBeFalsy();
    });
});
