/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TypeChecker, TypeNode } from 'typescript';
import type {
    DecoratorHost,
    DecoratorSource,
    DecoratorTarget,
    Type,
    UnmatchedDecoratorReport,
} from '@trapi/core';

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
