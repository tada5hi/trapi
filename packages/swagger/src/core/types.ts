/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SecurityType, Version } from './constants';
import type { SpecV2, SpecV3 } from './schema';

export type ValidatorOpenApiMeta = { kind: 'keyword'; key: string } |
    { kind: 'format'; format: string } |
    { kind: 'ignore' };

/**
 * Resolves the OpenAPI specification output type for a given `Version`.
 *
 * Use this to type wrapper functions around `generateSwagger()` whose return
 * type depends on the requested `Version`:
 *
 * ```ts
 * type GeneratorOutput<V extends `${Version}`> = OutputForVersion<V>;
 * ```
 *
 * Internally `Version.V2` resolves to `SpecV2`; everything else resolves to
 * `SpecV3` (which models OpenAPI 3.0, 3.1, and 3.2 — they share a schema).
 */
export type OutputForVersion<V extends `${Version}`> = V extends typeof Version.V2 ?
    SpecV2 :
    SpecV3;

declare module '@trapi/core' {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public contract.
    interface ValidatorMeta {
        openApi?: ValidatorOpenApiMeta;
    }
}

export type DocumentFormatData = {
    path: string;
    name: string;
    content?: string;
};

export type BaseSecurity = {
    description?: string;
};

export type ApiKeySecurity = BaseSecurity & {
    type: typeof SecurityType.API_KEY;
    name: string;
    in: 'query' | 'header';
};

type HttpSecurityBase = BaseSecurity & {
    type: typeof SecurityType.HTTP;
};

export type BasicSecurity = HttpSecurityBase & {
    scheme: 'basic';
    bearerFormat?: never;
};

export type BearerSecurity = HttpSecurityBase & {
    scheme: 'bearer';
    /**
     * How the bearer token is formatted, e.g. `JWT`. Documentation only.
     */
    bearerFormat?: string;
};

/**
 * Any other scheme of the IANA HTTP Authentication Scheme Registry, e.g.
 * `digest`. `bearerFormat` belongs to the bearer scheme only.
 */
export type OtherHttpSecurity = HttpSecurityBase & {
    scheme: 'basic' | 'bearer' | (string & {});
    bearerFormat?: never;
};

/**
 * An HTTP authentication scheme (OpenAPI 3 `type: 'http'`).
 *
 * OpenAPI 3 emits it as given. Swagger 2.0 has only `basic`: every other
 * scheme is emitted there as an API key in the `Authorization` header.
 */
export type HttpSecurity = BasicSecurity | BearerSecurity | OtherHttpSecurity;

export type OAuth2Security = BaseSecurity & {
    type: typeof SecurityType.OAUTH2;
    flows: {
        implicit?: OAuth2ImplicitFlow,
        password?: OAuth2PasswordFlow,
        authorizationCode?: OAuth2AuthorizationCodeFlow,
        clientCredentials?: OAuth2ClientCredentialsFlow
    };
};

export type Oauth2BaseFlow = {
    scopes?: Record<string, string>;
    refreshUrl?: string;
};

export type OAuth2ImplicitFlow = Oauth2BaseFlow & {
    authorizationUrl: string;
};

export type OAuth2PasswordFlow = Oauth2BaseFlow & {
    tokenUrl: string;
};

export type OAuth2AuthorizationCodeFlow = Oauth2BaseFlow & {
    authorizationUrl: string;
    tokenUrl: string;
};

export type OAuth2ClientCredentialsFlow = Oauth2BaseFlow & {
    tokenUrl: string;
};

export type SecurityDefinition = ApiKeySecurity | HttpSecurity | OAuth2Security;

export type SecurityDefinitions = {
    [key: string]: SecurityDefinition;
};
