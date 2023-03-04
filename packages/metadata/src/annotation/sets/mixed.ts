/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnnotationKey } from '../constants';

export type AnnotationDefaultData<T> = {
    value: T
};

export type HiddenAnnotation = {
    type: `${AnnotationKey.HIDDEN}`
};

export type ExtensionAnnotationData = {
    key: string,
    value: unknown | unknown[]
};

export type ExtensionAnnotation = {
    type: `${AnnotationKey.EXTENSION}`,
    data: ExtensionAnnotationData
};

export type DeprecatedAnnotation = {
    type: `${AnnotationKey.DEPRECATED}`,
};

export type MixedAnnotationKey = `${AnnotationKey.HIDDEN}` | `${AnnotationKey.EXTENSION}`;
export type MixedAnnotationData<T extends `${AnnotationKey}`> =
    T extends `${AnnotationKey.HIDDEN}` ?
        never :
        T extends `${AnnotationKey.EXTENSION}` ?
            ExtensionAnnotation['data'] :
            never;
