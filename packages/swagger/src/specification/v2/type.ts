/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat } from '@trapi/metadata';
import type { SecurityType } from '../../constants';
import type { ApiKeySecurity, BaseSecurity } from '../../type';
import type { TransferProtocol } from '../constants';
import type {
    BaseOperation,
    BaseResponse,
    BaseSchema,
    BaseSpec,
    BodyParameter,
    DataFormat,
    DataType,
    Example, FormDataParameter,
    HeaderParameter,
    Path,
    PathParameter,
    QueryParameter,
} from '../type';

export namespace SpecificationV2 {
    export interface SpecV2 extends BaseSpec {
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
    }

    type PatternField = `x-${string}`;

    export interface BaseParameterV2 {
        type?: DataType;
        format?: DataFormat;
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
    }

    export interface BodyParameterV2 extends BodyParameter {
        schema: BaseSchema<SchemaV2>;
    }

    export interface QueryParameterV2 extends QueryParameter, BaseParameterV2 {

    }

    export interface PathParameterV2 extends PathParameter, BaseParameterV2 {

    }

    export interface HeaderParameterV2 extends HeaderParameter, BaseParameterV2 {

    }

    export interface FormDataParameterV2 extends FormDataParameter, BaseParameterV2 {

    }

    export type ParameterV2 = (
        BodyParameterV2 |
        QueryParameterV2 |
        PathParameterV2 |
        HeaderParameterV2 |
        FormDataParameterV2
    ) & { [key: PatternField]: any | undefined };

    export interface OperationV2 extends BaseOperation<ParameterV2, ResponseV2> {
        consumes?: string[],
        produces?: string[];
        schemes?: `${TransferProtocol}`[]
    }

    export interface ResponseV2 extends BaseResponse {
        schema?: SchemaV2;
        headers?: { [headerName: string]: HeaderV2 };
        examples?: { [exampleName: string]: unknown };
    }

    export interface HeaderV2 {
        type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
    }

    // tslint:disable-next-line:no-shadowed-variable
    export interface SchemaV2 extends BaseSchema<SchemaV2> {
        ['x-nullable']?: boolean;
        ['x-deprecated']?: boolean;
    }

    export interface BasicSecurityV2 extends BaseSecurity {
        type: `${SecurityType.BASIC}`;
    }

    export interface BaseOAuthSecurityV2 extends BaseSecurity {
        type: `${SecurityType.OAUTH2}`;
    }

    export interface OAuth2ImplicitSecurityV2 extends BaseOAuthSecurityV2 {
        flow: 'implicit';
        authorizationUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2PasswordSecurityV2 extends BaseOAuthSecurityV2 {
        flow: 'password';
        tokenUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2ApplicationSecurityV2 extends BaseOAuthSecurityV2 {
        flow: 'application';
        tokenUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2AccessCodeSecurityV2 extends BaseOAuthSecurityV2 {
        flow: 'accessCode';
        tokenUrl: string;
        authorizationUrl: string;
        scopes?: Record<string, string>;
    }

    export type OAuth2SecurityV2 = OAuth2AccessCodeSecurityV2 |
    OAuth2ApplicationSecurityV2 |
    OAuth2ImplicitSecurityV2 |
    OAuth2PasswordSecurityV2;

    export type SecurityV2 =
        BasicSecurityV2 |
        OAuth2SecurityV2 |
        ApiKeySecurity;
}
