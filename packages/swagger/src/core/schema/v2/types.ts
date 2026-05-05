/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat } from '@trapi/core';
import type { SecurityType } from '../../constants';
import type { ApiKeySecurity, BaseSecurity } from '../../types';
import type { DataFormatName, DataTypeName, TransferProtocol } from '../constants';
import type {
    BaseOperation,
    BaseResponse,
    BaseSchema,
    BaseSpec,
    BodyParameter,
    FormDataParameter,
    HeaderParameter,
    Path,
    PathParameter,
    QueryParameter,
} from '../types';

export type SpecV2 = BaseSpec & {
    swagger: '2.0';
    host?: string;
    basePath?: string;
    schemes?: string[];
    consumes?: string[];
    produces?: string[];
    paths: { [pathName: string]: Path<OperationV2, ResponseV2> };
    definitions?: { [definitionsName: string]: SchemaV2 };
    parameters?: { [parameterName: string]: ParameterV2 };
    responses?: { [responseName: string]: ResponseV2 };
    security?: SecurityV2[];
    securityDefinitions?: { [name: string]: SecurityV2 };
};

type PatternField = `x-${string}`;

export type BaseParameterV2 = {
    type?: `${DataTypeName}`;
    format?: `${DataFormatName}`;
    allowEmptyValue?: boolean,
    items?: Record<string, any>, // items object
    collectionFormat?: `${CollectionFormat}`,
    default?: any,
    maximum?: number,
    exclusiveMaximum?: number,
    minimum?: number,
    exclusiveMinimum?: number,
    maxLength?: number,
    minLength?: number,
    pattern?: string,
    maxItems?: number,
    minItems?: number,
    uniqueItems?: number,
    enum?: unknown[],
    multipleOf?: number,
};

export type BodyParameterV2 = BodyParameter & {
    schema: BaseSchema<SchemaV2>;
};

export type QueryParameterV2 = QueryParameter & BaseParameterV2;

export type PathParameterV2 = PathParameter & BaseParameterV2;

export type HeaderParameterV2 = HeaderParameter & BaseParameterV2;

export type FormDataParameterV2 = FormDataParameter & BaseParameterV2;

export type ParameterV2 = (
    BodyParameterV2 |
    QueryParameterV2 |
    PathParameterV2 |
    HeaderParameterV2 |
    FormDataParameterV2
) & { [key: PatternField]: any | undefined };

export type OperationV2 = BaseOperation<ParameterV2, ResponseV2> & {
    consumes?: string[],
    produces?: string[];
    schemes?: `${TransferProtocol}`[]
};

export type ResponseV2 = BaseResponse & {
    schema?: SchemaV2;
    headers?: { [headerName: string]: HeaderV2 };
    examples?: { [exampleName: string]: unknown };
};

export type HeaderV2 = {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
};

// Self-recursive: must remain `interface` because `type` aliases cannot reference
// themselves through an intersection.
export interface SchemaV2 extends BaseSchema<SchemaV2> {
    ['x-nullable']?: boolean;
    ['x-deprecated']?: boolean;
}

export type BasicSecurityV2 = BaseSecurity & {
    type: typeof SecurityType.BASIC;
};

export type BaseOAuthSecurityV2 = BaseSecurity & {
    type: typeof SecurityType.OAUTH2;
};

export type OAuth2ImplicitSecurityV2 = BaseOAuthSecurityV2 & {
    flow: 'implicit';
    authorizationUrl: string;
    scopes?: Record<string, string>;
};

export type OAuth2PasswordSecurityV2 = BaseOAuthSecurityV2 & {
    flow: 'password';
    tokenUrl: string;
    scopes?: Record<string, string>;
};

export type OAuth2ApplicationSecurityV2 = BaseOAuthSecurityV2 & {
    flow: 'application';
    tokenUrl: string;
    scopes?: Record<string, string>;
};

export type OAuth2AccessCodeSecurityV2 = BaseOAuthSecurityV2 & {
    flow: 'accessCode';
    tokenUrl: string;
    authorizationUrl: string;
    scopes?: Record<string, string>;
};

export type OAuth2SecurityV2 = OAuth2AccessCodeSecurityV2 |
OAuth2ApplicationSecurityV2 |
OAuth2ImplicitSecurityV2 |
OAuth2PasswordSecurityV2;

export type SecurityV2 =        BasicSecurityV2 |
        OAuth2SecurityV2 |
        ApiKeySecurity;
