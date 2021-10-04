/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {RelationsParseOutput} from "../parameter";
import {
    ParameterFieldsType,
    ParameterPaginationType,
    ParameterRelationsType,
    ParameterType,
    URLParameterType
} from "../type";
import {ParseParameterOptions, ParseParameterOutput} from "./parameter";

export type ParseOptionsBase<
    K extends ParameterType,
    A = string[]
> = (K extends ParameterPaginationType ? {} : {
    aliasMapping?: Record<string, string>,
    allowed?: A,
    defaultAlias?: string
}) & (K extends ParameterRelationsType | ParameterPaginationType ? {} : {
    relations?: RelationsParseOutput
});

//------------------------------------------------

export type ParseInput = {
    [K in ParameterType | URLParameterType]?: any
}

export type ParseOptions = {
    /**
     * On default all query keys are enabled.
     */
    [K in ParameterType]?: ParseParameterOptions<K> | boolean
}

export type ParseOutput = {
    [K in ParameterType]?: ParseParameterOutput<K>
}

export type ParseOutputElementBase<
    K extends ParameterType,
    V extends unknown | undefined = undefined
    > =
        (K extends ParameterPaginationType ? {} : {
            key: string
        }) & (K extends ParameterRelationsType ? {} : {
            alias?: string
        }) & (K extends ParameterFieldsType ? {
            value?: V
        } : {
            value: V
        });
