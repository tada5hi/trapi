/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import * as ts from 'typescript';
import type { DecoratorPropertyManager } from '../../decorator';
import { DecoratorID } from '../../decorator';
import type {
    BaseType, NestedObjectLiteralType, RefObjectType, Type,
} from '../../resolver';
import {
    TypeName,
    TypeNodeResolver,
    isArrayType,
    isNestedObjectLiteralType,
    isRefEnumType,
    isRefObjectType,
    isUnionType,
} from '../../resolver';
import {
    JSDocTagName,
    getDeclarationValidators,
    getInitializerValue,
    getJSDocTags,
    getNodeDecorators,
    hasJSDocTag,
    transformJSDocComment,
} from '../../utils';
import type { MetadataGenerator } from '../metadata';
import { CollectionFormat, ParameterSource } from './constants';
import { ParameterError } from './error';
import type { ArrayParameter, Parameter } from './type';

const parameterKeys : `${DecoratorID}`[] = [
    DecoratorID.CONTEXT,
    DecoratorID.PARAM,
    DecoratorID.PARAMS,
    DecoratorID.QUERY,
    DecoratorID.FORM,
    DecoratorID.BODY,
    DecoratorID.HEADER,
    DecoratorID.HEADERS,
    DecoratorID.COOKIE,
    DecoratorID.COOKIES,
    DecoratorID.PATH,
    DecoratorID.PATHS,
    DecoratorID.FILE,
    DecoratorID.FILES,
];

export class ParameterGenerator {
    private readonly parameter: ts.ParameterDeclaration;

    private readonly method: string;

    private readonly path: string;

    private readonly current: MetadataGenerator;

    constructor(
        parameter: ts.ParameterDeclaration,
        method: string,
        path: string,
        current: MetadataGenerator,
    ) {
        this.parameter = parameter;
        this.method = method;
        this.path = path;
        this.current = current;
    }

    public generate(): Parameter[] {
        const decorators = getNodeDecorators(this.parameter);

        for (let i = 0; i < parameterKeys.length; i++) {
            const manager = this.current.decoratorResolver.match(parameterKeys[i], decorators);
            if (typeof manager === 'undefined') {
                continue;
            }

            switch (manager.representation.id) {
                case DecoratorID.CONTEXT:
                    return this.getContextParameter();
                case DecoratorID.PARAM:
                case DecoratorID.PARAMS:
                    return this.getParamParameter(manager as DecoratorPropertyManager<`${DecoratorID.PARAM}`>);
                case DecoratorID.FORM:
                    return this.getFormParameter(manager as DecoratorPropertyManager<`${DecoratorID.FORM}`>);
                case DecoratorID.QUERY:
                    return this.getQueryParameter(manager as DecoratorPropertyManager<`${DecoratorID.QUERY}`>);
                case DecoratorID.BODY:
                    return this.getBodyParameter(manager as DecoratorPropertyManager<`${DecoratorID.BODY}`>);
                case DecoratorID.HEADER:
                case DecoratorID.HEADERS:
                    return this.getHeaderParameter(manager as DecoratorPropertyManager<`${DecoratorID.HEADER}`>);
                case DecoratorID.COOKIE:
                case DecoratorID.COOKIES:
                    return this.getCookieParameter(manager as DecoratorPropertyManager<`${DecoratorID.COOKIE}`>);
                case DecoratorID.PATH:
                case DecoratorID.PATHS:
                    return this.getPathParameter(manager as DecoratorPropertyManager<`${DecoratorID.PATH}`>);
                case DecoratorID.FILE:
                case DecoratorID.FILES:
                    return this.getFileParameter(manager as DecoratorPropertyManager<`${DecoratorID.FILE}`>);
            }
        }

        return this.getBodyParameter();
    }

