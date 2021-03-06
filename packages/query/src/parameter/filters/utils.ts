/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    FilterOperatorConfig, FilterOperatorLabelType,
} from './type';
import { hasOwnProperty, isSimpleValue } from '../../utils';
import { FilterOperator, FilterOperatorLabel } from './constants';

const config : {
    sign: FilterOperator,
    label: FilterOperatorLabel
}[] = [];

const operatorKeys = Object.keys(FilterOperator);
for (let i = 0; i < operatorKeys.length; i++) {
    config.push({
        sign: FilterOperator[operatorKeys[i]],
        label: FilterOperatorLabel[operatorKeys[i]],
    });
}

export function determineFilterOperatorLabelsByValue(input: string) : {
    operators: FilterOperatorLabelType[],
    value: string | string[]
} {
    let value : string[] | string = input;

    const operators : FilterOperatorLabelType[] = [];

    for (let i = 0; i < config.length; i++) {
        if (typeof value !== 'string') {
            continue;
        }

        switch (config[i].sign) {
            case FilterOperator.IN:
                if (
                    value.includes(config[i].sign)
                ) {
                    operators.push(config[i].label);
                    value = value.split(config[i].sign);
                }
                break;
            default:
                if (
                    value.slice(0, config[i].sign.length) === config[i].sign
                ) {
                    operators.push(config[i].label);
                    value = value.slice(config[i].sign.length);
                    if (value.toLowerCase() === 'null') {
                        value = null;
                    }
                }
                break;
        }
    }

    return {
        operators,
        value,
    };
}

export function isFilterOperatorConfig(data: unknown) : data is FilterOperatorConfig<any> {
    if (typeof data !== 'object') {
        return false;
    }

    if (hasOwnProperty(data, 'operator')) {
        const operators : string[] = Object.values(FilterOperator);

        if (typeof data.operator === 'string') {
            if (operators.indexOf(data.operator) === -1) {
                return false;
            }
        } else if (Array.isArray(data.operator)) {
            for (let i = 0; i < data.operator.length; i++) {
                if (typeof data.operator[i] !== 'string') {
                    return false;
                }

                if (operators.indexOf(data.operator[i]) === -1) {
                    return false;
                }
            }
        } else {
            return false;
        }
    } else {
        return false;
    }

    if (hasOwnProperty(data, 'value')) {
        if (
            !isSimpleValue(data.value, {
                withNull: true,
                withUndefined: true,
            })
        ) {
            if (Array.isArray(data.value)) {
                for (let i = 0; i < data.value.length; i++) {
                    if (!isSimpleValue(data.value[i])) {
                        return false;
                    }
                }
            } else {
                return false;
            }
        }
    } else {
        return false;
    }

    return true;
}
