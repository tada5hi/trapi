/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { NodeBuilderFlags, isTypeNode } from 'typescript';
import type {
    ClassDeclaration, Identifier, MethodDeclaration, Node, TypeNode,
} from 'typescript';
import { DecoratorID } from '../../decorator';
import type { BaseType } from '../../resolver';
import { TypeNodeResolver, getNodeExtensions, isVoidType } from '../../resolver';
import {
    JSDocTagName, getJSDocDescription, getJSDocTagComment, getNodeDecorators, hasOwnProperty,
} from '../../utils';
import { AbstractGenerator } from '../abstract';
import type { MetadataGenerator } from '../metadata';
import type { Parameter } from '../parameter';
import { ParameterGenerator, ParameterSource } from '../parameter';
import type { Example, Response } from '../type';
import type { Method, MethodType } from './type';

export class MethodGenerator extends AbstractGenerator<MethodDeclaration> {
    private method: MethodType;

    // --------------------------------------------------------------------

    constructor(
        node: MethodDeclaration,
        current: MetadataGenerator,
    ) {
        super(node, current);

        this.determineVerb();
    }

    // --------------------------------------------------------------------

    public isValid() : boolean {
        return typeof this.method !== 'undefined';
    }

    public getMethodName() {
        const identifier = this.node.name as Identifier;
        return identifier.text;
    }

    public generate(controllerPath: string): Method {
        let nodeType = this.node.type;
        if (!nodeType) {
            const { typeChecker } = this.current;
            const signature = typeChecker.getSignatureFromDeclaration(this.node);
            const implicitType = typeChecker.getReturnTypeOfSignature(signature);
            nodeType = typeChecker.typeToTypeNode(implicitType, undefined, NodeBuilderFlags.NoTruncation) as TypeNode;
        }

        const type = new TypeNodeResolver(nodeType, this.current).resolve();
        const responses = this.mergeResponses(this.buildResponses(), this.buildResponse(type));

        const methodPath = this.buildPath();

        return {
            consumes: this.getConsumes(),
            deprecated: this.isDeprecated(this.node),
            description: getJSDocDescription(this.node),
            extensions: getNodeExtensions(this.node, this.current.decoratorResolver),
            hidden: this.isHidden(this.node),
            method: this.method,
            name: (this.node.name as Identifier).text,
            path: methodPath,
            produces: this.getProduces(),
            responses,
            security: this.getSecurity(),
            summary: getJSDocTagComment(this.node, JSDocTagName.SUMMARY),
            tags: this.getTags(),
            type,
            parameters: this.buildParameters(controllerPath, methodPath),
        };
    }

    protected getCurrentLocation() {
        const methodId = this.node.name as Identifier;
        const controllerId = (this.node.parent as ClassDeclaration).name as Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private buildParameters(
        controllerPath: string,
        methodPath: string,
    ) {
        const controllerId = (this.node.parent as ClassDeclaration).name as Identifier;

        const methodId = this.node.name as Identifier;
        const fullPath = path.posix.join('/', controllerPath, methodPath);

        const output : Parameter[] = [];
        let bodyParameterCount = 0;
        let formParameterCount = 0;

        for (let i = 0; i < this.node.parameters.length; i++) {
            try {
                const generator = new ParameterGenerator(
                    this.node.parameters[i],
                    this.method,
                    fullPath,
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
                const parameterId = this.node.parameters[i].name as Identifier;
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

    private determineVerb() {
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

        const representation = this.current.decoratorResolver.match(DecoratorID.EXAMPLE, this.node);
        if (typeof representation === 'undefined') {
            return type;
        }

        const value = representation.get('type');

        if (
            typeof value !== 'undefined' &&
            hasOwnProperty(value, 'kind') &&
            isTypeNode(value as Node)
        ) {
            type = new TypeNodeResolver(value as TypeNode, this.current).resolve();
        }

        return type;
    }

    private getResponseExamples() : Example[] {
        const representation = this.current.decoratorResolver.match(DecoratorID.EXAMPLE, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const output : Example[] = [];
        for (let i = 0; i < representation.decorators.length; i++) {
            const value = representation.get('payload');
            const label = representation.get('label');
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
