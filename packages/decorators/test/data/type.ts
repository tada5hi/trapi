/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IsDouble,
    IsFloat,
    IsInt,
    IsLong,
} from '../../src';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export interface ClassType extends Function {
    new(...args: any[]): any;
}

export interface TestInterface {
    a: string;
    b: number;
}

export interface MyTypeWithUnion {
    property: 'value1' | 'value2';
}

export interface Address {
    street: string;
}

export interface Person {
    name: string;
    address?: Address;
}

export enum TestEnum {
    Option1 = 'option1',
    Option2 = 'option2',
}

export enum TestNumericEnum {
    Option1,
    Option2,
}

export enum TestMixedEnum {
    Option1,
    Option2 = 'option2',
}

export interface BasicModel2<T> {
    prop: T;
}

export interface MyDataType2 extends BasicModel2<string> {
    property1: string;
}

export type SimpleHelloType = {
    /**
     * Description for greeting property
     */
    greeting: string;

    arrayOfSomething: Something[];

    /**
     * Description for profile
     */
    profile: {
        /**
         * Description for profile name
         */
        name: string
    };

    comparePassword: (candidatePassword: string, cb: (err: any, isMatch: any) => void) => void;
};

export class BasicModel {
    public id: number;
}

export interface Something {
    id: UUID;
    someone: string;
    kind: string;
}

export type UUID = string;

export interface ResponseBody<T> {
    data: T;
}

export class PrimitiveClassModel {
    /**
     * An integer
     */
    @IsInt
    public int?: number;

    @IsLong
    public long?: number;

    @IsFloat
    public float?: number;

    @IsDouble
    public double?: number;
}

export interface PrimitiveInterfaceModel {
    /**
     * An integer
     * @IsInt
     */
    int?: number;

    /**
     * @IsLong
     */
    long?: number;

    /**
     * @IsFloat
     */
    float?: number;

    /**
     * @IsDouble
     */
    double?: number;
}

export abstract class Entity {
    /**
     * A numeric identifier
     */
    public id?: number;
}

export class NamedEntity implements Entity {
    public id: number;

    public name: string;
}

// --- Circular reference types ---

export interface TreeNode {
    value: string;
    children: TreeNode[];
}

export interface TypeA {
    name: string;
    b?: TypeB;
}

export interface TypeB {
    value: number;
    a?: TypeA;
}

// --- Complex composition types ---

export type PartialPerson = Partial<Person>;

export type PickAddress = Pick<Address, 'street'>;

export type RecordOfStrings = Record<string, string>;

export interface GenericWrapper<T> {
    data: T;
    meta: {
        count: number;
    };
}

export type NestedGeneric = GenericWrapper<GenericWrapper<string>>;

export interface Timestamped {
    createdAt: string;
    updatedAt: string;
}

export type TimestampedPerson = Person & Timestamped;

// --- Nullable types ---

export type NullableString = string | null;

export interface ModelWithNullable {
    name: string;
    nickname: string | null;
    age?: number;
}

// --- Deprecated model ---

/**
 * @deprecated Use NewModel instead
 */
export interface DeprecatedModel {
    oldField: string;
}
