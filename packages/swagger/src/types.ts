/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SecurityType } from './constants';

export interface DocumentFormatData {
    path: string;
    name: string;
    content?: string;
}

export interface BaseSecurity {
    description?: string;
}

export interface ApiKeySecurity extends BaseSecurity {
    type: `${SecurityType.API_KEY}`;
    name: string;
    in: 'query' | 'header';
}

export interface BasicSecurity extends BaseSecurity {
    type: `${SecurityType.HTTP}`;
    schema: 'basic';
}

export interface OAuth2Security extends BaseSecurity {
    type: `${SecurityType.OAUTH2}`;
    flows: {
        implicit?: OAuth2ImplicitFlow,
        password?: OAuth2PasswordFlow,
        authorizationCode?: OAuth2AuthorizationCodeFlow,
        clientCredentials?: OAuth2ClientCredentialsFlow
    };
}

export interface Oauth2BaseFlow {
    scopes?: Record<string, string>;
    refreshUrl?: string;
}

export interface OAuth2ImplicitFlow extends Oauth2BaseFlow {
    authorizationUrl: string;
}

export interface OAuth2PasswordFlow extends Oauth2BaseFlow {
    tokenUrl: string;
}

export interface OAuth2AuthorizationCodeFlow extends Oauth2BaseFlow {
    authorizationUrl: string;
    tokenUrl: string;
}

export interface OAuth2ClientCredentialsFlow extends Oauth2BaseFlow {
    tokenUrl: string;
}

export type SecurityDefinition = ApiKeySecurity | BasicSecurity | OAuth2Security;

export interface SecurityDefinitions {
    [key: string]: SecurityDefinition;
}
