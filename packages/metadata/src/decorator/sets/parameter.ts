/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';
import type { DecoratorPropertyValueSchema } from './type';

export type DecoratorParamProperties = DecoratorPropertyValueSchema<string>;
export type DecoratorParamsProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorQueryProperties = {
    value?: string,
    options?: Record<string, any>
};

export type DecoratorFormProperties = DecoratorPropertyValueSchema<string>;

export type DecoratorBodyProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorHeaderProperties = DecoratorPropertyValueSchema<string>;
export type DecoratorHeadersProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorCookieProperties = DecoratorPropertyValueSchema<string>;
export type DecoratorCookiesProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorPathParamProperties = DecoratorPropertyValueSchema<string>;
export type DecoratorPathParamsProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorFileProperties = DecoratorPropertyValueSchema<string>;
export type DecoratorFilesParamProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorParameterSetID = `${DecoratorID.IS_INT}` |
    `${DecoratorID.IS_LONG}` |
    `${DecoratorID.IS_FLOAT}` |
    `${DecoratorID.IS_DOUBLE}` |
    `${DecoratorID.PARAM}` |
    `${DecoratorID.PARAMS}` |
    `${DecoratorID.QUERY}` |
    `${DecoratorID.FORM}` |
    `${DecoratorID.BODY}` |
    `${DecoratorID.HEADER}` |
    `${DecoratorID.HEADERS}` |
    `${DecoratorID.COOKIE}` |
    `${DecoratorID.COOKIES}` |
    `${DecoratorID.PATH}` |
    `${DecoratorID.PATHS}` |
    `${DecoratorID.FILE}` |
    `${DecoratorID.FILES}`;

export type DecoratorParameterSetProperties<T extends `${DecoratorID}`> =
    T extends `${DecoratorID.PARAM}` ?
        DecoratorParamProperties :
        T extends `${DecoratorID.PARAMS}` ?
            DecoratorParamsProperties :
            T extends `${DecoratorID.QUERY}` ?
                DecoratorQueryProperties :
                T extends `${DecoratorID.FORM}` ?
                    DecoratorFormProperties :
                    T extends `${DecoratorID.BODY}` ?
                        DecoratorBodyProperties :
                        T extends `${DecoratorID.HEADER}` ?
                            DecoratorHeaderProperties :
                            T extends `${DecoratorID.HEADERS}` ?
                                DecoratorHeadersProperties :
                                T extends `${DecoratorID.COOKIE}` ?
                                    DecoratorCookieProperties :
                                    T extends `${DecoratorID.COOKIES}` ?
                                        DecoratorCookiesProperties :
                                        T extends `${DecoratorID.PATH}` ?
                                            DecoratorPathParamProperties :
                                            T extends `${DecoratorID.PATHS}` ?
                                                DecoratorPathParamsProperties :
                                                T extends `${DecoratorID.FILE}` ?
                                                    DecoratorFileProperties :
                                                    T extends `${DecoratorID.FILES}` ?
                                                        DecoratorFilesParamProperties :
                                                        never;
