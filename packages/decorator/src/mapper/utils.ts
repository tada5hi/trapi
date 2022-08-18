/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@trapi/common';
import path from 'path';
import { ID, IncludedIDs, RepresentationMap } from '../types';

/**
 *
 *
 * @param mapping
 * @param reducer
 */
export function reduceTypeRepresentationMapping(
    mapping: Partial<RepresentationMap>,
    reducer: (type: ID) => boolean,
): Partial<RepresentationMap> {
    const mappingKeys = Object.keys(mapping) as (keyof RepresentationMap)[];
    const allowedTypes = mappingKeys
        .filter(reducer);

    if (mappingKeys.length === allowedTypes.length) {
        return mapping;
    }

    const result: Partial<RepresentationMap> = {};
    for (let i = 0; i < allowedTypes.length; i++) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        result[allowedTypes[i]] = mapping[allowedTypes[i]];
    }

    return result;
}

/**
 *
 *
 * @param type
 * @param config
 */
export function isMappingTypeIncluded(
    type: ID,
    config: IncludedIDs,
): boolean {
    const allowedType = Object.prototype.toString.call(config);
    switch (allowedType) {
        case '[object Boolean]':
            return !!config;
        case '[object String]':
            return (config as string) === type;
        case '[object Array]':
            return (config as unknown as ID[]).indexOf(type) !== -1;
        case '[object Object]':
            return hasOwnProperty((config as Record<ID, boolean>), type) && (config as Record<ID, boolean>)[type];
    }

    /* istanbul ignore next */
    return false;
}

const decoratorMap : Record<string, Partial<RepresentationMap>> = {};

export function getDecoratorMap(name: string) : Partial<RepresentationMap> {
    if (hasOwnProperty(decoratorMap, name)) {
        return decoratorMap[name];
    }

    const content = loadDecoratorMap(name);

    (decoratorMap as Record<string, Partial<RepresentationMap>>)[name] = content;

    return content;
}

/* istanbul ignore next */
function loadDecoratorMap(library: string) : Partial<RepresentationMap> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require
    const exp = require(path.resolve(__dirname, 'maps', `${library}`));

    if (hasOwnProperty(exp, 'default')) {
        return exp.default;
    }

    /* istanbul ignore next */
    return exp;
}
