/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat } from '@trapi/metadata';
import type { SpecificationParameterSource } from '../constants';

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
    enum?: Array<string | number>;
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

interface BaseParameter<T> {
    name: string;
    in: `${SpecificationParameterSource}`;
    required?: boolean;
    description?: string;
    example?: unknown;
    examples?: Record<string, Example | string>;
    schema: BaseSchema<T>;
    type?: DataType;
    format?: DataFormat;
    deprecated?: boolean;
}

interface BodyParameter<T> extends BaseParameter<T> {
    in: `${SpecificationParameterSource.BODY}`;
}

interface QueryParameter<T> extends BaseParameter<T> {
    in: `${SpecificationParameterSource.QUERY}`;
    allowEmptyValue?: boolean;
    collectionFormat?: `${CollectionFormat}`;
}

interface PathParameter<T> extends BaseParameter<T> {
    in: `${SpecificationParameterSource.PATH}`;
}

interface HeaderParameter<T> extends BaseParameter<T> {
    in: `${SpecificationParameterSource.HEADER}`;
}

interface FormDataParameter<T> extends BaseParameter<T> {
    in: `${SpecificationParameterSource.FORM_DATA}`;
    collectionFormat?: `${CollectionFormat}`;
}

export type SpecificationParameter<T> =
    BodyParameter<T> |
    FormDataParameter<T> |
    QueryParameter<T> |
    PathParameter<T> |
    HeaderParameter<T>;

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
