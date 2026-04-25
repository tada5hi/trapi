/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TypeChecker, TypeNode } from 'typescript';
import type { Type } from '../../../../core/resolver/types';
import type { DecoratorHost, DecoratorTarget } from '../types';

export type ApplyHandlersOptions = {
    target: DecoratorTarget;
    host: DecoratorHost;
    resolveTypeNode: (node: TypeNode) => Type;
    parameterType?: () => Type | undefined;
    typeChecker?: TypeChecker;
};
