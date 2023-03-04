/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnnotationKey } from '../constants';
import type { AnnotationDefaultData } from './mixed';

export type ResponseDescriptionAnnotationData = {
    type: unknown,
    statusCode: number | string,
    description: string,
    payload: unknown | unknown[]
};
export type ResponseDescriptionAnnotation = {
    type: `${AnnotationKey.RESPONSE_DESCRIPTION}`,
    data: ResponseDescriptionAnnotationData
};

export type ResponseExampleAnnotationData = {
    type: unknown,
    payload: unknown | unknown[]
};
export type ResponseExampleAnnotation = {
    type: `${AnnotationKey.RESPONSE_EXAMPLE}`,
    data: ResponseExampleAnnotationData
};

export type ResponseProducesAnnotationData = AnnotationDefaultData<string[]>;
export type ResponseProducesAnnotation = {
    type: `${AnnotationKey.RESPONSE_PRODUCES}`,
    data: ResponseProducesAnnotationData
};

export type ResponseAnnotationKey = `${AnnotationKey.RESPONSE_DESCRIPTION}` |
    `${AnnotationKey.RESPONSE_EXAMPLE}` |
    `${AnnotationKey.RESPONSE_PRODUCES}`;
export type ResponseAnnotationData<T extends ResponseAnnotationKey> =
    T extends `${AnnotationKey.RESPONSE_DESCRIPTION}` ?
        ResponseDescriptionAnnotation['data'] :
        T extends `${AnnotationKey.RESPONSE_EXAMPLE}` ?
            ResponseExampleAnnotation['data'] :
            T extends `${AnnotationKey.RESPONSE_PRODUCES}` ?
                ResponseProducesAnnotation['data'] :
                never;
