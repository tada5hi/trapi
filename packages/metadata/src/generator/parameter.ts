/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BaseType,
    MapperParameterType,
    MetadataGeneratorInterface,
    RepresentationManager,
    TypeNodeResolver,
    TypeVariant,
    getInitializerValue,
    getNodeDecorators,
    isExistJSDocTag,
} from '@trapi/decorators';
import * as ts from 'typescript';
import { InvalidParameterException } from '../errors';
import { ArrayParameter, Parameter } from '../type';

const parameterKeys : MapperParameterType[] = [
    'SERVER_CONTEXT',
    'SERVER_PARAM',
    'SERVER_PARAMS',
    'SERVER_QUERY',
    'SERVER_FORM',
    'SERVER_BODY',
    'SERVER_HEADER',
    'SERVER_HEADERS',
    'SERVER_COOKIE',
    'SERVER_COOKIES',
    'SERVER_PATH_PARAM',
    'SERVER_PATH_PARAMS',
    'SERVER_FILES_PARAM',
];

export class ParameterGenerator {
    private readonly parameter: ts.ParameterDeclaration;

    private readonly method: string;

    private readonly path: string;

    private readonly current: MetadataGeneratorInterface;

    constructor(
        parameter: ts.ParameterDeclaration,
        method: string,
        path: string,
        current: MetadataGeneratorInterface,
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

            switch (parameterKeys[i]) {
                case 'SERVER_CONTEXT':
                    return this.getContextParameter();
                case 'SERVER_PARAM':
                case 'SERVER_PARAMS':
                    return this.getRequestParameter(representation);
                case 'SERVER_FORM':
                    return this.getFormParameter(representation);
                case 'SERVER_QUERY':
                    return this.getQueryParameter(representation);
                case 'SERVER_BODY':
                    return this.getBodyParameter(representation);
                case 'SERVER_HEADER':
                case 'SERVER_HEADERS':
                    return this.getHeaderParameter(representation);
                case 'SERVER_COOKIE':
                case 'SERVER_COOKIES':
                    return this.getCookieParameter(representation);
                case 'SERVER_PATH_PARAM':
                case 'SERVER_PATH_PARAMS':
                    return this.getPathParameter(representation);
                case 'SERVER_FILE_PARAM':
                    return this.getFileParameter(representation);
                case 'SERVER_FILES_PARAM':
                    return this.getFileParameter(representation, true);
            }
        }

        return this.getBodyParameter();
    }

    private getCurrentLocation() {
        const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
        const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private getRequestParameter(representationManager: RepresentationManager<'SERVER_PARAM' | 'SERVER_PARAMS'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;
        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
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
        representationManager: RepresentationManager<'SERVER_FILE_PARAM' | 'SERVER_FILES_PARAM'>,
        isArray?: boolean,
    ) : Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`File(s)Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
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

    private getFormParameter(representationManager: RepresentationManager<'SERVER_FORM'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Form can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
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

    private getCookieParameter(representationManager: RepresentationManager<'SERVER_COOKIE' | 'SERVER_COOKIES'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportPathDataType(type)) {
            throw new Error(`Cookie can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
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

    private getBodyParameter(representationManager?: RepresentationManager<'SERVER_BODY'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Body can't support ${this.method} method`);
        }

        if (typeof representationManager !== 'undefined') {
            const value = representationManager.getPropertyValue('DEFAULT');
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

    private getHeaderParameter(representationManager: RepresentationManager<'SERVER_HEADER' | 'SERVER_HEADERS'>) : Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
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

    private getQueryParameter(representationManager: RepresentationManager<'SERVER_QUERY'>): Parameter | ArrayParameter {
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

        const nameValue = representationManager.getPropertyValue('DEFAULT');
        if (typeof nameValue === 'string') {
            name = nameValue;
        }

        const optionsValue = representationManager.getPropertyValue('OPTIONS');
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

    private getPathParameter(representationManager: RepresentationManager<'SERVER_PATH_PARAM' | 'SERVER_PATH_PARAMS'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let pathName = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = representationManager.getPropertyValue('DEFAULT');
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
