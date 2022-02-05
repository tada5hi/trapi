/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    FieldDetails,
    buildFieldWithAlias,
    buildObjectFromStringArray,
    getFieldDetails,
    isFieldAllowedByRelations,
} from '../../utils';
import { FiltersParseOptions, FiltersParseOutput, FiltersParseOutputElement } from './type';
import { determineFilterOperatorLabelsByValue } from './utils';

// --------------------------------------------------

// --------------------------------------------------

function buildOptions(options?: FiltersParseOptions) : FiltersParseOptions {
    options ??= {};

    if (options.aliasMapping) {
        options.aliasMapping = buildObjectFromStringArray(options.aliasMapping);
    } else {
        options.aliasMapping = {};
    }

    options.relations ??= [];

    return options;
}

export function parseQueryFilters(
    data: unknown,
    options?: FiltersParseOptions,
) : FiltersParseOutput {
    options = options ?? {};

    // If it is an empty array nothing is allowed

    if (
        typeof options.allowed !== 'undefined' &&
        Object.keys(options.allowed).length === 0
    ) {
        return [];
    }

    const prototype: string = Object.prototype.toString.call(data);
    /* istanbul ignore next */
    if (prototype !== '[object Object]') {
        return [];
    }

    const { length } = Object.keys(data as Record<string, any>);
    if (length === 0) {
        return [];
    }

    options = buildOptions(options);

    const temp : Record<string, {
        key: string,
        alias?: string,
        value: string | boolean | number
    }> = {};

    // transform to appreciate data format & validate input
    for (let key in (data as Record<string, any>)) {
        /* istanbul ignore next */
        if (!data.hasOwnProperty(key)) {
            continue;
        }

        let value : unknown = (data as Record<string, any>)[key];

        if (
            typeof value !== 'string' &&
            typeof value !== 'number' &&
            typeof value !== 'boolean'
        ) {
            continue;
        }

        if (typeof value === 'string') {
            value = (value as string).trim();
            const stripped : string = (value as string).replace('/,/g', '');

            if (stripped.length === 0) {
                continue;
            }
        }

        if (options.aliasMapping.hasOwnProperty(key)) {
            key = options.aliasMapping[key];
        }

        const fieldDetails : FieldDetails = getFieldDetails(key);
        if (!isFieldAllowedByRelations(fieldDetails, options.relations, { defaultAlias: options.defaultAlias })) {
            continue;
        }

        const keyWithAlias : string = buildFieldWithAlias(fieldDetails, options.defaultAlias);

        if (
            typeof options.allowed !== 'undefined' &&
            options.allowed.indexOf(key) === -1 &&
            options.allowed.indexOf(keyWithAlias) === -1
        ) {
            continue;
        }

        const alias : string | undefined = typeof fieldDetails.path === 'undefined' &&
            typeof fieldDetails.alias === 'undefined' ?
            (
                options.defaultAlias ?
                    options.defaultAlias :
                    undefined
            ) :
            fieldDetails.alias;
        temp[keyWithAlias] = {
            key: fieldDetails.name,
            ...(alias ? { alias } : {}),
            value: value as string | boolean | number,
        };
    }

    const items : FiltersParseOutput = [];

    /* istanbul ignore next */
    for (const key in temp) {
        /* istanbul ignore next */
        if (!temp.hasOwnProperty(key)) {
            continue;
        }

        const filter : FiltersParseOutputElement = {
            ...(temp[key].alias ? { alias: temp[key].alias } : {}),
            key: temp[key].key,
            value: temp[key].value,
        };

        if (typeof filter.value === 'string') {
            const { value, operators } = determineFilterOperatorLabelsByValue(filter.value);
            if (operators.length > 0) {
                filter.value = value;
                filter.operator = {};

                for (let i = 0; i < operators.length; i++) {
                    filter.operator[operators[i]] = true;
                }
            }
        }

        items.push(filter);
    }

    return items;
}
