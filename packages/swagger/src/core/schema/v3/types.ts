/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SecurityType } from '../../constants';
import type { ApiKeySecurity, BaseSecurity } from '../../types';
import type { DataFormatName, DataTypeName } from '../constants';
import type {
    BaseOperation,
    BaseResponse,
    BaseSchema,
    BaseSpec,
    BodyParameter,
    Example,
    FormDataParameter,
    HeaderParameter,
    Path,
    PathParameter,
    QueryParameter,
} from '../types';
import type { ParameterSourceV3 } from './constants';

export type SpecV3 = BaseSpec & {
    openapi: string;
    servers: ServerV3[];
    components: ComponentsV3;
    paths: PathsV3;
};

// Server
export type ServerV3 = {
    url: string;
    description?: string;
    variables?: Record<string, VariableV3>;
};

export type VariableV3 = {
    enum?: string[];
    description?: string;
    default: string;
};

// Components
export type ComponentsV3 = {
    callbacks?: { [name: string]: any };
    examples?: { [name: string]: Example | string };
    headers?: { [name: string]: any };
    links?: { [name: string]: any };
    parameters?: { [name: string]: ParameterV3 };
    requestBodies?: { [name: string]: any };
    responses?: { [name: string]: ResponseV3 };
    schemas?: { [name: string]: SchemaV3 };
    securitySchemes?: { [name: string]: SecurityV3 };
};

// Paths
export type PathsV3 = {
    [key: string] : Path<OperationV3, ParameterV3>;
};

export type BaseParameterV3 = {
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

    schema?: SchemaV3,
    example?: unknown;
    examples?: Record<string, Example | string>;

    // --------------------------------

    content?: Record<string, any>,
};

export type BodyParameterV3 = BodyParameter & BaseParameterV3;

export type CookieParameterV3 = BaseParameterV3 & {
    in: typeof ParameterSourceV3.COOKIE
};

export type QueryParameterV3 = QueryParameter & BaseParameterV3;

export type PathParameterV3 = PathParameter & BaseParameterV3;

export type HeaderParameterV3 = HeaderParameter & BaseParameterV3;

export type FormDataParameterV3 = FormDataParameter & BaseParameterV3;

type PatternFieldV3 = `x-${string}`;

export type ParameterV3 = (
    BodyParameterV3 |
    CookieParameterV3 |
    QueryParameterV3 |
    PathParameterV3 |
    HeaderParameterV3 |
    FormDataParameterV3
) & { [key: PatternFieldV3]: unknown };

export type OperationV3 = BaseOperation<ParameterV3, ResponseV3> & {
    requestBody?: RequestBodyV3;
    [key: string]: unknown;
};

export type ResponseV3 = BaseResponse & {
    content?: Record<string, {
        schema: SchemaV3,
        examples?: Record<string, Example>
    }>;
    headers?: { [name: string]: HeaderV3 };
};

export type HeaderV3 = Omit<BaseSchema<SchemaV3>, 'required'> & {
    required?: boolean;
    description?: string;
    example?: unknown;
    examples?: Record<string, Example | string>;
    schema: SchemaV3;
    type?: `${DataTypeName}`;
    format?: `${DataFormatName}`;
};

export type RequestBodyV3 = {
    content: { [name: string]: MediaTypeV3 };
    description?: string;
    required?: boolean;
};

export type MediaTypeV3 = {
    schema?: SchemaV3;
    example?: Example;
    examples?: Record<string, Example | string>;
    encoding?: { [name: string]: any };
};

// Self-recursive: must remain `interface` because `type` aliases cannot reference
// themselves through an intersection.
export interface SchemaV3 extends Omit<BaseSchema<SchemaV3>, 'discriminator'> {
    discriminator?: string | { propertyName: string; mapping?: Record<string, string> };
    nullable?: boolean;
    anyOf?: SchemaV3[];
    allOf?: SchemaV3[];
    oneOf?: SchemaV3[];
    deprecated?: boolean;
}

export type BasicSecurityV3 = BaseSecurity & {
    type: typeof SecurityType.HTTP;
    scheme: 'basic';
};

export type OAuth2SecurityV3 = BaseSecurity & {
    type: typeof SecurityType.OAUTH2;
    flows: {
        implicit?: OAuth2ImplicitFlowV3,
        password?: OAuth2PasswordFlowV3,
        authorizationCode?: OAuth2AuthorizationCodeFlowV3,
        clientCredentials?: OAuth2ClientCredentialsFlowV3
    };
};

export type Oauth2BaseFlowV3 = {
    scopes?: Record<string, string>;
    refreshUrl?: string;
};

export type OAuth2ImplicitFlowV3 = Oauth2BaseFlowV3 & {
    authorizationUrl: string;
};

export type OAuth2PasswordFlowV3 = Oauth2BaseFlowV3 & {
    tokenUrl: string;
};

export type OAuth2AuthorizationCodeFlowV3 = Oauth2BaseFlowV3 & {
    authorizationUrl: string;
    tokenUrl: string;
};

export type OAuth2ClientCredentialsFlowV3 = Oauth2BaseFlowV3 & {
    tokenUrl: string;
};

export type SecurityV3 =        BasicSecurityV3 |
        OAuth2SecurityV3 |
        ApiKeySecurity;
