/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Example, Response, Security } from '../../../core/generator/types';
import type { Extension } from '../../../core/resolver/extension';
import type { BaseType, Type } from '../../../core/resolver/types';
import type { Validator } from '../../../core/validator/types';
import type { MethodType } from '../../../core/method/types';
import type { CollectionKindValue, ParamKindValue } from './constants';

export type ControllerDraft = {
    name: string;
    location: string;
    path?: string;
    hidden: boolean;
    consumes: string[];
    produces: string[];
    tags: string[];
    responses: Response[];
    security: Security[];
    extensions: Extension[];
};

export type MethodDraft = {
    name: string;
    verb?: MethodType;
    path: string;
    operationId?: string;
    description: string;
    summary?: string;
    deprecated?: boolean;
    hidden: boolean;
    consumes: string[];
    produces: string[];
    tags: string[];
    responses: Response[];
    security: Security[];
    extensions: Extension[];
    parameters: ParameterDraft[];
    type?: BaseType;
};

export type ParameterDraft = {
    parameterName: string;
    name: string;
    in?: ParamKindValue;
    description: string;
    required: boolean;
    type?: Type;
    collectionFormat?: CollectionKindValue;
    allowEmptyValue?: boolean;
    default?: unknown;
    maxItems?: number;
    minItems?: number;
    deprecated?: boolean;
    examples: Example[];
    exampleLabels: string[];
    extensions: Extension[];
    validators: Record<string, Validator>;
};

export function newControllerDraft(input: Pick<ControllerDraft, 'name' | 'location'>): ControllerDraft {
    return {
        name: input.name,
        location: input.location,
        hidden: false,
        consumes: [],
        produces: [],
        tags: [],
        responses: [],
        security: [],
        extensions: [],
    };
}

export function newMethodDraft(input: Pick<MethodDraft, 'name'>): MethodDraft {
    return {
        name: input.name,
        path: '',
        description: '',
        hidden: false,
        consumes: [],
        produces: [],
        tags: [],
        responses: [],
        security: [],
        extensions: [],
        parameters: [],
    };
}

export function newParameterDraft(input: Pick<ParameterDraft, 'parameterName'>): ParameterDraft {
    return {
        parameterName: input.parameterName,
        name: input.parameterName,
        description: '',
        required: true,
        examples: [],
        exampleLabels: [],
        extensions: [],
        validators: {},
    };
}
