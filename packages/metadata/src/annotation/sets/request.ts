/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnnotationKey } from '../constants';
import type { AnnotationDefaultData } from './mixed';

export type RequestAcceptAnnotation = {
    type: `${AnnotationKey.REQUEST_ACCEPT}`,
};

export type RequestConsumesAnnotationData = AnnotationDefaultData<string[]>;
export type RequestConsumesAnnotation = {
    type: AnnotationKey.REQUEST_CONSUMES,
    data: RequestConsumesAnnotationData
};

export type RequestAnnotationKey = `${AnnotationKey.REQUEST_ACCEPT}` |
    `${AnnotationKey.REQUEST_CONSUMES}`;

export type RequestAnnotationData<T extends RequestAnnotationKey> =
    T extends `${AnnotationKey.REQUEST_ACCEPT}` ?
        never :
        T extends `${AnnotationKey.REQUEST_CONSUMES}` ?
            RequestConsumesAnnotation['data'] :
            never;
