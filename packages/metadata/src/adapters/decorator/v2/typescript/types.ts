/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TypeChecker, TypeNode } from 'typescript';
import type { Type } from '../../../../core/resolver/types';
import type { DecoratorHost, DecoratorTarget } from '../types';

export type DecoratorSourceBuilderOptions = {
    target: DecoratorTarget;
    host: DecoratorHost;
    resolveTypeNode: (node: TypeNode) => Type;
    typeChecker?: TypeChecker;
};

export type JsDocSourceBuilderOptions = {
    target: DecoratorTarget;
    host: DecoratorHost;
    resolveTypeNode: (node: TypeNode) => Type;
};
