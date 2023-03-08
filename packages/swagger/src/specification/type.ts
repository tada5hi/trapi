/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat } from '@trapi/metadata';
import type { ParameterSourceV2 } from './v2';

export interface BaseSpec {
    info: Info;
    tags?: Tag[];
    externalDocs?: ExternalDocs;
}

export type Info = {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: Contact;
    license?: License;
};

type Contact = {
    name?: string;
    email?: string;
    url?: string;
};

type License = {
    name: string;
    url?: string;
};

type ExternalDocs = {
    url: string;
    description?: string;
};

type Tag = {
    name: string;
    description?: string;
    externalDocs?: ExternalDocs;
};

// ------------------------------------------------------

export interface BaseResponse {
    description: string;
}

// ------------------------------------------------------

export interface BaseOperation<P, R, S> {
    responses: { [name: string]: R };
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocs;
    operationId?: string;
    consumes?: string[];
    parameters?: P[];
    schemes?: string[];
    deprecated?: boolean;
    security?: S[];
    tags?: string[];
}

// ------------------------------------------------------

export interface Example {
    value: unknown | unknown[];
    summary?: string;
    description?: string;
}

// ------------------------------------------------------

export interface BaseSchema<T> {
    type?: DataType | any;
    format?: DataFormat;
    title?: string;
    description?: string;
    default?: string | boolean | number | any;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    enum?: Array<string | number | boolean>;
    'x-enum-varnames'?: string[];
    items?: T | BaseSchema<T> | any;
    additionalProperties?: boolean | { [ref: string]: string } | T;
    properties?: { [propertyName: string]: T };
    discriminator?: string;
    readOnly?: boolean;
    xml?: XML;
    externalDocs?: ExternalDocs;
    example?: { [exampleName: string]: Example } | unknown;
    required?: string[];
    $ref?: string;
}

interface XML {
    type?: string;
    namespace?: string;
    prefix?: string;
    attribute?: string;
    wrapped?: boolean;
}

export type DataType = 'void' | 'integer' | 'number' | 'boolean' | 'string' | 'array' | 'object' | 'file';
export type DataFormat = 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password';

// ------------------------------------------------------

export interface BaseParameter {
    name: string;
    in: `${ParameterSourceV2}`;
    required?: boolean;
    description?: string;
}

export interface BodyParameter extends BaseParameter {
    in: `${ParameterSourceV2.BODY}`;
}

export interface QueryParameter extends BaseParameter {
    in: `${ParameterSourceV2.QUERY}`;
    allowEmptyValue?: boolean;
    collectionFormat?: `${CollectionFormat}`;
}

export interface PathParameter extends BaseParameter {
    in: `${ParameterSourceV2.PATH}`;
}

export interface HeaderParameter extends BaseParameter {
    in: `${ParameterSourceV2.HEADER}`;
}

export interface FormDataParameter extends BaseParameter {
    in: `${ParameterSourceV2.FORM_DATA}`;
    collectionFormat?: `${CollectionFormat}`;
}

// ------------------------------------------------------

export interface Path<Operation, Parameter> {
    $ref?: string;
    get?: Operation;
    put?: Operation;
    post?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    patch?: Operation;
    parameters?: Parameter[];
}
