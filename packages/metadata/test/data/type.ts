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
} from './_stubs';


// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-function-type -- Metadata fixture.
export interface ClassType extends Function {
    new(...args: any[]): any;
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface TestInterface {
    a: string;
    b: number;
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface MyTypeWithUnion {
    property: 'value1' | 'value2';
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface Address {
    street: string;
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
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



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface BasicModel2<T> {
    prop: T;
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
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



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface Something {
    id: UUID;
    someone: string;
    kind: string;
}

export type UUID = string;



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
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



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
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



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface TreeNode {
    value: string;
    children: TreeNode[];
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface TypeA {
    name: string;
    b?: TypeB;
}



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface TypeB {
    value: number;
    a?: TypeA;
}

// --- Complex composition types ---

export type PartialPerson = Partial<Person>;

export type PickAddress = Pick<Address, 'street'>;

export type RecordOfStrings = Record<string, string>;



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface GenericWrapper<T> {
    data: T;
    meta: {
        count: number;
    };
}

export type NestedGeneric = GenericWrapper<GenericWrapper<string>>;



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface Timestamped {
    createdAt: string;
    updatedAt: string;
}

export type TimestampedPerson = Person & Timestamped;

// --- Nullable types ---

export type NullableString = string | null;



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
export interface ModelWithNullable {
    name: string;
    nickname: string | null;
    age?: number;
}

// --- Deprecated model ---

/**
 * @deprecated Use NewModel instead
 */
// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public type name and declaration merging.
export interface DeprecatedModel {
    oldField: string;
}
