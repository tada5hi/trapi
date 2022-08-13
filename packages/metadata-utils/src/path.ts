/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function normalizePath(str: string) : string {
    // remove slashes
    str = str.replace(/^[/\\\s]+|[/\\\s]+$/g, '');

    str = str.replace(/([^:]\/)\/+/g, '$1');

    return str;
}

export function normalizePathParameters(str: string) : string {
    // <:id> -> {id}
    // todo: maybe escaping / is necessary
    str = str.replace(/<:([^/]+)>/g, '{$1}');

    // :id -> {id}
    str = str.replace(/:([^/]+)/g, '{$1}');

    // <id> -> {id}
    str = str.replace(/<([^/]+)>/g, '{$1}');

    return str;
}
