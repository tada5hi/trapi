/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import { matches, matchesJsDoc } from '../utils';
import type {
    DecoratorSource,
    HandlerContext,
    JsDocHandlerContext,
    JsDocMatch,
    JsDocSource,
    Match,
} from '../types';
import { buildDecoratorSources, buildJsDocSources } from '../typescript';
import type { ApplyHandlersOptions } from './types';

type DecoratorHandlerLike<D> = {
    match: Match;
    apply: (ctx: HandlerContext, draft: D) => void;
};

type JsDocHandlerLike<D> = {
    match: JsDocMatch;
    apply: (ctx: JsDocHandlerContext, draft: D) => void;
};

export function buildHandlerContext(
    source: DecoratorSource,
    options: ApplyHandlersOptions,
): HandlerContext {
    return {
        host: source.host,
        argument: (i) => source.arguments[i],
        arguments: () => source.arguments,
        typeArgument: (i) => source.typeArguments[i],
        typeArguments: () => source.typeArguments,
        parameterType: options.parameterType ?? (() => undefined),
    };
}

export function buildJsDocHandlerContext(
    source: JsDocSource,
    options: ApplyHandlersOptions,
): JsDocHandlerContext {
    return {
        host: source.host,
        source,
        parameterType: options.parameterType ?? (() => undefined),
    };
}

export function applyDecoratorHandlers<D>(
    node: Node,
    handlers: DecoratorHandlerLike<D>[],
    draft: D,
    options: ApplyHandlersOptions,
): void {
    if (handlers.length === 0 && !options.onUnmatchedDecorator) {
        return;
    }
    const sources = buildDecoratorSources(node, options);
    if (sources.length === 0) {
        return;
    }
    for (const source of sources) {
        let matched = 0;
        for (const handler of handlers) {
            if (matches(handler.match, source)) {
                handler.apply(buildHandlerContext(source, options), draft);
                matched += 1;
            }
        }
        if (matched === 0 && options.onUnmatchedDecorator) {
            // Prefer the decorator's own AST line if `buildDecoratorSources`
            // populated it; fall back to the host node's line otherwise.
            let file: string;
            let line: number;
            if (source.location) {
                file = source.location.file;
                line = source.location.line;
            } else {
                const sourceFile = node.getSourceFile();
                file = sourceFile.fileName;
                line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            }
            options.onUnmatchedDecorator(
                {
                    name: source.name,
                    target: source.target,
                    host: source.host,
                    file,
                    line,
                },
                source,
            );
        }
    }
}

export function applyJsDocHandlers<D>(
    node: Node,
    handlers: JsDocHandlerLike<D>[],
    draft: D,
    options: ApplyHandlersOptions,
): void {
    if (handlers.length === 0) {
        return;
    }
    const sources = buildJsDocSources(node, options);
    if (sources.length === 0) {
        return;
    }
    for (const source of sources) {
        for (const handler of handlers) {
            if (matchesJsDoc(handler.match, source)) {
                handler.apply(buildJsDocHandlerContext(source, options), draft);
            }
        }
    }
}
