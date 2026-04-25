/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import * as ts from 'typescript';
import type {
    BaseType,
    NestedObjectLiteralType,
    RefObjectType,
    Type,
} from '../../../../core/types/resolver';
import { TypeName } from '../../../../core/types/type-name';
import { TypeNodeResolver } from '../../../../adapters/typescript/resolver';
import {
    JSDocTagName,
    getJSDocTags,
    hasJSDocTag,
    transformJSDocComment,
} from '../../../../adapters/typescript/js-doc';
import { getInitializerValue } from '../../../../adapters/typescript/initializer';
import { DecoratorID } from '../../../../core/types/decorator-id';
import type { IGeneratorContext } from '../../../../core/types/metadata';
import type { Parameter } from '../../../../core/types/parameter';
import type { ParameterSource } from '../../../../core/types/parameter-source';
import { ParameterError } from '../../../../core/error/parameter';
import type { IParameterHandlerContext } from './types';

export class ParameterHandlerContext implements IParameterHandlerContext {
    readonly parameter: ts.ParameterDeclaration;

    readonly method: string;

    readonly path: string;

    readonly current: IGeneratorContext;

    constructor(
        parameter: ts.ParameterDeclaration,
        method: string,
        path: string,
        current: IGeneratorContext,
    ) {
        this.parameter = parameter;
        this.method = method;
        this.path = path;
        this.current = current;
    }

    getParameterName(): string {
        if (!ts.isIdentifier(this.parameter.name)) {
            throw new ParameterError({ message: 'Destructured parameters are not supported. Use a simple identifier name.' });
        }

        return this.parameter.name.text;
    }

    getParameterDescription(): string {
        const symbol = this.current.typeChecker.getSymbolAtLocation(this.parameter.name);

        if (symbol) {
            const comments = symbol.getDocumentationComment(this.current.typeChecker);
            if (comments.length) { return ts.displayPartsToString(comments); }
        }

        return '';
    }

    getParameterDeprecation(): boolean {
        if (hasJSDocTag(this.parameter, JSDocTagName.DEPRECATED)) {
            return true;
        }

        const match = this.current.decoratorResolver.match(DecoratorID.DEPRECATED, this.parameter);

        return !!match;
    }

    getParameterExample(parameterName: string) {
        const exampleLabels: Array<string | undefined> = [];
        const examples = getJSDocTags(this.parameter.parent, (tag) => {
            const comment = transformJSDocComment(tag.comment);
            const isExample = (tag.tagName.text === JSDocTagName.EXAMPLE || tag.tagName.escapedText === JSDocTagName.EXAMPLE) &&
                !!comment && comment.startsWith(parameterName);

            if (isExample && comment) {
                const hasExampleLabel = (comment.split(' ')[0].indexOf('.') || -1) > 0;
                exampleLabels.push(hasExampleLabel ? comment.split(' ')[0].split('.').slice(1).join('.') : undefined);
            }
            return isExample ?? false;
        }).map((tag) => (
            transformJSDocComment(tag.comment) || '')
            .replace(`${transformJSDocComment(tag.comment)?.split(' ')[0] || ''}`, '')
            .replace(/\r/g, ''));

        if (examples.length === 0) {
            return {
                examples: undefined,
                exampleLabels: undefined,
            };
        }
        try {
            return {
                examples: examples.map((example) => JSON.parse(example)),
                exampleLabels,
            };
        } catch {
            throw ParameterError.invalidExampleSchema();
        }
    }

    getValidatedType(parameter: ts.ParameterDeclaration): Type {
        let typeNode = parameter.type;
        if (!typeNode) {
            const type = this.current.typeChecker.getTypeAtLocation(parameter);
            typeNode = this.current.typeChecker.typeToTypeNode(
                type,
                undefined,
                ts.NodeBuilderFlags.NoTruncation,
            );
        }

        if (!typeNode) {
            throw new ParameterError({ message: `Could not resolve type for parameter '${this.getParameterName()}'.` });
        }

        return new TypeNodeResolver(typeNode, this.current, parameter).resolve();
    }

    isBodySupportedForMethod(method: string): boolean {
        return ['delete', 'post', 'put', 'patch', 'get'].includes(method);
    }

    isTypeSupported(parameterType: BaseType): boolean {
        return !![
            TypeName.STRING,
            TypeName.INTEGER,
            TypeName.LONG,
            TypeName.FLOAT,
            TypeName.DOUBLE,
            TypeName.DATE,
            TypeName.DATETIME,
            TypeName.BUFFER,
            TypeName.BOOLEAN,
            TypeName.ENUM,
        ].find((t) => t === parameterType.typeName);
    }

    buildParametersForObject(
        type: NestedObjectLiteralType | RefObjectType,
        details: Omit<Partial<Parameter>, 'in'> & { in: `${ParameterSource}` },
    ): Parameter[] {
        if (type.properties.length === 0) {
            return [];
        }

        const parameterName = this.getParameterName();

        const initializerValue = getInitializerValue(this.parameter.initializer, this.current.typeChecker, type);

        const output: Parameter[] = [];

        for (let i = 0; i < type.properties.length; i++) {
            const property = type.properties[i];

            let propertyDefaultValue = property.default;
            if (
                typeof propertyDefaultValue === 'undefined' &&
                isObject(initializerValue)
            ) {
                propertyDefaultValue = initializerValue[property.name];
            }

            let propertyRequired = !this.parameter.questionToken;
            if (propertyRequired) {
                propertyRequired = property.required;
            }

            output.push({
                extensions: [],
                ...details,
                default: propertyDefaultValue,
                description: property.description || details.description || this.getParameterDescription(),
                name: property.name,
                parameterName,
                required: propertyRequired,
                type: property.type,
                deprecated: property.deprecated || this.getParameterDeprecation(),
            });
        }

        return output;
    }
}
