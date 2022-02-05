/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ParseOptionsBase, ParseOutputElementBase } from '../../parse';
import { Parameter } from '../../type';
import {
    Flatten, KeyWithOptionalPrefix, OnlyObject, OnlyScalar,
} from '../../utils';

export enum SortDirection {
    ASC = 'ASC',
    DESC = 'DESC',
}

// -----------------------------------------------------------
// Build
// -----------------------------------------------------------

type SortOperatorDesc = '-';
type SortWithOperator<T extends Record<string, any>> =
    KeyWithOptionalPrefix<keyof T, SortOperatorDesc> |
    KeyWithOptionalPrefix<keyof T, SortOperatorDesc>[];

export type SortBuildInput<T> = {
    [K in keyof T]?: T[K] extends OnlyScalar<T[K]> ?
        SortDirection :
        T[K] extends OnlyObject<T[K]> ? SortBuildInput<Flatten<T[K]>> | SortWithOperator<Flatten<T[K]>> : never
} | SortWithOperator<T>;

// -----------------------------------------------------------
// Parse
// -----------------------------------------------------------

export type SortParseOptions = ParseOptionsBase<Parameter.SORT, string[] | string[][]>;
export type SortParseOutputElement = ParseOutputElementBase<Parameter.SORT, SortDirection>;
export type SortParseOutput = SortParseOutputElement[];
