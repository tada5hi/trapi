/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {RelationsParseOutput} from "../parameter";
import {Parameter, ParameterType, URLParameter} from "../type";
import {ParseParameterOptions, ParseParameterOutput} from "./parameter";

export type ParseOptionsBase<
    K extends ParameterType,
    A = string[]
> = (K extends Parameter.PAGINATION ? {} : {
    aliasMapping?: Record<string, string>,
    allowed?: A,
    defaultAlias?: string
}) & (K extends Parameter.RELATIONS | Parameter.PAGINATION ? {} : {
    relations?: RelationsParseOutput
});

//------------------------------------------------

export type ParseInput = {
    [K in Parameter | URLParameter]?: any
}

export type ParseOptions = {
    /**
     * On default all query keys are enabled.
     */
    [K in Parameter]?: ParseParameterOptions<K> | boolean
}

export type ParseOutput = {
    [K in Parameter]?: ParseParameterOutput<K>
}

export type ParseOutputElementBase<
    K extends Parameter,
    V extends unknown | undefined = undefined
    > = (K extends Parameter.PAGINATION ? {} : {
    key: string
}) & (K extends Parameter.RELATIONS ? {} : {
    alias?: string
}) & (K extends Parameter.FIELDS ? {
    value?: V
} : {
    value: V
});
