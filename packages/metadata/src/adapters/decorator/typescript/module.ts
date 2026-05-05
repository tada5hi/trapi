/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    canHaveDecorators,
    getDecorators,
    isCallExpression,
    isIdentifier,
    isJSDocParameterTag,
    isJSDocPropertyTag,
    isJSDocReturnTag,
    isJSDocThisTag,
    isJSDocTypeTag,
    isPropertyAccessExpression,
    isQualifiedName,
} from 'typescript';
import type {
    Decorator,
    EntityName,
    Expression,
    JSDocTag,
    Node,
    TypeNode,
} from 'typescript';
import { getJSDocTags } from '../../typescript/js-doc';
import { transformJSDocComment } from '../../typescript/js-doc/utils';
import type {
    DecoratorArgument,
    DecoratorSource,
    DecoratorTypeArgument,
    JsDocSource,
} from '@trapi/core';
import type { DecoratorSourceBuilderOptions, JsDocSourceBuilderOptions } from './types';
import { buildDecoratorArgument } from './utils';

// -----------------------------------------------------------------------------
// Decorator sources
// -----------------------------------------------------------------------------

export function buildDecoratorSources(
    node: Node,
    options: DecoratorSourceBuilderOptions,
): DecoratorSource[] {
    if (!canHaveDecorators(node)) {
        return [];
    }

    const decorators = getDecorators(node);
    if (!decorators || decorators.length === 0) {
        return [];
    }

    const output: DecoratorSource[] = [];
    for (const decorator of decorators) {
        const source = buildDecoratorSource(decorator, options);
        if (source) {
            output.push(source);
        }
    }
    return output;
}

function buildDecoratorSource(
    decorator: Decorator,
    options: DecoratorSourceBuilderOptions,
): DecoratorSource | undefined {
    const { expression } = decorator;

    let name: string | undefined;
    let argumentExpressions: readonly Expression[] = [];
    let typeArgumentNodes: readonly TypeNode[] = [];

    if (isCallExpression(expression)) {
        argumentExpressions = expression.arguments;
        typeArgumentNodes = expression.typeArguments ?? [];
        name = readDecoratorName(expression.expression);
    } else {
        name = readDecoratorName(expression);
    }

    if (!name) {
        return undefined;
    }

    const decoratorArguments: DecoratorArgument[] = argumentExpressions.map(
        (arg) => buildDecoratorArgument(arg, options.typeChecker),
    );

    const decoratorTypeArguments: DecoratorTypeArgument[] = typeArgumentNodes.map(
        (typeNode) => ({ resolve: () => options.resolveTypeNode(typeNode) }),
    );

    const sourceFile = decorator.getSourceFile();
    const location = sourceFile ? {
        file: sourceFile.fileName,
        line: sourceFile.getLineAndCharacterOfPosition(decorator.getStart()).line + 1,
    } : undefined;

    return {
        name,
        arguments: decoratorArguments,
        typeArguments: decoratorTypeArguments,
        target: options.target,
        host: options.host,
        location,
    };
}

function readDecoratorName(expression: Node): string | undefined {
    if (isIdentifier(expression)) {
        return expression.text;
    }
    if (isPropertyAccessExpression(expression)) {
        return expression.name.text;
    }
    return undefined;
}

// -----------------------------------------------------------------------------
// JSDoc sources
// -----------------------------------------------------------------------------

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

    if (isJSDocParameterTag(tag) || isJSDocPropertyTag(tag)) {
        if (tag.name) {
            parameterName = readEntityName(tag.name);
        }
        typeNode = tag.typeExpression?.type;
    } else if (
        isJSDocReturnTag(tag) ||
        isJSDocTypeTag(tag) ||
        isJSDocThisTag(tag)
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

function readEntityName(name: EntityName): string | undefined {
    if (isIdentifier(name)) {
        return name.text;
    }
    if (isQualifiedName(name)) {
        const left = readEntityName(name.left);
        return left ? `${left}.${name.right.text}` : name.right.text;
    }
    return undefined;
}
