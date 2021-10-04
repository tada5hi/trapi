/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// -----------------------------------------------------------

export enum Parameter {
    FILTERS = 'filters',
    FIELDS = 'fields',
    PAGINATION = 'pagination',
    RELATIONS = 'relations',
    SORT = 'sort'
}

export type ParameterType = `${Parameter}`;

export type ParameterFiltersType = 'filters';
export type ParameterFieldsType = 'fields';
export type ParameterPaginationType = 'pagination';
export type ParameterRelationsType = 'relations';
export type ParameterSortType = 'sort';

// -----------------------------------------------------------

export enum URLParameter {
    FILTERS = 'filter',
    FIELDS = 'fields',
    PAGINATION = 'page',
    RELATIONS = 'include',
    SORT = 'sort'
}

export type URLParameterType = `${URLParameter}`;

export type URLParameterFiltersType = 'filter';
export type URLParameterFieldsType = 'fields';
export type URLParameterPaginationType = 'page';
export type URLParameterRelationsType = 'include';
export type URLParameterSortType = 'sort';


