/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnnotationKey } from '../constants';
import type { AnnotationDefaultData } from './mixed';

export type SwaggerTagsAnnotationData = AnnotationDefaultData<string[]>;
export type SwaggerTagsAnnotation = {
    type: `${AnnotationKey.SWAGGER_TAGS}`,
    data: SwaggerTagsAnnotationData
};

export type ClassPathAnnotationData = AnnotationDefaultData<string>;
export type ClassPathAnnotation = {
    type: `${AnnotationKey.CLASS_PATH}`,
    data: ClassPathAnnotationData,
};

export type ClassAnnotation = SwaggerTagsAnnotation |
ClassPathAnnotation;
export type ClassAnnotationKey = `${AnnotationKey.SWAGGER_TAGS}` | `${AnnotationKey.CLASS_PATH}`;
export type ClassAnnotationData<T extends ClassAnnotationKey> =
    T extends `${AnnotationKey.SWAGGER_TAGS}` ?
        SwaggerTagsAnnotation['data'] :
        T extends `${AnnotationKey.CLASS_PATH}` ?
            ClassPathAnnotation['data'] :
            never;
