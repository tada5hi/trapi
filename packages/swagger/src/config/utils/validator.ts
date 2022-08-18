/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SchemaOf, array, boolean, lazy, mixed, object, string,
} from 'yup';
import { getPackageJsonStringValue, mapYupRuleForDictionary } from '@trapi/common';
import { Specification } from '../../specification';

let validatorInstance : undefined | SchemaOf<Specification.Config>;

export function useConfigValidator() : SchemaOf<Specification.Config> {
    if (typeof validatorInstance !== 'undefined') {
        return validatorInstance;
    }

    const securityDefinitionsValidator : SchemaOf<Specification.SecurityDefinitions> = lazy((map) => {
        if (Object.prototype.toString.call(map) === '[object Object]') {
            const directory = mapYupRuleForDictionary(map, object({
                type: mixed().oneOf(['apiKey', 'oauth2', 'http'] as Specification.SecurityType[]),
                description: string().optional().default(undefined),
                schema: mixed().oneOf(['basic']).optional(),
                in: mixed().oneOf(['query', 'header']),
                flows: object({
                    implicit: object({
                        refreshUrl: string().optional().default(undefined),
                        scopes: mixed().optional().default({}),
                        authorizationUrl: string(),
                    }).optional(),
                    password: object({
                        refreshUrl: string().optional().default(undefined),
                        scopes: mixed().optional().default({}),
                        tokenUrl: string(),
                    }).optional(),
                    authorizationCode: object({
                        refreshUrl: string().optional().default(undefined),
                        scopes: mixed().optional().default({}),
                        authorizationUrl: string(),
                        tokenUrl: string(),
                    }).optional(),
                    clientCredentials: object({
                        refreshUrl: string().optional().default(undefined),
                        scopes: mixed().optional().default({}),
                        tokenUrl: string(),
                    }),
                }).optional().default(undefined),
            }));

            return object(directory).default({});
        }

        return object().optional().default({});
    }) as unknown as SchemaOf<Specification.SecurityDefinitions>;

    validatorInstance = object({
        yaml: boolean().optional().default(false),

        outputDirectory: string().optional().default(undefined),
        outputFileName: string().optional().default(undefined),

        specification: (string().oneOf([
            Specification.SpecificationOption.V2,
            Specification.SpecificationOption.V3,
        ]).optional().default(Specification.SpecificationOption.V2)) as SchemaOf<Specification.SpecificationOption>,
        specificationExtra: mixed().optional().default(undefined),

        host: string().optional().default(undefined),
        version: string().optional().default(undefined),
        name: string().optional().default(undefined),
        description: string().optional().default(undefined),
        license: string().optional().default(undefined),
        basePath: string().optional().default(undefined),
        securityDefinitions: securityDefinitionsValidator,

        consumes: array().of(string()).optional().default(undefined),
        produces: array().of(string()).optional().default(undefined),
        collectionFormat: string().optional().default(undefined),
    });

    return validatorInstance;
}

export function extendSwaggerConfig(workingDir: string, conf: Specification.Config): Specification.Config {
    conf.version = conf.version || getPackageJsonStringValue(workingDir, 'version', '0.0.1');
    conf.name = conf.name || getPackageJsonStringValue(workingDir, 'name');
    conf.description = conf.description || getPackageJsonStringValue(workingDir, 'description');
    conf.license = conf.license || getPackageJsonStringValue(workingDir, 'license', 'MIT');
    conf.specification = Specification.SpecificationOption[conf.specification] || Specification.SpecificationOption.V2;

    return conf;
}
