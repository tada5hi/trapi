/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildParameterInput } from './parameter';
import { BuildInput, BuildOptions } from './type';
import {
    buildQueryFields, buildQueryFilters, buildQueryRelations, buildQuerySort,
} from '../parameter';
import { Parameter, URLParameter } from '../constants';
import {
    buildURLQueryString,
} from '../utils';

export function buildQuery<T extends Record<string, any>>(
    input?: BuildInput<T>,
    options?: BuildOptions,
) : string {
    if (
        typeof input === 'undefined' ||
        input === null
    ) {
        return '';
    }

    const query: { [key in URLParameter]?: unknown } = {};

    if (
        typeof input[Parameter.FIELDS] !== 'undefined' ||
        typeof input[URLParameter.FIELDS] !== 'undefined'
    ) {
        const fields: BuildParameterInput<Parameter.FIELDS, T> = input[Parameter.FIELDS] ??
            input[URLParameter.FIELDS];

        query[URLParameter.FIELDS] = buildQueryFields(fields);
    }

    if (
        typeof input[Parameter.FILTERS] !== 'undefined' ||
        typeof input[URLParameter.FILTERS] !== 'undefined'
    ) {
        const value : BuildParameterInput<Parameter.FILTERS, T> = input[Parameter.FILTERS] ??
            input[URLParameter.FILTERS];

        query[URLParameter.FILTERS] = buildQueryFilters(value);
    }

    if (
        typeof input[Parameter.PAGINATION] !== 'undefined' ||
        typeof input[URLParameter.PAGINATION] !== 'undefined'
    ) {
        query[URLParameter.PAGINATION] = input[Parameter.PAGINATION] ??
            input[URLParameter.PAGINATION];
    }

    if (
        typeof input[Parameter.RELATIONS] !== 'undefined' ||
        typeof input[URLParameter.RELATIONS] !== 'undefined'
    ) {
        const value : BuildParameterInput<Parameter.RELATIONS, T> = input[Parameter.RELATIONS] ??
            input[URLParameter.RELATIONS];

        query[URLParameter.RELATIONS] = buildQueryRelations(value);
    }

    if (
        typeof input[Parameter.SORT] !== 'undefined' ||
        typeof input[URLParameter.SORT] !== 'undefined'
    ) {
        const value : BuildParameterInput<Parameter.SORT, T> = input[Parameter.SORT] ??
            input[URLParameter.SORT];

        query[URLParameter.SORT] = buildQuerySort(value);
    }

    return buildURLQueryString(query);
}
