/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnnotationKey } from '../constants';
import type { AnnotationDefaultData } from './mixed';

export type IsIntAnnotation = {
    type: AnnotationKey.IS_INT
};

export type IsLongAnnotation = {
    type: AnnotationKey.IS_LONG
};

export type IsFloatAnnotation = {
    type: AnnotationKey.IS_FLOAT
};

export type IsDoubleAnnotation = {
    type: AnnotationKey.IS_DOUBLE
};

export type ServerContextAnnotation = {
    type: AnnotationKey.SERVER_CONTEXT
};

export type ServerParamAnnotation = {
    type: AnnotationKey.SERVER_PARAM,
    data: AnnotationDefaultData<string>
};

export type ServerParamsAnnotation = {
    type: AnnotationKey.SERVER_PARAMS,
    data: AnnotationDefaultData<string | undefined>
};

export type ServerQueryAnnotation = {
    type: AnnotationKey.SERVER_QUERY,
    data: {
        value?: string,
        options?: Record<string, any>
    }
};

export type ServerFormAnnotation = {
    type: AnnotationKey.SERVER_FORM,
    data: AnnotationDefaultData<string>
};

export type ServerBodyAnnotation = {
    type: AnnotationKey.SERVER_CONTEXT,
    data: AnnotationDefaultData<string | undefined>
};

export type ServerHeaderAnnotation = {
    type: AnnotationKey.SERVER_HEADER,
    data: AnnotationDefaultData<string | undefined>
};
export type ServerHeadersAnnotation = {
    type: AnnotationKey.SERVER_HEADERS,
    data: AnnotationDefaultData<string | undefined>
};

export type ServerCookieAnnotation = {
    type: AnnotationKey.SERVER_COOKIE,
    data: AnnotationDefaultData<string>
};

export type ServerCookiesAnnotation = {
    type: AnnotationKey.SERVER_COOKIES,
    data: AnnotationDefaultData<string | undefined>
};

export type ServerPathParamAnnotation = {
    type: AnnotationKey.SERVER_PATH_PARAM,
    data: AnnotationDefaultData<string>
};

export type ServerPathParamsAnnotation = {
    type: AnnotationKey.SERVER_PATH_PARAMS,
    data: AnnotationDefaultData<string | undefined>
};

export type ServerFileAnnotation = {
    type: AnnotationKey.SERVER_FILE_PARAM,
    data: AnnotationDefaultData<string>
};

export type ServerFilesAnnotation = {
    type: AnnotationKey.SERVER_FILES_PARAM,
    data: AnnotationDefaultData<string | undefined>
};

export type ParameterAnnotationKey = `${AnnotationKey.IS_INT}` |
    `${AnnotationKey.IS_LONG}` |
    `${AnnotationKey.IS_FLOAT}` |
    `${AnnotationKey.IS_DOUBLE}` |
    `${AnnotationKey.SERVER_PARAM}` |
    `${AnnotationKey.SERVER_PARAMS}` |
    `${AnnotationKey.SERVER_QUERY}` |
    `${AnnotationKey.SERVER_FORM}` |
    `${AnnotationKey.SERVER_BODY}` |
    `${AnnotationKey.SERVER_HEADER}` |
    `${AnnotationKey.SERVER_HEADERS}` |
    `${AnnotationKey.SERVER_COOKIE}` |
    `${AnnotationKey.SERVER_COOKIES}` |
    `${AnnotationKey.SERVER_PATH_PARAM}` |
    `${AnnotationKey.SERVER_PATH_PARAMS}` |
    `${AnnotationKey.SERVER_FILE_PARAM}` |
    `${AnnotationKey.SERVER_FILES_PARAM}`;

export type ParameterAnnotationData<T extends `${AnnotationKey}`> =
    T extends `${AnnotationKey.SERVER_PARAM}` ?
        ServerParamAnnotation['data'] :
        T extends `${AnnotationKey.SERVER_PARAMS}` ?
            ServerParamsAnnotation['data'] :
            T extends `${AnnotationKey.SERVER_QUERY}` ?
                ServerQueryAnnotation['data'] :
                T extends `${AnnotationKey.SERVER_FORM}` ?
                    ServerFormAnnotation['data'] :
                    T extends `${AnnotationKey.SERVER_BODY}` ?
                        ServerBodyAnnotation['data'] :
                        T extends `${AnnotationKey.SERVER_HEADER}` ?
                            ServerHeaderAnnotation['data'] :
                            T extends `${AnnotationKey.SERVER_HEADERS}` ?
                                ServerHeadersAnnotation['data'] :
                                T extends `${AnnotationKey.SERVER_COOKIE}` ?
                                    ServerCookieAnnotation['data'] :
                                    T extends `${AnnotationKey.SERVER_COOKIES}` ?
                                        ServerCookiesAnnotation['data'] :
                                        T extends `${AnnotationKey.SERVER_PATH_PARAM}` ?
                                            ServerPathParamAnnotation['data'] :
                                            T extends `${AnnotationKey.SERVER_PATH_PARAMS}` ?
                                                ServerPathParamsAnnotation['data'] :
                                                T extends `${AnnotationKey.SERVER_FILE_PARAM}` ?
                                                    ServerFileAnnotation['data'] :
                                                    T extends `${AnnotationKey.SERVER_FILES_PARAM}` ?
                                                        ServerFilesAnnotation['data'] :
                                                        never;
