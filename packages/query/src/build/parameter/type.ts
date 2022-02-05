/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    FieldsBuildInput,
    FiltersBuildInput,
    PaginationBuildInput,
    RelationsBuildInput,
    SortBuildInput,
} from '../../parameter';
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
    URLParameterRelationsType,
    URLParameterSortType,
    URLParameterType,
} from '../../type';

export type BuildParameterInput<
    T extends ParameterType | URLParameterType,
    R extends Record<string, any>,
    > =
    T extends ParameterFieldsType | URLParameterFieldsType ?
        FieldsBuildInput<R> :
        T extends ParameterFiltersType | URLParameterFiltersType ?
            FiltersBuildInput<R> :
            T extends ParameterRelationsType | URLParameterRelationsType ?
                RelationsBuildInput<R> :
                T extends ParameterPaginationType | URLParameterPaginationType ?
                    PaginationBuildInput<R> :
                    T extends ParameterSortType | URLParameterSortType ?
                        SortBuildInput<R> :
                        T;
