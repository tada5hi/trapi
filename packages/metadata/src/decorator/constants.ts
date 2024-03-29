/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum DecoratorID {
    CONTROLLER = 'controller',

    DESCRIPTION = 'description',
    EXAMPLE = 'example',
    PRODUCES = 'produces',

    ACCEPT = 'accept',
    CONSUMES = 'consumes',

    DEPRECATED = 'deprecated',
    EXTENSION = 'extension',
    HIDDEN = 'hidden',
    SECURITY = 'security',
    TAGS = 'tags',

    MOUNT = 'mount',

    ALL = 'all',
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    OPTIONS = 'options',
    HEAD = 'head',

    // Parameter
    IS_INT = 'isInt',
    IS_LONG = 'isLong',
    IS_FLOAT = 'isFloat',
    IS_DOUBLE = 'isDouble',

    // Parameter Server
    CONTEXT = 'context',
    PARAM = 'param',
    PARAMS = 'params',
    QUERY = 'query',
    FORM = 'form',
    BODY = 'body',
    HEADER = 'header',
    HEADERS = 'headers',
    COOKIE = 'cookie',
    COOKIES = 'cookies',
    PATH = 'path',
    PATHS = 'paths',
    FILE = 'file',
    FILES = 'files',
}
