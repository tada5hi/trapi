/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flattenNestedProperties } from '../utils';
import { FilterOperatorConfig, FiltersBuildInput } from './type';
import { FilterOperator } from './constants';
import { isFilterOperatorConfig } from './utils';

export function buildQueryFilters<T>(data: FiltersBuildInput<T>) : Record<string, string> {
    return flattenNestedProperties(transformOperatorConfigToValue(data));
}

const OperatorWeight = {
    [FilterOperator.NEGATION]: 0,
    [FilterOperator.LIKE]: 50,
    [FilterOperator.LESS_THAN_EQUAL]: 150,
    [FilterOperator.LESS_THAN]: 450,
    [FilterOperator.MORE_THAN_EQUAL]: 1350,
    [FilterOperator.MORE_THAN]: 4050,
    [FilterOperator.IN]: 13105,
};

function transformValue(value: unknown) {
    if (typeof value === 'undefined') {
        return null;
    }

    return value;
}

function transformOperatorConfigToValue<T>(
    data: FiltersBuildInput<T> | FilterOperatorConfig<any>,
) : FiltersBuildInput<T> | FilterOperatorConfig<any> {
    if (Object.prototype.toString.call(data) !== '[object Object]') {
        return data as FiltersBuildInput<T>;
    }

    if (isFilterOperatorConfig(data)) {
        data.value = transformValue(data.value);

        if (Array.isArray(data.operator)) {
            // merge operators
            data.operator = data.operator
                .sort((a, b) => OperatorWeight[a] - OperatorWeight[b])
                .join('') as FilterOperator;
        }

        return data;
    }

    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
        data[keys[i]] = transformValue(data[keys[i]]);
        data[keys[i]] = transformOperatorConfigToValue(data[keys[i]]);
    }

    return data;
}