    private buildParametersForObject(
        type: NestedObjectLiteralType | RefObjectType,
        details: Omit<Partial<Parameter>, 'in'> & { in: `${ParameterSource}` },
    ) : Parameter[] {
        if (type.properties.length === 0) {
            return [];
        }

        const parameterName = (this.parameter.name as ts.Identifier).text;

        const initializerValue = getInitializerValue(this.parameter.initializer, this.current.typeChecker, type);

        const output : Parameter[] = [];

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
                ...details,
                default: propertyDefaultValue,
                description: property.description || details.description || this.getParameterDescription(),
                name: property.name,
                parameterName,
                required: propertyRequired,
                type: property.type,
                deprecated: property.deprecated || this.getParameterDeprecation(),
            });

            // todo: example, format
        }

        return output;
    }

    private getParamParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.PARAM}` | `${DecoratorID.PARAMS}`>,
    ): Parameter[] {
        return [
            ...this.getBodyParameter(manager),
            ...this.getCookieParameter(manager),
        ];
    }

    private getContextParameter(): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;

        // todo: req, res, next should maybe be separate parameter sources.
        return [
            {
                description: this.getParameterDescription(),
                in: ParameterSource.CONTEXT,
                name: parameterName,
                parameterName,
                required: !this.parameter.questionToken,
                type: null,
            },
        ];
    }

    private getFileParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.FILE}` | `${DecoratorID.FILES}`>,
    ) : Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;
        const value = manager.get('value');
        if (typeof value === 'string') {
            name = value;
        }

        if (!this.isBodySupportedForMethod(this.method)) {
            throw ParameterError.methodUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                method: this.method,
                node: this.parameter,
            });
        }

        const elementType: Type = { typeName: TypeName.FILE };
        let type: Type;
        if (manager.representation.id === DecoratorID.FILES) {
            type = { typeName: TypeName.ARRAY, elementType };
        } else {
            type = elementType;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: ParameterSource.FORM_DATA,
                name: name || parameterName,
                parameterName,
                required: !this.parameter.questionToken && !this.parameter.initializer,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getDeclarationValidators(this.parameter, parameterName),
            },
        ];
    }

    private getFormParameter(manager: DecoratorPropertyManager<`${DecoratorID.FORM}`>): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.isBodySupportedForMethod(this.method)) {
            throw ParameterError.methodUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                method: this.method,
                node: this.parameter,
            });
        }

        const value = manager.get('value');
        if (typeof value === 'string') {
            name = value;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: ParameterSource.FORM_DATA,
                name: name || parameterName,
                parameterName,
                required: !this.parameter.questionToken && !this.parameter.initializer,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getDeclarationValidators(this.parameter, parameterName),
            },
        ];
    }

    private getCookieParameter(
        manager: DecoratorPropertyManager<
            `${DecoratorID.COOKIE}` |
            `${DecoratorID.COOKIES}` |
            `${DecoratorID.PARAM}` |
            `${DecoratorID.PARAMS}`
        >,
    ): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (
            isNestedObjectLiteralType(type) ||
            isRefObjectType(type)
        ) {
            return this.buildParametersForObject(type, {
                in: ParameterSource.COOKIE,
                examples,
                exampleLabels,
            });
        }

        if (!this.isTypeSupported(type)) {
            throw ParameterError.typeUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                type,
                node: this.parameter,
            });
        }

        const value = manager.get('value');
        if (typeof value === 'string') {
            name = value;
        }

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: ParameterSource.COOKIE,
                name: name || parameterName,
                parameterName,
                required: !this.parameter.questionToken && !this.parameter.initializer,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getDeclarationValidators(this.parameter, parameterName),
            },
        ];
    }

    private getBodyParameter(
        manager?: DecoratorPropertyManager<`${DecoratorID.BODY}` | `${DecoratorID.PARAM}` | `${DecoratorID.PARAMS}`>,
    ): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        let source = ParameterSource.BODY;

        if (manager) {
            const value = manager.get('value');
            if (typeof value === 'string') {
                name = value;
                source = ParameterSource.BODY_PROP;
            }
        }

        const type = this.getValidatedType(this.parameter);
        if (!this.isBodySupportedForMethod(this.method)) {
            throw ParameterError.methodUnsupported({
                decoratorName: manager ? manager.representation.name : 'Body',
                propertyName: name,
                method: this.method,
                node: this.parameter,
            });
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: source,
                name: name || parameterName,
                parameterName,
                required: !this.parameter.questionToken && !this.parameter.initializer,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getDeclarationValidators(this.parameter, parameterName),
            },
        ];
    }

    private getHeaderParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.HEADER}` | `${DecoratorID.HEADERS}`>,
    ) : Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = manager.get('value');
        if (typeof value === 'string') {
            name = value;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (
            isNestedObjectLiteralType(type) ||
            isRefObjectType(type)
        ) {
            return this.buildParametersForObject(type, {
                in: ParameterSource.HEADER,
                examples,
                exampleLabels,
            });
        }

        if (!this.isTypeSupported(type)) {
            throw ParameterError.typeUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                type,
                node: this.parameter,
            });
        }

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: ParameterSource.HEADER,
                name: name || parameterName,
                parameterName,
                required: !this.parameter.questionToken && !this.parameter.initializer,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getDeclarationValidators(this.parameter, parameterName),
            },
        ];
    }

    private getQueryParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.QUERY}`>,
    ): Parameter[] | ArrayParameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(this.parameter);

        let name : string = parameterName;
        let options : Record<string, any> = {};

        let source = ParameterSource.QUERY;

        const nameValue = manager.get('value');
        if (typeof nameValue === 'string') {
            name = nameValue;
            source = ParameterSource.QUERY_PROP;
        }

        const optionsValue = manager.get('options');
        if (isObject(optionsValue)) {
            options = optionsValue;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (source === ParameterSource.QUERY) {
            // yeah! we can transform the object to individual properties.
            if (
                isNestedObjectLiteralType(type) ||
                isRefObjectType(type)
            ) {
                return this.buildParametersForObject(type, {
                    in: ParameterSource.QUERY_PROP,
                    examples,
                    exampleLabels,
                });

                // todo: transform ( type.typeName === 'array')
            }
        }

        const properties : Parameter = {
            allowEmptyValue: options.allowEmptyValue,
            collectionFormat: options.collectionFormat,
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            examples,
            exampleLabels,
            in: source,
            maxItems: options.maxItems,
            minItems: options.minItems,
            name,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
            validators: getDeclarationValidators(this.parameter, parameterName),
        };

        if (isArrayType(type)) {
            if (!this.isTypeSupported(type.elementType)) {
                throw ParameterError.typeUnsupported({
                    decoratorName: manager.representation.name,
                    propertyName: name,
                    type: type.elementType,
                    node: this.parameter,
                });
            }

            return [{
                ...properties,
                collectionFormat: CollectionFormat.MULTI,
                type,
            }];
        }

        // todo: investigate if this refEnum and union are valid types
        if (!this.isTypeSupportedForQueryParameter(type)) {
            throw ParameterError.typeUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                type,
                node: this.parameter,
            });
        }

        return [properties];
    }

    private isTypeSupportedForQueryParameter(type: Type) {
        return this.isTypeSupported(type) ||
            isRefEnumType(type) ||
            isUnionType(type);
    }

    private getPathParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.PATH}` | `${DecoratorID.PATHS}`>,
    ): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = manager.get('value');
        if (typeof value === 'string') {
            name = value;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (
            isNestedObjectLiteralType(type) ||
            isRefObjectType(type)
        ) {
            const output = this.buildParametersForObject(type, {
                in: ParameterSource.PATH,
                examples,
                exampleLabels,
            });

            for (let i = 0; i < output.length; i++) {
                if (
                    (!this.path.includes(`{${output[i].name}}`)) &&
                    (!this.path.includes(`:${output[i].name}`))
                ) {
                    throw ParameterError.invalidPathMatch({
                        decoratorName: manager.representation.name,
                        propertyName: name,
                        path: this.path,
                        node: this.parameter,
                    });
                }
            }

            return output;
        }

        if (!this.isTypeSupported(type)) {
            throw ParameterError.typeUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                type,
                node: this.parameter,
            });
        }

        if (
            (!this.path.includes(`{${name}}`)) &&
            (!this.path.includes(`:${name}`))
        ) {
            throw ParameterError.invalidPathMatch({
                decoratorName: manager.representation.name,
                propertyName: name,
                path: this.path,
                node: this.parameter,
            });
        }

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: ParameterSource.PATH,
                name: name || parameterName,
                parameterName,
                required: true,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getDeclarationValidators(this.parameter, parameterName),
            },
        ];
    }

    // -------------------------------------------------------------------------------------

    private getParameterDescription() {
        const symbol = this.current.typeChecker.getSymbolAtLocation(this.parameter.name);

        if (symbol) {
            const comments = symbol.getDocumentationComment(this.current.typeChecker);
            if (comments.length) { return ts.displayPartsToString(comments); }
        }

        return '';
    }

    private getParameterDeprecation() : boolean {
        if (hasJSDocTag(this.parameter, JSDocTagName.DEPRECATED)) {
            return true;
        }

        const match = this.current.decoratorResolver.match(DecoratorID.DEPRECATED, this.parameter);

        return !!match;
    }

    private getParameterExample(
        parameterName: string,
    ) {
        const exampleLabels: Array<string | undefined> = [];
        const examples = getJSDocTags(this.parameter.parent, (tag) => {
            const comment = transformJSDocComment(tag.comment);
            const isExample = (tag.tagName.text === JSDocTagName.EXAMPLE || tag.tagName.escapedText === JSDocTagName.EXAMPLE) &&
                !!comment && comment.startsWith(parameterName);

            if (isExample && comment) {
                const hasExampleLabel = (comment.split(' ')[0].indexOf('.') || -1) > 0;
                // custom example label is delimited by first '.' and the rest will all be included as example label
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
        } catch (e) {
            throw ParameterError.invalidExampleSchema();
        }
    }

    private isBodySupportedForMethod(method: string) {
        return ['delete', 'post', 'put', 'patch', 'get'].some((m) => m === method);
    }

    private isTypeSupported(parameterType: BaseType) {
        return [
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

    private getValidatedType(parameter: ts.ParameterDeclaration) {
        let typeNode = parameter.type;
        if (!typeNode) {
            const type = this.current.typeChecker.getTypeAtLocation(parameter);
            typeNode = this.current.typeChecker.typeToTypeNode(
                type,
                undefined,
                ts.NodeBuilderFlags.NoTruncation,
            );
        }

        return new TypeNodeResolver(typeNode, this.current, parameter).resolve();
    }
}
