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
import { SortDirection, SortParseOptions, SortParseOutput } from './type';

// --------------------------------------------------

// --------------------------------------------------

function isMultiDimensionalArray(arr: unknown) : arr is unknown[][] {
    if (!Array.isArray(arr)) {
        return false;
    }

    return arr.length > 0 && Array.isArray(arr[0]);
}

/**
 * Transform sort data to appreciate data format.
 * @param data
 * @param options
 */
export function parseQuerySort(
    data: unknown,
    options?: SortParseOptions,
) : SortParseOutput {
    options = options ?? {};

    // If it is an empty array nothing is allowed
    if (
        Array.isArray(options.allowed) &&
        options.allowed.length === 0
    ) {
        return [];
    }

    options.aliasMapping = options.aliasMapping ? buildObjectFromStringArray(options.aliasMapping) : {};

    const prototype = Object.prototype.toString.call(data);

    /* istanbul ignore next */
    if (
        prototype !== '[object String]' &&
        prototype !== '[object Array]' &&
        prototype !== '[object Object]'
    ) {
        return [];
    }

    let parts : string[] = [];

    if (prototype === '[object String]') {
        parts = (data as string).split(',');
    }

    if (prototype === '[object Array]') {
        parts = (data as string[]).filter((item) => typeof item === 'string');
    }

    if (prototype === '[object Object]') {
        const ob : Record<string, any> = data as object;
        for (const key in ob) {
            /* istanbul ignore next */
            if (
                !ob.hasOwnProperty(key) ||
                typeof key !== 'string' ||
                typeof ob[key] !== 'string'

            ) continue;

            const fieldPrefix = ob[key].toLowerCase() === 'desc' ? '-' : '';

            parts.push(fieldPrefix + key);
        }
    }

    const items : Record<string, {
        alias?: string,
        key: string,
        value: SortDirection
    }> = {};

    for (let i = 0; i < parts.length; i++) {
        let direction: SortDirection = SortDirection.ASC;
        if (parts[i].substr(0, 1) === '-') {
            direction = SortDirection.DESC;
            parts[i] = parts[i].substr(1);
        }

        let key: string = parts[i];

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
            !isMultiDimensionalArray(options.allowed) &&
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
        items[keyWithAlias] = {
            key: fieldDetails.name,
            ...(alias ? { alias } : {}),
            value: direction,
        };
    }

    if (isMultiDimensionalArray(options.allowed)) {
        outerLoop:
        for (let i = 0; i < options.allowed.length; i++) {
            const temp : SortParseOutput = [];

            for (let j = 0; j < options.allowed[i].length; j++) {
                const keyWithAlias : string = options.allowed[i][j];
                const key : string = keyWithAlias.includes('.') ? keyWithAlias.split('.').pop() : keyWithAlias;

                if (items.hasOwnProperty(key) || items.hasOwnProperty(keyWithAlias)) {
                    const item = items.hasOwnProperty(key) ? items[key] : items[keyWithAlias];
                    temp.push(item);
                } else {
                    continue outerLoop;
                }
            }

            return temp;
        }

        // if we get no match, the sort data is invalid.
        return [];
    }

    return Object.values(items);
}
