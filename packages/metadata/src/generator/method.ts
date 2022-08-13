/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as pathUtil from 'path';
import * as ts from 'typescript';
import { hasOwnProperty } from '@trapi/metadata-utils';
import { Decorator, getNodeDecorators } from '../decorator';
import { EndpointGenerator } from './endpoint';
import { MetadataGenerator } from './index';
import { ParameterGenerator } from './parameter';
import { Resolver, TypeNodeResolver } from '../resolver';
import {
    Method, MethodType, Parameter, Response,
} from '../type';
import { getJSDocDescription, getJSDocTagComment } from '../utils';
import MethodHttpVerbKey = Decorator.MethodHttpVerbType;

export class MethodGenerator extends EndpointGenerator<ts.MethodDeclaration> {
    private method: MethodType;

    // --------------------------------------------------------------------

    constructor(
        node: ts.MethodDeclaration,
        current: MetadataGenerator,
        private readonly controllerPath: string,
    ) {
        super(node, current);
        this.processMethodDecorators();
    }

    // --------------------------------------------------------------------

    public isValid() {
        return !!this.method;
    }

    public getMethodName() {
        const identifier = this.node.name as ts.Identifier;
        return identifier.text;
    }

    public generate(): Method {
        if (!this.isValid()) { throw new Error('This isn\'t a valid controller method.'); }

        let nodeType = this.node.type;
        if (!nodeType) {
            const { typeChecker } = this.current;
            const signature = typeChecker.getSignatureFromDeclaration(this.node);
            const implicitType = typeChecker.getReturnTypeOfSignature(signature!);
            nodeType = typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
        }

        const type = new TypeNodeResolver(nodeType, this.current).resolve();
        const responses = this.mergeResponses(this.getResponses(), this.getMethodSuccessResponse(type));

        return {
            // todo: implement extensions
            consumes: this.getConsumes(),
            deprecated: this.isDeprecated(this.node),
            description: getJSDocDescription(this.node),
            extensions: [],
            hidden: this.isHidden(this.node),
            method: this.method,
            name: (this.node.name as ts.Identifier).text,
            parameters: this.buildParameters(),
            path: this.path,
            produces: this.getProduces(),
            responses,
            security: this.getSecurity(),
            summary: getJSDocTagComment(this.node, 'summary'),
            tags: this.getTags(),
            type,
        };
    }

    protected getCurrentLocation() {
        const methodId = this.node.name as ts.Identifier;
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private buildParameters() {
        const parameters = this.node.parameters.map((p: ts.ParameterDeclaration) => {
            try {
                const path = pathUtil.posix.join('/', (this.controllerPath ? this.controllerPath : ''), this.path);

                return new ParameterGenerator(p, this.method, path, this.current).generate();
            } catch (e) {
                const methodId = this.node.name as ts.Identifier;
                const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
                const parameterId = p.name as ts.Identifier;
                throw new Error(`Error generate parameter method: '${controllerId.text}.${methodId.text}' argument: ${parameterId.text} ${e}`);
            }
        }).filter((p: Parameter) => (p.in !== 'context') && (p.in !== 'cookie'));

        const bodyParameters = parameters.filter((p: Parameter) => p.in === 'body');
        const formParameters = parameters.filter((p: Parameter) => p.in === 'formData');

        if (bodyParameters.length > 1) {
            throw new Error(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
        }

        if (bodyParameters.length > 0 && formParameters.length > 0) {
            throw new Error(`Choose either during @FormParam and @FileParam or body parameter  in '${this.getCurrentLocation()}' method.`);
        }

        return parameters;
    }

    private processMethodDecorators() {
        const httpMethodDecorators = getNodeDecorators(this.node, (decorator) => this.supportsPathMethod(decorator.text));

        if (!httpMethodDecorators || !httpMethodDecorators.length) { return; }
        if (httpMethodDecorators.length > 1) {
            throw new Error(`Only one HTTP Method decorator in '${this.getCurrentLocation}' method is acceptable, Found: ${httpMethodDecorators.map((d) => d.text).join(', ')}`);
        }

        const methodDecorator = httpMethodDecorators[0];
        this.method = methodDecorator.text.toLowerCase() as MethodType;

        this.generatePath('METHOD_PATH');
    }

    private getMethodSuccessResponse(type: Resolver.BaseType): Response {
        type = this.getMethodSuccessResponseType(type);

        return {
            description: Resolver.isVoidType(type) ? 'No content' : 'Ok',
            examples: this.getMethodSuccessExamples(),
            schema: type,
            status: Resolver.isVoidType(type) ? '204' : '200',
            name: Resolver.isVoidType(type) ? '204' : '200',
        };
    }

    private getMethodSuccessResponseType(type: Resolver.BaseType) : Resolver.BaseType {
        if (!Resolver.isVoidType(type)) {
            return type;
        }

        const representation = this.current.decoratorMapper.match('RESPONSE_EXAMPLE', this.node);
        if (typeof representation === 'undefined') {
            return type;
        }

        const value = representation.getPropertyValue('TYPE');

        if (
            typeof value !== 'undefined' &&
            hasOwnProperty(value, 'kind') &&
            ts.isTypeNode(value as ts.Node)
        ) {
            type = new TypeNodeResolver(value as ts.TypeNode, this.current).resolve();
        }

        return type;
    }

    private getMethodSuccessExamples() {
        const representation = this.current.decoratorMapper.match('RESPONSE_EXAMPLE', this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const value : unknown = representation.getPropertyValue('PAYLOAD');
        if (typeof value === 'undefined') {
            return [];
        }

        return value;
    }

    private mergeResponses(responses: Response[], defaultResponse: Response) {
        if (!responses || !responses.length) {
            return [defaultResponse];
        }

        const index = responses.findIndex((resp) => resp.status === defaultResponse.status);

        if (index >= 0) {
            if (defaultResponse.examples && !responses[index].examples) {
                responses[index].examples = defaultResponse.examples;
            }
        } else {
            responses.push(defaultResponse);
        }
        return responses;
    }

    private supportsPathMethod(method: string) : boolean {
        return (['ALL', 'GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'] as MethodHttpVerbKey[]).some((m) => m.toLowerCase() === method.toLowerCase());
    }
}
