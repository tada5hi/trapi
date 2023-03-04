/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnnotationKey } from '../constants';
import type { AnnotationDefaultData } from './mixed';

export type MethodPathAnnotation = {
    type: AnnotationKey.METHOD_PATH,
    data: AnnotationDefaultData<string | undefined>
};

export type AllAnnotation = {
    type: AnnotationKey.METHOD_ALL,
    data: AnnotationDefaultData<string | undefined>
};

export type GetAnnotation = {
    type: AnnotationKey.METHOD_GET,
    data: AnnotationDefaultData<string | undefined>
};

export type PostAnnotation = {
    type: AnnotationKey.METHOD_POST,
    data: AnnotationDefaultData<string | undefined>
};

export type PutAnnotation = {
    type: AnnotationKey.METHOD_PUT,
    data: AnnotationDefaultData<string | undefined>
};

export type DeleteAnnotation = {
    type: AnnotationKey.METHOD_DELETE,
    data: AnnotationDefaultData<string | undefined>
};

export type PatchAnnotation = {
    type: AnnotationKey.METHOD_PATCH,
    data: AnnotationDefaultData<string | undefined>
};

export type OptionsAnnotation = {
    type: AnnotationKey.METHOD_OPTIONS,
    data: AnnotationDefaultData<string | undefined>
};

export type HeadAnnotation = {
    type: AnnotationKey.METHOD_HEAD,
    data: AnnotationDefaultData<string | undefined>
};

export type MethodAnnotationKey = `${AnnotationKey.METHOD_ALL}` |
    `${AnnotationKey.METHOD_DELETE}` |
    `${AnnotationKey.METHOD_HEAD}` |
    `${AnnotationKey.METHOD_PATCH}` |
    `${AnnotationKey.METHOD_PATH}` |
    `${AnnotationKey.METHOD_POST}` |
    `${AnnotationKey.METHOD_PUT}` |
    `${AnnotationKey.METHOD_OPTIONS}`;

export type MethodAnnotationData<T extends MethodAnnotationKey> =
    T extends `${AnnotationKey.METHOD_ALL}` ?
        AllAnnotation['data'] :
        T extends `${AnnotationKey.METHOD_DELETE}` ?
            DeleteAnnotation['data'] :
            T extends `${AnnotationKey.METHOD_HEAD}` ?
                HeadAnnotation['data'] :
                T extends `${AnnotationKey.METHOD_PATCH}` ?
                    PatchAnnotation['data'] :
                    T extends `${AnnotationKey.METHOD_PATH}` ?
                        MethodPathAnnotation['data'] :
                        T extends `${AnnotationKey.METHOD_POST}` ?
                            PostAnnotation['data'] :
                            T extends `${AnnotationKey.METHOD_PUT}` ?
                                PutAnnotation['data'] :
                                T extends `${AnnotationKey.METHOD_OPTIONS}` ?
                                    OptionsAnnotation['data'] :
                                    never;
