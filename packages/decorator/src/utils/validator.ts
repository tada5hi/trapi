/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SchemaOf, array, boolean, lazy, mixed, number, object, string,
} from 'yup';
import { mapYupRuleForDictionary } from '@trapi/common';
import {
    Config,
    IncludedIDs,
    LibraryConfig,
    PropertyConfig,
    Representation,
    RepresentationMap,
} from '../types';

let validatorInstance : undefined | SchemaOf<Config>;

export function useConfigValidator() : SchemaOf<Config> {
    if (typeof validatorInstance !== 'undefined') {
        return validatorInstance;
    }

    const configMappingOptionValidator : SchemaOf<IncludedIDs> = lazy((value) => {
        if (typeof value === 'boolean') {
            return boolean();
        }

        if (typeof value === 'string') {
            return string();
        }

        if (Array.isArray(value)) {
            return array().of(string());
        }

        if (Object.prototype.toString.call(value) === '[object Object]') {
            // todo: setup type key check :)
            return object(mapYupRuleForDictionary(value, boolean())).optional().default({});
        }

        return mixed().optional().default(undefined);
    }) as unknown as SchemaOf<IncludedIDs>;

    const useLibraryValidator : SchemaOf<LibraryConfig> = lazy((value) => {
        if (typeof value === 'string') {
            return string();
        }

        if (Array.isArray(value)) {
            return array().of(string());
        }

        if (Object.prototype.toString.call(value) === '[object Object]') {
            // todo: setup library key check :)
            return object(mapYupRuleForDictionary(value, configMappingOptionValidator));
        }

        return mixed().optional().default(undefined);
    }) as unknown as SchemaOf<LibraryConfig>;

    const representationPropertyValidator : SchemaOf<PropertyConfig> = object({
        type: mixed().oneOf(['element', 'array'] as Array<PropertyConfig['type']>),
        isType: boolean().optional().default(undefined),
        srcArgumentType: mixed().oneOf(['argument', 'typeArgument'] as Array<PropertyConfig['srcArgumentType']>),
        srcPosition: number().min(0).optional().default(0),
        srcAmount: number().optional().default(undefined),
        // todo: check if 'merge', 'none' or function
        srcStrategy: mixed().optional().default(undefined),
    });

    const representationValidator : SchemaOf<Representation<any>> = object({
        id: string().required(),
        properties: lazy((value) => {
            if (Object.prototype.toString.call(value) === '[object Object]') {
                return object(mapYupRuleForDictionary(value, representationPropertyValidator)).optional().default({});
            }

            return mixed().optional().default(undefined);
        }),
    }) as unknown as SchemaOf<Representation<any>>;

    const overrideValidator : SchemaOf<RepresentationMap> = lazy((value) => {
        if (Object.prototype.toString.call(value) === '[object Object]') {
            return object(mapYupRuleForDictionary(value, lazy((val) => {
                if (Array.isArray(val)) {
                    return array().of(representationValidator);
                }

                return representationValidator;
            })));
        }

        return mixed().optional().default(undefined);
    }) as unknown as SchemaOf<RepresentationMap>;

    validatorInstance = object({
        library: useLibraryValidator,
        internal: configMappingOptionValidator,
        map: overrideValidator,
    }).optional().default({
        library: ['typescript-rest', '@decorators/express'],
        internal: true,
    } as Config);

    return validatorInstance;
}
