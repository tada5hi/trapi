/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JSDocTag, Node, TypeNode } from 'typescript';
import * as ts from 'typescript';
import type { Type } from '../../../../core/resolver/types';
import { getJSDocTags } from '../../../typescript/js-doc';
import { transformJSDocComment } from '../../../typescript/js-doc/utils';
import type { DecoratorHost, DecoratorTarget, JsDocSource } from '../source';

export type JsDocSourceBuilderOptions = {
    target: DecoratorTarget;
    host: DecoratorHost;
    resolveTypeNode: (node: TypeNode) => Type;
};

export function buildJsDocSources(
    node: Node,
    options: JsDocSourceBuilderOptions,
): JsDocSource[] {
    const tags = getJSDocTags(node);
    if (tags.length === 0) {
        return [];
    }

    const output: JsDocSource[] = [];
    for (const tag of tags) {
        output.push(buildJsDocSource(tag, options));
    }
    return output;
}

function buildJsDocSource(
    tag: JSDocTag,
    options: JsDocSourceBuilderOptions,
): JsDocSource {
    const tagName = tag.tagName.text;
    const text = transformJSDocComment(tag.comment);

    let parameterName: string | undefined;
    let typeNode: TypeNode | undefined;

    if (ts.isJSDocParameterTag(tag) || ts.isJSDocPropertyTag(tag)) {
        if (tag.name && ts.isIdentifier(tag.name)) {
            parameterName = tag.name.text;
        }
        typeNode = tag.typeExpression?.type;
    } else if (
        ts.isJSDocReturnTag(tag) ||
        ts.isJSDocTypeTag(tag) ||
        ts.isJSDocThisTag(tag)
    ) {
        typeNode = tag.typeExpression?.type;
    }

    const source: JsDocSource = {
        tag: tagName,
        target: options.target,
        host: options.host,
    };

    if (typeof text !== 'undefined') {
        source.text = text;
    }

    if (typeof parameterName !== 'undefined') {
        source.parameterName = parameterName;
    }

    if (typeNode) {
        const capturedTypeNode = typeNode;
        source.typeExpression = { resolve: () => options.resolveTypeNode(capturedTypeNode) };
    }

    return source;
}
