/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { isClassDeclaration, isMethodDeclaration } from 'typescript';
import type { Node } from 'typescript';
import { BaseError } from '../../error';
import type { BaseType } from '../../resolver';

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

export class ParameterError extends BaseError {
    static typeUnsupported(context: UnsupportedTypeContext) {
        let text = `@${context.decoratorName}('${context.propertyName}') Does not support '${context.type.typeName}' type`;
        if (context.node) {
            const location = ParameterError.getCurrentLocation(context.node);
            if (location) {
                text += ` at location ${location}`;
            }
        }

        return new ParameterError(`${text}.`);
    }

    static methodUnsupported(context: UnsupportedMethodContext) {
        let text = `@${context.decoratorName}('${context.propertyName}') Does not support method ${context.method}`;
        if (context.node) {
            const location = ParameterError.getCurrentLocation(context.node);
            if (location) {
                text += ` at location ${location}`;
            }
        }

        return new ParameterError(`${text}.`);
    }

    static invalidPathMatch(context: PathMatchInvalidContext) {
        let text = `@${context.decoratorName}('${context.propertyName}') Does not exist in path ${context.path}`;
        if (context.node) {
            const location = ParameterError.getCurrentLocation(context.node);
            if (location) {
                text += ` at location ${location}`;
            }
        }

        return new ParameterError(`${text}.`);
    }

    static invalidExampleSchema() {
        return new ParameterError('The example jsdoc schema is invalid.');
    }

    public static getCurrentLocation(node: Node) {
        const parts : string[] = [];

        if (isMethodDeclaration(node.parent)) {
            parts.push(node.parent.name.getText());

            if (isClassDeclaration(node.parent.parent)) {
                parts.unshift(node.parent.parent.name.text);
            }
        }

        return parts.join('.');
    }
}
