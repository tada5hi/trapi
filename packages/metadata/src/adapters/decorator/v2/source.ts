/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Type } from '../../../core/resolver/types';

export type DecoratorTarget = 'class' | 'method' | 'parameter' | 'property';

export type DecoratorArgumentKind = 'literal' | 'object' | 'array' | 'identifier' | 'unresolvable';

export type DecoratorArgument = {
    raw: unknown;
    kind: DecoratorArgumentKind;
};

export type DecoratorTypeArgument = {
    resolve: () => Type;
};

export type DecoratorHost = {
    name: string;
    parentName?: string;
};

export type DecoratorSource = {
    name: string;
    arguments: DecoratorArgument[];
    typeArguments: DecoratorTypeArgument[];
    target: DecoratorTarget;
    host: DecoratorHost;
};

export type JsDocSource = {
    tag: string;
    text?: string;
    typeExpression?: {
        resolve: () => Type;
    };
    parameterName?: string;
    target: DecoratorTarget;
    host: DecoratorHost;
};
