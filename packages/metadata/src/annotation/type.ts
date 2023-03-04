/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// -------------------------------------------

import type { AnnotationKey } from './constants';
import type {
    AllAnnotation, ClassAnnotationData, ClassAnnotationKey,
    ClassPathAnnotation,

    DeleteAnnotation,
    DeprecatedAnnotation,

    ExtensionAnnotation,
    GetAnnotation,
    HeadAnnotation,
    HiddenAnnotation,
    IsDoubleAnnotation,
    IsFloatAnnotation,
    IsIntAnnotation,
    IsLongAnnotation, MethodAnnotationData, MethodAnnotationKey,
    MethodPathAnnotation, MixedAnnotationData, MixedAnnotationKey,
    OptionsAnnotation, ParameterAnnotationData, ParameterAnnotationKey,
    PatchAnnotation,
    PostAnnotation,
    PutAnnotation,
    RequestAcceptAnnotation, RequestAnnotationData, RequestAnnotationKey,
    RequestConsumesAnnotation, ResponseAnnotationData, ResponseAnnotationKey,

    ResponseDescriptionAnnotation,
    ResponseExampleAnnotation,
    ResponseProducesAnnotation,
    ServerBodyAnnotation,

    ServerContextAnnotation,
    ServerCookieAnnotation,
    ServerCookiesAnnotation,
    ServerFileAnnotation,
    ServerFilesAnnotation,
    ServerFormAnnotation,
    ServerHeaderAnnotation,
    ServerHeadersAnnotation,
    ServerParamAnnotation,
    ServerParamsAnnotation,
    ServerPathParamAnnotation,
    ServerPathParamsAnnotation,
    ServerQueryAnnotation,
    SwaggerTagsAnnotation,
} from './sets';

export type AnnotationData<T extends `${AnnotationKey}`> =
    T extends ClassAnnotationKey ?
        ClassAnnotationData<T> :
        T extends MethodAnnotationKey ?
            MethodAnnotationData<T> :
            T extends MixedAnnotationKey ?
                MixedAnnotationData<T> :
                T extends ParameterAnnotationKey ?
                    ParameterAnnotationData<T> :
                    T extends RequestAnnotationKey ?
                        RequestAnnotationData<T> :
                        T extends ResponseAnnotationKey ?
                            ResponseAnnotationData<T> :
                            never;

export type Annotation = SwaggerTagsAnnotation |
ClassPathAnnotation |

RequestAcceptAnnotation |
RequestConsumesAnnotation |

ResponseExampleAnnotation |
ResponseDescriptionAnnotation |
ResponseProducesAnnotation |
HiddenAnnotation |
ExtensionAnnotation |
MethodPathAnnotation |
DeprecatedAnnotation |
AllAnnotation |
GetAnnotation |
PostAnnotation |
PutAnnotation |
DeleteAnnotation |
PatchAnnotation |
OptionsAnnotation |
HeadAnnotation |

IsIntAnnotation |
IsLongAnnotation |
IsFloatAnnotation |
IsDoubleAnnotation |

ServerContextAnnotation |
ServerParamAnnotation |
ServerParamsAnnotation |
ServerQueryAnnotation |
ServerFormAnnotation |
ServerBodyAnnotation |
ServerHeaderAnnotation |
ServerHeadersAnnotation |
ServerCookieAnnotation |
ServerCookiesAnnotation |
ServerPathParamAnnotation |
ServerPathParamsAnnotation |
ServerFileAnnotation |
ServerFilesAnnotation;

// -------------------------------------------

export type RepresentationPropertyStrategy = 'merge' | 'none' | ((...items: unknown[] | unknown[][]) => unknown | unknown[]);

export type RepresentationPropertyConfig = {
    /**
     * Default: 'element'
     */
    type?: 'element' | 'array',

    /**
     * Default: false
     */
    isType?: boolean,

    /**
     * Default: 'argument'
     */
    srcArgumentType?: 'argument' | 'typeArgument',

    /**
     * Default: 0
     */
    srcPosition?: number,

    /**
     * Default: undefined
     */
    srcAmount?: number,

    /**
     * Default: 'none'
     */
    srcStrategy?: RepresentationPropertyStrategy
};

export type AnnotationRepresentationConfig<P extends Record<string, any>> = {
    [K in keyof P]: RepresentationPropertyConfig
};

// -------------------------------------------

export type AnnotationRepresentation<T extends `${AnnotationKey}` = `${AnnotationKey}`> = {
    key: T,
    id: string,
    properties?: AnnotationRepresentationConfig<AnnotationData<T>>
};

/**
 * This type maps a decorator ID to its representation config.
 */
export type AnnotationRepresentations = AnnotationRepresentation[];

export type MapperRepresentations = {
    [T in `${AnnotationKey}`]?: AnnotationRepresentation<T>[];
};
