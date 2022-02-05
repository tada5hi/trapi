/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ParseOptionsBase, ParseOutputElementBase } from '../../parse';
import { Parameter } from '../../type';
import {
    Flatten, KeyWithOptionalPrefix, OnlyObject, ToOneAndMany,
} from '../../utils';

export const DEFAULT_ALIAS_ID = '__DEFAULT__';

// -----------------------------------------------------------
// Build
// -----------------------------------------------------------

export enum FieldOperator {
    INCLUDE = '+',
    EXCLUDE = '-',
}

type FieldWithOperator<T extends Record<string, any>> =
    KeyWithOptionalPrefix<keyof T, FieldOperator> |
    KeyWithOptionalPrefix<keyof T, FieldOperator>[];

export type FieldsBuildInput<T> =
    {
        [K in keyof T]?: T[K] extends OnlyObject<T[K]> ?
            (FieldsBuildInput<Flatten<T[K]>> | FieldWithOperator<Flatten<T[K]>>) : never
    } |
    {
        [key: string]: ToOneAndMany<KeyWithOptionalPrefix<keyof T, FieldOperator>[]>,
    } |
    FieldWithOperator<T>;

// -----------------------------------------------------------
// Parse
// -----------------------------------------------------------

export type FieldsParseOptions = ParseOptionsBase<Parameter.FIELDS, Record<string, string[]> | string[]>;

export type FieldsParseOutputElement = ParseOutputElementBase<Parameter.FIELDS, FieldOperator>;
export type FieldsParseOutput = FieldsParseOutputElement[];
