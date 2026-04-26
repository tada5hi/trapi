/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TypeChecker, TypeNode } from 'typescript';
import type { Type } from '../../../core/resolver/types';
import type { DecoratorHost, DecoratorSource, DecoratorTarget } from '../types';

/**
 * Reported when a decorator on a node has no matching handler in the
 * supplied registry. The orchestrator computes file/line from the host node
 * (1-based line number).
 */
export type UnmatchedDecoratorReport = {
    name: string;
    target: DecoratorTarget;
    host: DecoratorHost;
    file: string;
    line: number;
};

export type ApplyHandlersOptions = {
    target: DecoratorTarget;
    host: DecoratorHost;
    resolveTypeNode: (node: TypeNode) => Type;
    parameterType?: () => Type | undefined;
    typeChecker?: TypeChecker;
    /**
     * Optional reporter for decorator sources that no handler matched.
     * The orchestrator builds a {@link DecoratorSource} for every decorator
     * on the node; if iteration finishes without any handler claiming a
     * source, this callback fires once for that source.
     */
    onUnmatchedDecorator?: (report: UnmatchedDecoratorReport, source: DecoratorSource) => void;
};
