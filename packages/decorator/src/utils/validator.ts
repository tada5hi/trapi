/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SchemaOf, array, boolean, lazy, mixed, number, object, string,
} from 'yup';
import {
    Config,
    LibraryConfig,
    MapperIDPropertyConfig,
    MapperIDRepresentation,
    MapperIDRepresentationItem,
    MapperIDs,
} from '../types';
import { mapYupRuleToDictionary } from './yup';

let validatorInstance : undefined | SchemaOf<Config>;

export function useConfigValidator() : SchemaOf<Config> {
    if (typeof validatorInstance !== 'undefined') {
        return validatorInstance;
    }

    const configMappingOptionValidator : SchemaOf<MapperIDs> = lazy((value) => {
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
            return object(mapYupRuleToDictionary(value, boolean())).optional().default({});
        }

        return mixed().optional().default(undefined);
    }) as unknown as SchemaOf<MapperIDs>;

    const useLibraryValidator : SchemaOf<LibraryConfig> = lazy((value) => {
        if (typeof value === 'string') {
            return string();
        }

        if (Array.isArray(value)) {
            return array().of(string());
        }

        if (Object.prototype.toString.call(value) === '[object Object]') {
            // todo: setup library key check :)
            return object(mapYupRuleToDictionary(value, configMappingOptionValidator));
        }

        return mixed().optional().default(undefined);
    }) as unknown as SchemaOf<LibraryConfig>;

    const representationPropertyValidator : SchemaOf<MapperIDPropertyConfig> = object({
        type: mixed().oneOf(['element', 'array'] as Array<MapperIDPropertyConfig['type']>),
        isType: boolean().optional().default(undefined),
        srcArgumentType: mixed().oneOf(['argument', 'typeArgument'] as Array<MapperIDPropertyConfig['srcArgumentType']>),
        srcPosition: number().min(0).optional().default(0),
        srcAmount: number().optional().default(undefined),
        // todo: check if 'merge', 'none' or function
        srcStrategy: mixed().optional().default(undefined),
    });

    const representationValidator : SchemaOf<MapperIDRepresentationItem<any>> = object({
        id: string().required(),
        properties: lazy((value) => {
            if (Object.prototype.toString.call(value) === '[object Object]') {
                return object(mapYupRuleToDictionary(value, representationPropertyValidator)).optional().default({});
            }

            return mixed().optional().default(undefined);
        }),
    }) as unknown as SchemaOf<MapperIDRepresentationItem<any>>;

    const overrideValidator : SchemaOf<MapperIDRepresentation> = lazy((value) => {
        if (Object.prototype.toString.call(value) === '[object Object]') {
            return object(mapYupRuleToDictionary(value, lazy((val) => {
                if (Array.isArray(val)) {
                    return array().of(representationValidator);
                }

                return representationValidator;
            })));
        }

        return mixed().optional().default(undefined);
    }) as unknown as SchemaOf<MapperIDRepresentation>;

    validatorInstance = object({
        library: useLibraryValidator,
        internal: configMappingOptionValidator,
        custom: overrideValidator,
    }).optional().default({
        library: ['typescript-rest', '@decorators/express'],
        internal: true,
    } as Config);

    return validatorInstance;
}
