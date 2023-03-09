/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum DecoratorID {
    SWAGGER_TAGS = 'swaggerTags',
    CLASS_PATH = 'classPath',

    RESPONSE_DESCRIPTION = 'responseDescription',
    RESPONSE_EXAMPLE = 'responseExample',
    RESPONSE_PRODUCES = 'responseProduces',

    REQUEST_ACCEPT = 'requestAccept',
    REQUEST_CONSUMES = 'requestConsumes',

    DEPRECATED = 'deprecated',
    EXTENSION = 'extension',
    HIDDEN = 'hidden',
    SECURITY = 'security',

    METHOD_PATH = 'methodPath',

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
    PATH_PARAM = 'pathParam',
    PATH_PARAMS = 'pathParams',
    FILE_PARAM = 'fileParam',
    FILES_PARAM = 'filesParam',
}
