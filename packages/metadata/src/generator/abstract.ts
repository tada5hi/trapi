/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import type { Node, TypeNode } from 'typescript';
import { DecoratorID } from '../decorator';
import { TypeNodeResolver } from '../resolver';

import type { Example, Response, Security } from './type';
import {
    JSDocTagName, getInitializerValue, hasJSDocTag, normalizePath,
} from '../utils';
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
        key: `${DecoratorID.CLASS_PATH}` | `${DecoratorID.METHOD_PATH}`,
    ) : void {
        const values : string[] = [];

        const representation = this.current.decoratorResolver.match(key, this.node);
        if (typeof representation !== 'undefined') {
            const value = representation.get('value');
            if (typeof value !== 'undefined') {
                values.push(value);
            }
        }

        this.path = normalizePath(values.join('/'));
    }

    // -------------------------------------------

    protected getSecurity() : Security[] {
        const representation = this.current.decoratorResolver.match(DecoratorID.SECURITY, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const securities : Security[] = [];

        for (let i = 0; i < representation.decorators.length; i++) {
            let name = representation.get('key');
            // todo: check if Record<string, string[]>
            if (isObject(name)) {
                securities.push(name);
            } else {
                if (typeof name !== 'string' || !name) {
                    name = 'default';
                }

                const scopes = representation.get('value');

                if (Array.isArray(scopes)) {
                    securities.push({
                        [name]: scopes,
                    });
                }
            }
        }

        return securities;
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

    protected buildResponses(): Response[] {
        const representation = this.current.decoratorResolver.match(DecoratorID.RESPONSE_DESCRIPTION, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const responses : Response[] = [];

        for (let i = 0; i < representation.decorators.length; i++) {
            const description = representation.get('description', i) || 'Ok';
            const status = representation.get('statusCode', i) || '200';
            const payload = representation.get('payload', i);

            const examples : Example[] = [];
            if (typeof payload !== 'undefined') {
                examples.push({
                    value: payload,
                });
            }

            const type = representation.get('type');

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
        const representation = this.current.decoratorResolver.match(DecoratorID.RESPONSE_PRODUCES, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        const value : string[] = representation.get('value');
        if (typeof value === 'undefined') {
            return [];
        }

        return Array.isArray(value) ? value : [value];
    }

    public getConsumes() : string[] {
        const representation = this.current.decoratorResolver.match(DecoratorID.REQUEST_CONSUMES, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        let value : string[] = representation.get('value');
        if (typeof value === 'undefined') {
            return [];
        }

        value = Array.isArray(value) ? value : [value];

        return value;
    }

    public getTags() : string[] {
        const representation = this.current.decoratorResolver.match(DecoratorID.SWAGGER_TAGS, this.node);
        if (typeof representation === 'undefined') {
            return [];
        }

        let value : string[] = representation.get('value');
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
        return typeof this.current.decoratorResolver.match(DecoratorID.HIDDEN, node) !== 'undefined';
    }

    public isDeprecated(node: Node) : boolean {
        if (hasJSDocTag(node, JSDocTagName.DEPRECATED)) {
            return true;
        }

        return typeof this.current.decoratorResolver.match(DecoratorID.DEPRECATED, node) !== 'undefined';
    }
}