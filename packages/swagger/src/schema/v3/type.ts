/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SecurityType } from '../../constants';
import type { ApiKeySecurity, BaseSecurity } from '../../type';
import type {
    BaseOperation, BaseResponse,
    BaseSchema, BaseSpec, BodyParameter, DataFormat, DataType, Example,
    FormDataParameter, HeaderParameter, Path, PathParameter, QueryParameter,
} from '../type';
import type { ParameterSourceV3 } from './constants';

export interface SpecV3 extends BaseSpec {
    openapi: string;
    servers: ServerV3[];
    components: ComponentsV3;
    paths: PathsV3;
}

// Server
export interface ServerV3 {
    url: string;
    description?: string;
    variables?: Record<string, VariableV3>;
}

export interface VariableV3 {
    enum?: string[];
    description?: string;
    default: string;
}

// Components
export interface ComponentsV3 {
    callbacks?: { [name: string]: any };
    examples?: { [name: string]: Example | string };
    headers?: { [name: string]: any };
    links?: { [name: string]: any };
    parameters?: { [name: string]: ParameterV3 };
    requestBodies?: { [name: string]: any };
    responses?: { [name: string]: ResponseV3 };
    schemas?: { [name: string]: SchemaV3 };
    securitySchemes?: { [name: string]: SecurityV3 };
}

// Paths
export interface PathsV3 {
    [key: string] : Path<OperationV3, ParameterV3>;
}

export interface BaseParameterV3 {
    /**
         * Default: false
         */
    deprecated?: boolean,
    /**
         * Default: false
         */
    allowEmptyValue?: boolean

    // --------------------------------

    style?: string,
    explode?: boolean,
    allowReserved?: boolean,

    schema?: BaseSchema<SchemaV3>,
    example?: unknown;
    examples?: Record<string, Example | string>;

    // --------------------------------

    content?: Record<string, any>,
}

export interface BodyParameterV3 extends BodyParameter, BaseParameterV3 {

}

export interface CookieParameterV3 extends BaseParameterV3 {
    in: `${ParameterSourceV3.COOKIE}`
}

export interface QueryParameterV3 extends QueryParameter, BaseParameterV3 {

}

export interface PathParameterV3 extends PathParameter, BaseParameterV3 {

}

export interface HeaderParameterV3 extends HeaderParameter, BaseParameterV3 {

}

export interface FormDataParameterV3 extends FormDataParameter, BaseParameterV3 {

}

export type ParameterV3 = BodyParameterV3 |
CookieParameterV3 |
QueryParameterV3 |
PathParameterV3 |
HeaderParameterV3 |
FormDataParameterV3;

export interface OperationV3 extends BaseOperation<ParameterV3, ResponseV3> {
    requestBody?: RequestBodyV3;
    [key: string]: unknown;
}

export interface ResponseV3 extends BaseResponse {
    content?: Record<string, {
        schema: SchemaV3,
        examples?: Record<string, Example>
    }>;
    headers?: { [name: string]: HeaderV3 };
}

export interface HeaderV3 extends Omit<BaseSchema<SchemaV3>, 'required'> {
    required?: boolean;
    description?: string;
    example?: unknown;
    examples?: Record<string, Example | string>;
    schema: BaseSchema<SchemaV3>;
    type?: DataType;
    format?: DataFormat;
}

export interface RequestBodyV3 {
    content: { [name: string]: MediaTypeV3 };
    description?: string;
    required?: boolean;
}

export interface MediaTypeV3 {
    schema?: SchemaV3;
    example?: Example;
    examples?: Record<string, Example | string>;
    encoding?: { [name: string]: any };
}

// tslint:disable-next-line:no-shadowed-variable
export interface SchemaV3 extends BaseSchema<SchemaV3> {
    nullable?: boolean;
    anyOf?: SchemaV3[];
    allOf?: SchemaV3[];
    deprecated?: boolean;
}

// tslint:disable-next-line:no-shadowed-variable
export interface BasicSecurityV3 extends BaseSecurity {
    type: `${SecurityType.HTTP}`;
    schema: 'basic';
}

export interface OAuth2SecurityV3 extends BaseSecurity {
    type: `${SecurityType.OAUTH2}`;
    flows: {
        implicit?: OAuth2ImplicitFlowV3,
        password?: OAuth2PasswordFlowV3,
        authorizationCode?: OAuth2AuthorizationCodeFlowV3,
        clientCredentials?: OAuth2ClientCredentialsFlowV3
    };
}

export interface Oauth2BaseFlowV3 {
    scopes?: Record<string, string>;
    refreshUrl?: string;
}

export interface OAuth2ImplicitFlowV3 extends Oauth2BaseFlowV3 {
    authorizationUrl: string;
}

export interface OAuth2PasswordFlowV3 extends Oauth2BaseFlowV3 {
    tokenUrl: string;
}

export interface OAuth2AuthorizationCodeFlowV3 extends Oauth2BaseFlowV3 {
    authorizationUrl: string;
    tokenUrl: string;
}

export interface OAuth2ClientCredentialsFlowV3 extends Oauth2BaseFlowV3 {
    tokenUrl: string;
}

export type SecurityV3 =
        BasicSecurityV3 |
        OAuth2SecurityV3 |
        ApiKeySecurity;
