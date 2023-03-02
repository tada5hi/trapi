/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Specification,
} from '../type';

export namespace SpecificationV2 {
    export interface Spec extends Specification.BaseSpec {
        swagger: '2.0';
        host?: string;
        basePath?: string;
        schemes?: string[];
        consumes?: string[];
        produces?: string[];
        paths: { [pathName: string]: Specification.Path<Operation, Response> };
        definitions?: { [definitionsName: string]: Schema };
        parameters?: { [parameterName: string]: Schema | Specification.QueryParameter<Schema> };
        responses?: { [responseName: string]: Response };
        security?: Security[];
        securityDefinitions?: { [name: string]: Security };
    }

    export type Parameter = Omit<Specification.Parameter<Schema> & {'x-deprecated'?: boolean }, 'deprecated'>;

    export interface Operation extends Specification.BaseOperation<Parameter, Response, Security> {
        produces?: [string];
    }

    export interface Response extends Specification.BaseResponse {
        schema?: Schema;
        headers?: { [headerName: string]: Header };
        examples?: { [exampleName: string]: Specification.Example };
    }

    export interface Header {
        type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
    }

    // tslint:disable-next-line:no-shadowed-variable
    export interface Schema extends Specification.BaseSchema<Schema> {
        ['x-nullable']?: boolean;
        ['x-deprecated']?: boolean;
    }

    export interface BasicSecurity extends Specification.BaseSecurity {
        type: 'basic';
    }

    export interface BaseOAuthSecurity extends Specification.BaseSecurity {
        type: 'oauth2';
    }

    export interface OAuth2ImplicitSecurity extends BaseOAuthSecurity {
        flow: 'implicit';
        authorizationUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2PasswordSecurity extends BaseOAuthSecurity {
        flow: 'password';
        tokenUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2ApplicationSecurity extends BaseOAuthSecurity {
        flow: 'application';
        tokenUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2AccessCodeSecurity extends BaseOAuthSecurity {
        flow: 'accessCode';
        tokenUrl: string;
        authorizationUrl: string;
        scopes?: Record<string, string>;
    }

    export type OAuth2Security = OAuth2AccessCodeSecurity |
    OAuth2ApplicationSecurity |
    OAuth2ImplicitSecurity |
    OAuth2PasswordSecurity;

    export type Security =
        BasicSecurity |
        OAuth2Security |
        Specification.ApiKeySecurity;
}
