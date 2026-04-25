/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ControllerDraft, MethodDraft, ParameterDraft } from './draft';
import type { HandlerContext, JsDocHandlerContext } from './context';
import type { DecoratorTarget } from './source';

export type Match = {
    name: string;
    on?: DecoratorTarget;
};

export type ReplacesPolicy = true | string;

type HandlerBase = {
    match: Match;
    replaces?: ReplacesPolicy;
};

export type ControllerHandler = HandlerBase & {
    apply: (ctx: HandlerContext, draft: ControllerDraft) => void;
};

export type MethodHandler = HandlerBase & {
    apply: (ctx: HandlerContext, draft: MethodDraft) => void;
};

export type ParameterHandler = HandlerBase & {
    apply: (ctx: HandlerContext, draft: ParameterDraft) => void;
};

export type JsDocMatch = {
    tag: string;
    on?: DecoratorTarget;
};

type JsDocHandlerBase = {
    match: JsDocMatch;
    replaces?: ReplacesPolicy;
};

export type ControllerJsDocHandler = JsDocHandlerBase & {
    apply: (ctx: JsDocHandlerContext, draft: ControllerDraft) => void;
};

export type MethodJsDocHandler = JsDocHandlerBase & {
    apply: (ctx: JsDocHandlerContext, draft: MethodDraft) => void;
};

export type ParameterJsDocHandler = JsDocHandlerBase & {
    apply: (ctx: JsDocHandlerContext, draft: ParameterDraft) => void;
};

export type AnyDecoratorHandler = ControllerHandler | MethodHandler | ParameterHandler;

export type AnyJsDocHandler = ControllerJsDocHandler | MethodJsDocHandler | ParameterJsDocHandler;
