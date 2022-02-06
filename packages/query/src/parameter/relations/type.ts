/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ParseOptionsBase, ParseOutputElementBase } from '../../parse';
import { Parameter } from '../../type';
import { Flatten, OnlyObject } from '../type';

// -----------------------------------------------------------
// Build
// -----------------------------------------------------------

export type RelationsBuildInput<T extends Record<string, any>> = {
    [K in keyof T]?: T[K] extends OnlyObject<T[K]> ? RelationsBuildInput<Flatten<T[K]>> | boolean : never
};

// -----------------------------------------------------------
// Parse
// -----------------------------------------------------------

export type RelationsParseOptions = ParseOptionsBase<Parameter.RELATIONS> & {
    includeParents?: boolean | string[] | string
};

export type RelationsParseOutputElement = ParseOutputElementBase<Parameter.RELATIONS, string>;
export type RelationsParseOutput = RelationsParseOutputElement[];
