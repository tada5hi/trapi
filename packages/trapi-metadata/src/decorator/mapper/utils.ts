/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@trapi/metadata-utils';
import { Decorator } from '../type';

/**
 *
 *
 * @param mapping
 * @param reducer
 */
export function reduceTypeRepresentationMapping(
    mapping: Partial<Decorator.TypeRepresentationMap>,
    reducer: (type: Decorator.Type) => boolean,
): Partial<Decorator.TypeRepresentationMap> {
    const mappingKeys: Decorator.Type[] = (Object.keys(mapping) as Decorator.Type[]);
    const allowedTypes: Decorator.Type[] = mappingKeys
        .filter(reducer);

    if (mappingKeys.length === allowedTypes.length) {
        return mapping;
    }

    const result: Partial<Decorator.TypeRepresentationMap> = {};
    for (let i = 0; i < allowedTypes.length; i++) {
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
    type: Decorator.Type,
    config: Decorator.TypeRepresentationConfig,
): boolean {
    const allowedType = Object.prototype.toString.call(config);
    switch (allowedType) {
        case '[object Boolean]':
            return !!config;
        case '[object String]':
            return (config as string) === type;
        case '[object Array]':
            return (config as unknown as Decorator.Type[]).indexOf(type) !== -1;
        case '[object Object]':
            return hasOwnProperty((config as Record<Decorator.Type, boolean>), type) && (config as Record<Decorator.Type, boolean>)[type];
    }

    /* istanbul ignore next */
    return false;
}

const decoratorMap : Record<string, Partial<Decorator.TypeRepresentationMap>> = {};

export function getDecoratorMap(name: string) : Partial<Decorator.TypeRepresentationMap> {
    if (hasOwnProperty(decoratorMap, name)) {
        return decoratorMap[name];
    }

    const content = loadDecoratorMap(name);

    (decoratorMap as Record<string, Partial<Decorator.TypeRepresentationMap>>)[name] = content;

    return content;
}

/* istanbul ignore next */
function loadDecoratorMap(library: string) : Partial<Decorator.TypeRepresentationMap> {
    const exp = require(`./maps/${library}`);

    if (hasOwnProperty(exp, 'default')) {
        return exp.default;
    }

    /* istanbul ignore next */
    return exp;
}
