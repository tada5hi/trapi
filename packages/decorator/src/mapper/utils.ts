/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { IncludedIDs, MapperID, MapperRepresentationMap } from '../types';
import { hasOwnProperty } from '../utils';

/**
 *
 *
 * @param mapping
 * @param reducer
 */
export function reduceTypeRepresentationMapping(
    mapping: Partial<MapperRepresentationMap>,
    reducer: (type: MapperID) => boolean,
): Partial<MapperRepresentationMap> {
    const mappingKeys = Object.keys(mapping) as (keyof MapperRepresentationMap)[];
    const allowedTypes = mappingKeys
        .filter(reducer);

    if (mappingKeys.length === allowedTypes.length) {
        return mapping;
    }

    const result: Partial<MapperRepresentationMap> = {};
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
    type: MapperID,
    config: IncludedIDs,
): boolean {
    const allowedType = Object.prototype.toString.call(config);
    switch (allowedType) {
        case '[object Boolean]':
            return !!config;
        case '[object String]':
            return (config as string) === type;
        case '[object Array]':
            return (config as unknown as MapperID[]).indexOf(type) !== -1;
        case '[object Object]':
            return hasOwnProperty((config as Record<MapperID, boolean>), type) && (config as Record<MapperID, boolean>)[type];
    }

    /* istanbul ignore next */
    return false;
}

const decoratorMap : Record<string, Partial<MapperRepresentationMap>> = {};

export function getDecoratorMap(name: string) : Partial<MapperRepresentationMap> {
    if (hasOwnProperty(decoratorMap, name)) {
        return decoratorMap[name];
    }

    const content = loadDecoratorMap(name);

    (decoratorMap as Record<string, Partial<MapperRepresentationMap>>)[name] = content;

    return content;
}

/* istanbul ignore next */
function loadDecoratorMap(library: string) : Partial<MapperRepresentationMap> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require,import/no-dynamic-require
    const exp = require(path.resolve(__dirname, 'maps', `${library}`));

    if (hasOwnProperty(exp, 'default')) {
        return exp.default;
    }

    /* istanbul ignore next */
    return exp;
}
