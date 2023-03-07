/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import type { DecoratorPropertyManager } from '../../decorator';
import { DecoratorID } from '../../decorator';
import type {
    BaseType, NestedObjectLiteralType, RefObjectType, TypeVariant,
} from '../../resolver';
import { TypeNodeResolver } from '../../resolver';
import {
    JSDocTagName,
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
import { getParameterValidators } from './validator';

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
    DecoratorID.PATH_PARAM,
    DecoratorID.PATH_PARAMS,
    DecoratorID.FILE_PARAM,
    DecoratorID.FILES_PARAM,
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
            const representation = this.current.decoratorResolver.match(parameterKeys[i], decorators);
            if (typeof representation === 'undefined') {
                continue;
            }

            switch (representation.id) {
                case DecoratorID.CONTEXT:
                    return this.getContextParameter();
                case DecoratorID.PARAM:
                case DecoratorID.PARAMS:
                    return this.getParamParameter(representation as DecoratorPropertyManager<`${DecoratorID.PARAM}`>);
                case DecoratorID.FORM:
                    return this.getFormParameter(representation as DecoratorPropertyManager<`${DecoratorID.FORM}`>);
                case DecoratorID.QUERY:
                    return this.getQueryParameter(representation as DecoratorPropertyManager<`${DecoratorID.QUERY}`>);
                case DecoratorID.BODY:
                    return this.getBodyParameter(representation as DecoratorPropertyManager<`${DecoratorID.BODY}`>);
                case DecoratorID.HEADER:
                case DecoratorID.HEADERS:
                    return this.getHeaderParameter(representation as DecoratorPropertyManager<`${DecoratorID.HEADER}`>);
                case DecoratorID.COOKIE:
                case DecoratorID.COOKIES:
                    return this.getCookieParameter(representation as DecoratorPropertyManager<`${DecoratorID.COOKIE}`>);
                case DecoratorID.PATH_PARAM:
                case DecoratorID.PATH_PARAMS:
                    return this.getPathParameter(representation as DecoratorPropertyManager<`${DecoratorID.PATH_PARAM}`>);
                case DecoratorID.FILE_PARAM:
                case DecoratorID.FILES_PARAM:
                    return this.getFileParameter(representation as DecoratorPropertyManager<`${DecoratorID.FILE_PARAM}`>);
            }
        }

        // todo: add BodyProp decorator, due the fact that single body parameter can contain object.

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
            const propertyDefaultValue = initializerValue[property.name];
            let propertyRequired = !this.parameter.questionToken;
            if (propertyRequired) {
                propertyRequired = property.required;
            }

            output.push({
                ...details,
                default: property.default || propertyDefaultValue,
                description: property.description || details.description || this.getParameterDescription(),
                name: property.name,
                parameterName,
                required: propertyRequired,
                type: property.type,
                deprecated: property.deprecated || this.getParameterDeprecation(),
            });

            // todo: example, format, default, description
        }

        return output;
    }

    private getParamParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.PARAM}` | `${DecoratorID.PARAMS}`>,
    ): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;
        const type = this.getValidatedType(this.parameter);

        const value = manager.getPropertyValue('value');
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

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (
            type.typeName === 'nestedObjectLiteral' ||
            type.typeName === 'refObject'
        ) {
            return this.buildParametersForObject(type, {
                in: ParameterSource.PARAM,
                examples,
                exampleLabels,
            });
        }

        // todo: return form, body, query parameter :)

        return [
            {
                default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
                description: this.getParameterDescription(),
                examples,
                exampleLabels,
                in: ParameterSource.PARAM,
                name: name || parameterName,
                parameterName,
                required: !this.parameter.questionToken,
                type,
                deprecated: this.getParameterDeprecation(),
                validators: getParameterValidators(this.parameter, parameterName),
            },
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
        manager: DecoratorPropertyManager<`${DecoratorID.FILE_PARAM}` | `${DecoratorID.FILES_PARAM}`>,
    ) : Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const value = manager.getPropertyValue('value');
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

        const elementType: TypeVariant = { typeName: 'file' };
        let type: TypeVariant;
        if (manager.id === DecoratorID.FILES_PARAM) {
            type = { typeName: 'array', elementType };
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
                validators: getParameterValidators(this.parameter, parameterName),
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

        const value = manager.getPropertyValue('value');
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
                validators: getParameterValidators(this.parameter, parameterName),
            },
        ];
    }

    private getCookieParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.COOKIE}` | `${DecoratorID.COOKIES}`>,
    ): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (type.typeName === 'nestedObjectLiteral' || type.typeName === 'refObject') {
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

        const value = manager.getPropertyValue('value');
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
                validators: getParameterValidators(this.parameter, parameterName),
            },
        ];
    }

    private getBodyParameter(manager?: DecoratorPropertyManager<`${DecoratorID.BODY}`>): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        let source = ParameterSource.BODY;

        if (manager) {
            const value = manager.getPropertyValue('value');
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
                validators: getParameterValidators(this.parameter, parameterName),
            },
        ];
    }

    private getHeaderParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.HEADER}` | `${DecoratorID.HEADERS}`>,
    ) : Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = manager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (type.typeName === 'nestedObjectLiteral' || type.typeName === 'refObject') {
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
                validators: getParameterValidators(this.parameter, parameterName),
            },
        ];
    }

    private getQueryParameter(manager: DecoratorPropertyManager<`${DecoratorID.QUERY}`>): Parameter[] | ArrayParameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(this.parameter);

        let name : string = parameterName;
        let options : any = {};

        let source = ParameterSource.QUERY;

        const nameValue = manager.getPropertyValue('value');
        if (typeof nameValue === 'string') {
            name = nameValue;
            source = ParameterSource.QUERY_PROP;
        }

        const optionsValue = manager.getPropertyValue('options');
        if (typeof optionsValue !== 'undefined') {
            options = optionsValue;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

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
            validators: getParameterValidators(this.parameter, parameterName),
        };

        if (
            type.typeName === 'nestedObjectLiteral' ||
            type.typeName === 'refObject'
        ) {
            const output = this.buildParametersForObject(type, {
                in: ParameterSource.QUERY_PROP,
                examples,
                exampleLabels,
            });

            if (source === ParameterSource.QUERY_PROP) {
                for (let i = 0; i < output.length; i++) {
                    output[i].name = `${name}.${output[i].name}`;
                }
            }

            return output;
        }

        if (type.typeName === 'array') {
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
        if (
            !this.isTypeSupported(type) &&
            type.typeName !== 'refEnum' &&
            type.typeName !== 'union'
        ) {
            throw ParameterError.typeUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                type,
                node: this.parameter,
            });
        }

        return [properties];
    }

    private getPathParameter(
        manager: DecoratorPropertyManager<`${DecoratorID.PATH_PARAM}` | `${DecoratorID.PATH_PARAMS}`>,
    ): Parameter[] {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = manager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        const { examples, exampleLabels } = this.getParameterExample(parameterName);

        if (type.typeName === 'nestedObjectLiteral' || type.typeName === 'refObject') {
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
                validators: getParameterValidators(this.parameter, parameterName),
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
            'string',
            'integer',
            'long',
            'float',
            'double',
            'date',
            'datetime',
            'buffer',
            'boolean',
            'enum',
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
