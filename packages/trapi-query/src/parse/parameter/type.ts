/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {FieldsParseOptions, FieldsParseOutput} from "../../parameter";
import {FiltersParseOptions, FiltersParseOutput} from "../../parameter";
import {PaginationParseOptions, PaginationParseOutput} from "../../parameter";
import {RelationsParseOptions, RelationsParseOutput} from "../../parameter";
import {SortParseOptions, SortParseOutput} from "../../parameter";

import {
    ParameterFieldsType,
    ParameterFiltersType,
    ParameterPaginationType,
    ParameterRelationsType,
    ParameterSortType,
    ParameterType,
    URLParameterFieldsType,
    URLParameterFiltersType,
    URLParameterPaginationType,
    URLParameterRelationsType, URLParameterSortType,
    URLParameterType
} from "../../type";

export type ParseParameterOptions<T extends ParameterType | URLParameterType> =
    T extends ParameterFieldsType | URLParameterFieldsType ?
        FieldsParseOptions :
            T extends ParameterFiltersType | URLParameterFiltersType ?
                FiltersParseOptions :
                T extends ParameterRelationsType | URLParameterRelationsType ?
                    RelationsParseOptions :
                    T extends ParameterPaginationType | URLParameterPaginationType ?
                        PaginationParseOptions :
                        T extends ParameterSortType | URLParameterSortType ?
                            SortParseOptions :
                            {};

export type ParseParameterOutput<T extends ParameterType | URLParameterType> =
    T extends ParameterFieldsType | URLParameterFieldsType ?
        FieldsParseOutput :
        T extends ParameterFiltersType | URLParameterFiltersType ?
                FiltersParseOutput :
                T extends ParameterRelationsType | URLParameterRelationsType ?
                    RelationsParseOutput :
                    T extends ParameterPaginationType | URLParameterPaginationType ?
                        PaginationParseOutput :
                        T extends ParameterSortType | URLParameterSortType ?
                            SortParseOutput :
                            never;
