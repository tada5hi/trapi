/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import * as ts from 'typescript';
import { DecoratorID } from '../../decorator';
import type { BaseType } from '../../resolver';
import { TypeNodeResolver, isVoidType } from '../../resolver';
import {
    JSDocTagName, getJSDocDescription, getJSDocTagComment, getNodeDecorators, hasOwnProperty,
} from '../../utils';
import { AbstractGenerator } from '../abstract';
import type { MetadataGenerator } from '../metadata';
import type { Parameter } from '../parameter';
import { ParameterGenerator, ParameterSource } from '../parameter';
import type { Example, Response } from '../type';
import type { Method, MethodType } from './type';

export class MethodGenerator extends AbstractGenerator<ts.MethodDeclaration> {
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
            const implicitType = typeChecker.getReturnTypeOfSignature(signature);
            nodeType = typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
        }

        const type = new TypeNodeResolver(nodeType, this.current).resolve();
        const responses = this.mergeResponses(this.buildResponses(), this.buildResponse(type));

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
            summary: getJSDocTagComment(this.node, JSDocTagName.SUMMARY),
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
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;

        const methodId = this.node.name as ts.Identifier;
        const methodPath = path.posix.join('/', this.controllerPath || '', this.path);

        const output : Parameter[] = [];
        let bodyParameterCount = 0;
        let formParameterCount = 0;

        for (let i = 0; i < this.node.parameters.length; i++) {
            try {
                const generator = new ParameterGenerator(
                    this.node.parameters[i],
                    this.method,
                    methodPath,
                    this.current,
                );

                const parameters = generator.generate();

                for (let j = 0; j < parameters.length; j++) {
                    if (parameters[j].in === ParameterSource.BODY) {
                        bodyParameterCount++;
                    }

                    if (parameters[j].in === ParameterSource.FORM_DATA) {
                        formParameterCount++;
                    }

                    if (parameters[j].in !== ParameterSource.CONTEXT) {
                        output.push(parameters[j]);
                    }
                }
            } catch (e) {
                const parameterId = this.node.parameters[i].name as ts.Identifier;
                throw new Error(`Parameter generation: '${controllerId.text}.${methodId.text}' argument: ${parameterId.text} ${e}`);
            }
        }

        if (bodyParameterCount > 1) {
            throw new Error(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
        }

        if (bodyParameterCount > 0 && formParameterCount > 0) {
            throw new Error(`Choose either form-, file- or body-parameter in '${this.getCurrentLocation()}' method.`);
        }

        return output;
    }

    private processMethodDecorators() {
        const methods = [
            DecoratorID.ALL,
            DecoratorID.DELETE,
            DecoratorID.GET,
            DecoratorID.HEAD,
            DecoratorID.OPTIONS,
            DecoratorID.PATCH,
            DecoratorID.POST,
            DecoratorID.PUT,
        ];

        const decorators = getNodeDecorators(this.node);

        let method : string | undefined;

        for (let i = 0; i < methods.length; i++) {
            const representationManager = this.current.decoratorResolver.match(methods[i], decorators);
            if (representationManager) {
                method = methods[i];
                break;
            }
        }

        if (typeof method === 'undefined') {
            return;
        }

        this.method = method.toLowerCase() as MethodType;

        this.generatePath(DecoratorID.METHOD_PATH);
    }

    private buildResponse(type: BaseType): Response {
        type = this.guessResponseType(type);

        return {
            description: isVoidType(type) ? 'No content' : 'Ok',
            examples: this.getResponseExamples(),
            schema: type,
            status: isVoidType(type) ? '204' : '200',
            name: isVoidType(type) ? '204' : '200',
        };
    }

    private guessResponseType(type: BaseType) : BaseType {
        if (!isVoidType(type)) {
            return type;
        }

        const representation = this.current.decoratorResolver.match(DecoratorID.RESPONSE_EXAMPLE, this.node);
        if (typeof representation === 'undefined') {
            return type;
        }

        const value = representation.getPropertyValue('type');

        if (
            typeof value !== 'undefined' &&
            hasOwnProperty(value, 'kind') &&
            ts.isTypeNode(value as ts.Node)
        ) {
            type = new TypeNodeResolver(value as ts.TypeNode, this.current).resolve();
        }

        return type;
    }

    private getResponseExamples() : Example[] {
        const representation = this.current.decoratorResolver.match(DecoratorID.RESPONSE_EXAMPLE, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const output : Example[] = [];
        for (let i = 0; i < representation.decorators.length; i++) {
            const value = representation.getPropertyValue('payload');
            const label = representation.getPropertyValue('label');
            if (typeof value !== 'undefined') {
                output.push({ value, label });
            }
        }

        return output;
    }

    private mergeResponses(responses: Response[], exampleResponse: Response) {
        if (!responses || !responses.length) {
            return [exampleResponse];
        }

        const index = responses.findIndex((resp) => resp.status === exampleResponse.status);
        if (index >= 0) {
            if (
                exampleResponse.examples &&
                (!responses[index].examples || !responses[index].examples.length)
            ) {
                responses[index].examples = exampleResponse.examples;
            }
        } else {
            responses.push(exampleResponse);
        }

        return responses;
    }
}
