/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArrayLiteralExpression, Node, TypeNode } from 'typescript';
import { isArrayLiteralExpression } from 'typescript';
import { AnnotationKey } from '../annotation';
import { TypeNodeResolver, getInitializerValue } from '../resolver';

import type { Response } from './type';
import { getNodeDecorators, isExistJSDocTag, normalizePath } from '../utils';
import type { MetadataGenerator } from './metadata';

export abstract class AbstractGenerator<T extends Node> {
    protected path: string | undefined;

    protected node: T;

    // -------------------------------------------

    protected constructor(node: T, protected current: MetadataGenerator) {
        this.node = node;
    }

    // --------------------------------------------------------------------

    protected generatePath(
        key: `${AnnotationKey.CLASS_PATH}` | `${AnnotationKey.METHOD_PATH}`,
    ) : void {
        const values : string[] = [];

        const representation = this.current.decoratorMapper.match(key, this.node);
        if (typeof representation !== 'undefined') {
            const value = representation.getPropertyValue('value');
            if (typeof value !== 'undefined') {
                values.push(value);
            }
        }

        this.path = normalizePath(values.join('/'));
    }

    // --------------------------------------------------------------------

    protected getDecoratorValues(decoratorName: string, acceptMultiple = false) : any[] {
        const decorators = getNodeDecorators(this.node, (decorator) => decorator.text === decoratorName);

        if (!decorators || !decorators.length) { return []; }

        if (!acceptMultiple && decorators.length > 1) {
            throw new Error(`Only one ${decoratorName} decorator allowed in ${this.getCurrentLocation()}.`);
        }

        let result: any[];

        if (acceptMultiple) {
            result = decorators.map((d) => d.arguments);
        } else {
            const d = decorators[0];
            result = d.arguments;
        }

        return result;
    }

    // -------------------------------------------

    protected getSecurity() {
        const securities = this.getDecoratorValues('Security', true);
        if (!securities || !securities.length) { return undefined; }

        return securities.map((security) => {
            const rolesArray : string[] = security[0] ? this.handleRolesArray(security[0]) : [];

            return {
                name: security[1] ? security[1] : 'default',
                scopes: rolesArray,
            };
        });
    }

    protected handleRolesArray(argument: ArrayLiteralExpression): string[] {
        if (isArrayLiteralExpression(argument)) {
            return argument.elements.map((value) => value.getText())
                .map((val) => ((val && val.startsWith('\'') && val.endsWith('\'')) ? val.slice(1, -1) : val));
        }
        return argument;
    }

    // -------------------------------------------

    protected getExamplesValue(argument: any) : unknown[] {
        let example: any = {};

        if (typeof argument === 'undefined') {
            return example;
        }

        if (argument.properties) {
            argument.properties.forEach((p: any) => {
                example[p.name.text] = getInitializerValue(p.initializer, this.current.typeChecker);
            });
        } else {
            example = getInitializerValue(argument, this.current.typeChecker);
        }

        return example;
    }

    // -------------------------------------------

    protected getResponses(): Response[] {
        const representation = this.current.decoratorMapper.match(AnnotationKey.RESPONSE_DESCRIPTION, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const responses : Response[] = [];

        for (let i = 0; i < representation.decorators.length; i++) {
            const description = representation.getPropertyValue('description', i) || 'Ok';
            const status = representation.getPropertyValue('statusCode', i) || '200';
            const examples : unknown | unknown[] = representation.getPropertyValue('payload', i);

            const type = representation.getPropertyValue('type');

            const response : Response = {
                description,
                examples,
                schema: type ? new TypeNodeResolver(type as TypeNode, this.current).resolve() : undefined,
                status: status as string,
                name: status as string,
            };

            responses.push(response);
        }

        return responses;
    }

    // -------------------------------------------

    public getProduces() : string[] {
        const representation = this.current.decoratorMapper.match(AnnotationKey.RESPONSE_PRODUCES, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const value : string[] = representation.getPropertyValue('value');
        if (typeof value === 'undefined') {
            return [];
        }

        return Array.isArray(value) ? value : [value];
    }

    public getConsumes() : string[] {
        const representation = this.current.decoratorMapper.match(AnnotationKey.REQUEST_CONSUMES, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        let value : string[] = representation.getPropertyValue('value');
        if (typeof value === 'undefined') {
            return [];
        }

        value = Array.isArray(value) ? value : [value];

        return value;
    }

    public getTags() : string[] {
        const representation = this.current.decoratorMapper.match(AnnotationKey.SWAGGER_TAGS, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        let value : string[] = representation.getPropertyValue('value');
        if (typeof value === 'undefined') {
            return [];
        }

        value = Array.isArray(value) ? value : [value];

        return value;
    }

    // -------------------------------------------

    protected abstract getCurrentLocation(): string;

    // -------------------------------------------

    public isHidden(node: Node) : boolean {
        return typeof this.current.decoratorMapper.match(AnnotationKey.HIDDEN, node) !== 'undefined';
    }

    public isDeprecated(node: Node) : boolean {
        if (isExistJSDocTag(node, (tag) => tag.tagName.text === 'deprecated')) {
            return true;
        }

        return typeof this.current.decoratorMapper.match(AnnotationKey.DEPRECATED, node) !== 'undefined';
    }
}
