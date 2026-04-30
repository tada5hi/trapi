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

declare module '@trapi/metadata' {
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

export type BasicSecurity = BaseSecurity & {
    type: typeof SecurityType.HTTP;
    scheme: 'basic';
};

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

export type SecurityDefinition = ApiKeySecurity | BasicSecurity | OAuth2Security;

export type SecurityDefinitions = {
    [key: string]: SecurityDefinition;
};
