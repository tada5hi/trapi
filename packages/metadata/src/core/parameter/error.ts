/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { isClassDeclaration, isMethodDeclaration } from 'typescript';
import type { Node } from 'typescript';
import type { BaseType } from '../resolver/types';
import { ParameterErrorCode } from './constants';
import { MetadataError } from '../error/base';

type UnsupportedTypeContext = {
    decoratorName: string,
    propertyName: string,
    type: BaseType,
    node?: Node
};

type UnsupportedMethodContext = {
    decoratorName: string,
    propertyName: string,
    method: string,
    node?: Node
};

type PathMatchInvalidContext = {
    decoratorName: string,
    propertyName: string,
    path: string,
    node?: Node
};

type ScopeRequiredContext = {
    decoratorName: string,
    node?: Node
};

export class ParameterError extends MetadataError {
    static typeUnsupported(context: UnsupportedTypeContext) {
        const location = context.node ? ParameterError.getCurrentLocation(context.node) : undefined;
        return new ParameterError({
            message: `@${context.decoratorName}('${context.propertyName}') does not support '${context.type.typeName}' type${location ? ` at ${location}` : ''}.`,
            code: ParameterErrorCode.TYPE_UNSUPPORTED,
        });
    }

    static methodUnsupported(context: UnsupportedMethodContext) {
        const location = context.node ? ParameterError.getCurrentLocation(context.node) : undefined;
        return new ParameterError({
            message: `@${context.decoratorName}('${context.propertyName}') does not support method '${context.method}'${location ? ` at ${location}` : ''}.`,
            code: ParameterErrorCode.METHOD_UNSUPPORTED,
        });
    }

    static invalidPathMatch(context: PathMatchInvalidContext) {
        const location = context.node ? ParameterError.getCurrentLocation(context.node) : undefined;
        return new ParameterError({
            message: `@${context.decoratorName}('${context.propertyName}') does not exist in path '${context.path}'${location ? ` at ${location}` : ''}.`,
            code: ParameterErrorCode.PATH_MISMATCH,
        });
    }

    static scopeRequired(context: ScopeRequiredContext) {
        const location = context.node ? ParameterError.getCurrentLocation(context.node) : undefined;
        return new ParameterError({
            message: `@${context.decoratorName}() requires a scope argument${location ? ` at ${location}` : ''}.`,
            code: ParameterErrorCode.SCOPE_REQUIRED,
        });
    }

    static invalidExampleSchema() {
        return new ParameterError({
            message: 'The @example JSDoc tag contains invalid JSON.',
            code: ParameterErrorCode.INVALID_EXAMPLE,
        });
    }

    public static getCurrentLocation(node: Node) {
        const parts : string[] = [];

        if (isMethodDeclaration(node.parent)) {
            parts.push(node.parent.name.getText());

            if (isClassDeclaration(node.parent.parent) && node.parent.parent.name) {
                parts.unshift(node.parent.parent.name.text);
            }
        }

        return parts.join('.');
    }
}
