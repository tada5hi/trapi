/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ArrayType,
    BaseType,
    Config as DecoratorConfig,
    NestedObjectLiteralType,
    RefObjectType,
    ReferenceTypes,
} from '@trapi/decorator';
import { CompilerOptions } from 'typescript';
import { Cache } from './cache';

export {
    CompilerOptions,
};

export interface Config {
    /**
     * The entry point to your API.
     */
    entryFile: string | string[];

    /**
     * Directory to ignore during TypeScript files scan.
     * Default: []
     */
    ignore?: string[];

    /**
     * Directory to allow during TypeScript files scan.
     * Default: []
     */
    allow?: string[],

    /**
     * Directory to store and cache metadata cache files.
     * Default: false
     */
    cache?: string | boolean | Partial<Cache.Config>;

    /**
     * Decorator config.
     * Default: {
     *      library: ['decorators-express', 'typescript-rest'],
     *      internal: true
     * }
     */
    decorator?: DecoratorConfig;
}

/**
 * The output specification for metadata generation.
 */
export interface GeneratorOutput {
    /**
     * A Controller is a collection of grouped methods (GET, POST, ...)
     * for a common URL path (i.e /users) or an more explicit URL path (i.e. /users/:id).
     */
    controllers: Controller[];
    /**
     * ReferenceTypes is an object of found types (interfaces, type, ...),
     * and classes which were detected during code analysis.
     */
    referenceTypes: ReferenceTypes;
}

export interface Controller {
    /**
     * File Location of the Controller.
     */
    location: string;
    /**
     * Array of found method ( class functions )
     * for a specific controller (class)
     */
    methods: Method[];
    name: string;
    /**
     * The relative URL Path, i.e /users
     */
    path: string;
    /**
     * Allowed Content-Types to pass
     * data according the definition.
     *
     * i.e. ['application/json']
     */
    consumes: string[];
    /**
     * Possible Content-Types to receive
     * data according the definition.
     *
     * i.e. ['application/json']
     */
    produces: string[];
    responses: Response[];
    /**
     * Tags can be used to group controllers
     * by a name together.
     *
     * i.e. ['auth']
     */
    tags: string[];
    security?: Security[];
}

export interface Security {
    name: string;
    scopes?: string[];
}

export interface Method {
    operationId?: string;
    deprecated?: boolean;
    description: string;
    method: MethodType;
    extensions: Extension[];
    name: string;
    parameters: Parameter[];
    path: string;
    type: BaseType;
    tags: string[];
    responses: Response[];
    security?: Security[];
    summary?: string;
    consumes: string[];
    produces: string[];
    hidden: boolean;
}

export type MethodType = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch';

export interface Extension {
    key: string;
    value: ExtensionType | ExtensionType[];
}

export type ExtensionType =
    string
    | number
    | boolean
    | null
    | ExtensionType[]
    | { [name: string]: ExtensionType | ExtensionType[] };

export interface Parameter {
    parameterName: string;
    description: string;
    in: string;
    name: string;
    required: boolean;
    type: BaseType;
    collectionFormat?: 'csv' | 'multi' | 'pipes' | 'ssv' | 'tsv';
    allowEmptyValue?: boolean;
    default?: any;
    maxItems?: number;
    minItems?: number;
    deprecated?: boolean;

    example?: unknown[];
    validators?: Record<string, Validator>;
}

export interface ArrayParameter extends Parameter {
    type: ArrayType;
}

export interface Validator {
    value?: unknown,
    message?: string
}

export interface Response {
    description: string;
    examples?: unknown[] | unknown;
    headers?: NestedObjectLiteralType | RefObjectType;
    name: string;
    status: string;
    schema?: BaseType;
}
