/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildCookieConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.COOKIE,
        name: name || 'CookieParam',
        properties: {
            value: {},
        },
    };
}
export function buildCookiesConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.COOKIES,
        name: name || 'Cookies',
        properties: {
            value: {},
        },
    };
}
