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
    JSDocTagName, getInitializerValue, hasJSDocTag, isStringArray, normalizePath,
} from '../utils';
import type { MetadataGenerator } from './metadata';

export abstract class AbstractGenerator<T extends Node> {
    protected node: T;

    protected current : MetadataGenerator;

    // -------------------------------------------

    protected constructor(node: T, current: MetadataGenerator) {
        this.node = node;
        this.current = current;
    }

    // --------------------------------------------------------------------

    protected buildPath() : string {
        const representation = this.current.decoratorResolver.match(DecoratorID.MOUNT, this.node);
        if (typeof representation !== 'undefined') {
            const value = representation.get('value');
            if (typeof value === 'string') {
                return normalizePath(value);
            }
        }

        return '';
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

                if (isStringArray(scopes)) {
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
        const representation = this.current.decoratorResolver.match(DecoratorID.DESCRIPTION, this.node);
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
        const representation = this.current.decoratorResolver.match(DecoratorID.PRODUCES, this.node);
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
        const representation = this.current.decoratorResolver.match(DecoratorID.CONSUMES, this.node);
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
        const representation = this.current.decoratorResolver.match(DecoratorID.TAGS, this.node);
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
