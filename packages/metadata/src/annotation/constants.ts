/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum AnnotationKey {
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

    METHOD_PATH = 'methodPath',

    METHOD_ALL = 'all',
    METHOD_GET = 'get',
    METHOD_POST = 'post',
    METHOD_PUT = 'put',
    METHOD_DELETE = 'delete',
    METHOD_PATCH = 'patch',
    METHOD_OPTIONS = 'options',
    METHOD_HEAD = 'head',

    // Parameter
    IS_INT = 'isInt',
    IS_LONG = 'isLong',
    IS_FLOAT = 'isFloat',
    IS_DOUBLE = 'isDouble',

    // Parameter Server
    SERVER_CONTEXT = 'serverContext',
    SERVER_PARAM = 'serverParam',
    SERVER_PARAMS = 'serverParams',
    SERVER_QUERY = 'serverQuery',
    SERVER_FORM = 'serverForm',
    SERVER_BODY = 'serverBody',
    SERVER_HEADER = 'serverHeader',
    SERVER_HEADERS = 'serverHeaders',
    SERVER_COOKIE = 'serverCookie',
    SERVER_COOKIES = 'serverCookies',
    SERVER_PATH_PARAM = 'serverPathParam',
    SERVER_PATH_PARAMS = 'serverPathParams',
    SERVER_FILE_PARAM = 'serverFileParam',
    SERVER_FILES_PARAM = 'serverFilesParam',
}
