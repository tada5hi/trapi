/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Type } from '../../../core/resolver/types';
import type {
    DecoratorArgument,
    DecoratorHost,
    DecoratorTypeArgument,
    JsDocSource,
} from './source';

export type HandlerContext = {
    host: DecoratorHost;
    argument: (index: number) => DecoratorArgument | undefined;
    arguments: () => DecoratorArgument[];
    typeArgument: (index: number) => DecoratorTypeArgument | undefined;
    typeArguments: () => DecoratorTypeArgument[];
    parameterType: () => Type | undefined;
};

export type JsDocHandlerContext = {
    host: DecoratorHost;
    source: JsDocSource;
    parameterType: () => Type | undefined;
};
