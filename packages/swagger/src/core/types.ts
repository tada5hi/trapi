/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SecurityType } from './constants';

export type ValidatorOpenApiMeta = { kind: 'keyword'; key: string } |
    { kind: 'format'; format: string } |
    { kind: 'ignore' };

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
