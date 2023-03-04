/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { AnnotationKey } from '../../annotation';
import type { AnnotationPropertyManager } from '../../annotation';
import { InvalidParameterException } from '../../errors';
import type { BaseType, TypeVariant } from '../../resolver';
import { TypeNodeResolver, getInitializerValue } from '../../resolver';
import { getNodeDecorators, isExistJSDocTag } from '../../utils';
import type { MetadataGenerator } from '../metadata';
import type { ArrayParameter, Parameter } from './type';

const parameterKeys : `${AnnotationKey}`[] = [
    AnnotationKey.SERVER_CONTEXT,
    AnnotationKey.SERVER_PARAM,
    AnnotationKey.SERVER_PARAMS,
    AnnotationKey.SERVER_QUERY,
    AnnotationKey.SERVER_FORM,
    AnnotationKey.SERVER_BODY,
    AnnotationKey.SERVER_HEADER,
    AnnotationKey.SERVER_HEADERS,
    AnnotationKey.SERVER_COOKIE,
    AnnotationKey.SERVER_COOKIES,
    AnnotationKey.SERVER_PATH_PARAM,
    AnnotationKey.SERVER_PATH_PARAMS,
    AnnotationKey.SERVER_FILE_PARAM,
    AnnotationKey.SERVER_FILES_PARAM,
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

    public generate(): Parameter {
        const decorators = getNodeDecorators(this.parameter);

        for (let i = 0; i < parameterKeys.length; i++) {
            const representation = this.current.decoratorMapper.match(parameterKeys[i], decorators);
            if (typeof representation === 'undefined') {
                continue;
            }

            switch (representation.key) {
                case AnnotationKey.SERVER_CONTEXT:
                    return this.getContextParameter();
                case AnnotationKey.SERVER_PARAM:
                case AnnotationKey.SERVER_PARAMS:
                    return this.getRequestParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_PARAM}`>);
                case AnnotationKey.SERVER_FORM:
                    return this.getFormParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_FORM}`>);
                case AnnotationKey.SERVER_QUERY:
                    return this.getQueryParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_QUERY}`>);
                case AnnotationKey.SERVER_BODY:
                    return this.getBodyParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_BODY}`>);
                case AnnotationKey.SERVER_HEADER:
                case AnnotationKey.SERVER_HEADERS:
                    return this.getHeaderParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_HEADER}`>);
                case AnnotationKey.SERVER_COOKIE:
                case AnnotationKey.SERVER_COOKIES:
                    return this.getCookieParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_COOKIE}`>);
                case AnnotationKey.SERVER_PATH_PARAM:
                case AnnotationKey.SERVER_PATH_PARAMS:
                    return this.getPathParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_PATH_PARAM}`>);
                case AnnotationKey.SERVER_FILE_PARAM:
                    return this.getFileParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_FILE_PARAM}`>);
                case AnnotationKey.SERVER_FILES_PARAM:
                    return this.getFileParameter(representation as AnnotationPropertyManager<`${AnnotationKey.SERVER_FILES_PARAM}`>, true);
            }
        }

        return this.getBodyParameter();
    }

    private getCurrentLocation() {
        const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
        const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private getRequestParameter(
        manager: AnnotationPropertyManager<`${AnnotationKey.SERVER_PARAM}` | `${AnnotationKey.SERVER_PARAMS}`>,
    ): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;
        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = manager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'param',
            name: name || parameterName,
            parameterName,
            required: !this.parameter.questionToken,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getContextParameter(): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;

        return {
            description: this.getParameterDescription(),
            in: 'context',
            name: parameterName,
            parameterName,
            required: !this.parameter.questionToken,
            type: null,
        };
    }

    /*
    private getFileParameter(parameter: ts.ParameterDeclaration): Metadata.Parameter{
        const parameterName = (parameter.name as ts.Identifier).text;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`FileParam can't support '${this.getCurrentLocation()}' method.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'FileParam') || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'file' }
        };
    }
     */

    private getFileParameter(
        representationManager: AnnotationPropertyManager<`${AnnotationKey.SERVER_FILE_PARAM}` | `${AnnotationKey.SERVER_FILES_PARAM}`>,
        isArray?: boolean,
    ) : Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`File(s)Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        const elementType: TypeVariant = { typeName: 'file' };
        let type: TypeVariant;
        if (isArray) {
            type = { typeName: 'array', elementType };
        } else {
            type = elementType;
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'formData',
            name: name || parameterName,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getFormParameter(representationManager: AnnotationPropertyManager<`${AnnotationKey.SERVER_FORM}`>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Form can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'formData',
            name: name || parameterName,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getCookieParameter(
        manager: AnnotationPropertyManager<`${AnnotationKey.SERVER_COOKIE}` | `${AnnotationKey.SERVER_COOKIES}`>,
    ): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportPathDataType(type)) {
            throw new Error(`Cookie can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = manager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'cookie',
            name: name || parameterName,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getBodyParameter(manager?: AnnotationPropertyManager<`${AnnotationKey.SERVER_BODY}`>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Body can't support ${this.method} method`);
        }

        if (typeof manager !== 'undefined') {
            const value = manager.getPropertyValue('value');
            if (typeof value === 'string') {
                name = value;
            }
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'body',
            name: name || parameterName,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getHeaderParameter(
        manager: AnnotationPropertyManager<`${AnnotationKey.SERVER_HEADER}` | `${AnnotationKey.SERVER_HEADERS}`>,
    ) : Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
        }

        const value = manager.getPropertyValue('value');
        if (typeof value === 'string') {
            name = value;
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'header',
            name: name || parameterName,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getQueryParameter(representationManager: AnnotationPropertyManager<`${AnnotationKey.SERVER_QUERY}`>): Parameter | ArrayParameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(this.parameter);

        if (!this.supportQueryDataType(type)) {
            /*
            const arrayType = getCommonPrimitiveAndArrayUnionType(parameter.type);
            if (arrayType && this.supportQueryDataType(arrayType)) {
                type = arrayType;
            } else {
                throw new InvalidParameterException(
                `Parameter '${parameterName}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`
                );
            }
             */
            // throw new InvalidParameterException(
            // `Parameter '${parameterName}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`
            // );
        }

        let name : string = parameterName;
        let options : any = {};

        const nameValue = representationManager.getPropertyValue('value');
        if (typeof nameValue === 'string') {
            name = nameValue;
        }

        const optionsValue = representationManager.getPropertyValue('options');
        if (typeof optionsValue !== 'undefined') {
            options = optionsValue;
        }

        const properties : Parameter = {
            allowEmptyValue: options.allowEmptyValue,
            collectionFormat: options.collectionFormat,
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'query',
            maxItems: options.maxItems,
            minItems: options.minItems,
            name,
            parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type,
            deprecated: this.getParameterDeprecation(),
        };

        if (type.typeName === 'array') {
            return {
                ...properties,
                collectionFormat: 'multi',
                type,
            };
        }

        return properties;
    }

    private getPathParameter(
        manager: AnnotationPropertyManager<`${AnnotationKey.SERVER_PATH_PARAM}` | `${AnnotationKey.SERVER_PATH_PARAMS}`>,
    ): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let pathName = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = manager.getPropertyValue('value');
        if (typeof value === 'string') {
            pathName = value;
        }

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}:${type.typeName}' can't be passed as a path parameter in '${this.getCurrentLocation()}'.`);
        }

        if ((!this.path.includes(`{${pathName}}`)) && (!this.path.includes(`:${pathName}`))) {
            throw new Error(`Parameter '${parameterName}' can't match in path: '${this.path}'`);
        }

        return {
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(),
            in: 'path',
            name: pathName,
            parameterName,
            required: true,
            type,
            deprecated: this.getParameterDeprecation(),
        };
    }

    private getParameterDescription() {
        const symbol = this.current.typeChecker.getSymbolAtLocation(this.parameter.name);

        if (symbol) {
            const comments = symbol.getDocumentationComment(this.current.typeChecker);
            if (comments.length) { return ts.displayPartsToString(comments); }
        }

        return '';
    }

    private getParameterDeprecation() : boolean {
        if (isExistJSDocTag(this.parameter, (tag) => tag.tagName.text === 'deprecated')) {
            return true;
        }

        const decorators = getNodeDecorators(this.parameter, (identifier) => identifier.text === 'Deprecated');

        return decorators.length > 0;
    }

    private supportsBodyParameters(method: string) {
        return ['delete', 'post', 'put', 'patch', 'get'].some((m) => m === method);
    }

    private supportPathDataType(parameterType: BaseType) {
        return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum'].find((t) => t === parameterType.typeName);
    }

    private supportQueryDataType(parameterType: BaseType) {
        // Copied from supportPathDataType and added 'array'. Not sure if all options apply to queries, but kept to avoid breaking change.
        return ['string', 'integer', 'long', 'float', 'double', 'date',
            'datetime', 'buffer', 'boolean', 'enum', 'array', 'object'].find((t) => t === parameterType.typeName);
    }

    private getValidatedType(parameter: ts.ParameterDeclaration) {
        let typeNode = parameter.type;
        if (!typeNode) {
            const type = this.current.typeChecker.getTypeAtLocation(parameter);
            typeNode = this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
        }

        return new TypeNodeResolver(typeNode, this.current, parameter).resolve();
    }
}
