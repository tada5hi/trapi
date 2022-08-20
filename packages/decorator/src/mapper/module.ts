/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Node } from 'typescript';
import { RepresentationManager } from '../representation';
import {
    Config,
    Data,
    ID,
    Representation,
    RepresentationMap,
} from '../types';
import { getNodeDecorators, hasOwnProperty } from '../utils';
import { getDecoratorMap, isMappingTypeIncluded, reduceTypeRepresentationMapping } from './utils';

export class DecoratorMapper {
    protected mapping: Partial<RepresentationMap> = {};

    constructor(
        protected config?: Config,
    ) {
        this.aggregate();
    }

    public setConfig(config?: Config) {
        this.config = config;
        this.aggregate();
    }

    /**
     * Try to find a matching representation for a given decorator type and decorators or node.
     *
     * @param type
     * @param data
     */
    public match<T extends ID>(
        type: T,
        data: Data[] | Node,
    ) {
        if (!hasOwnProperty(this.mapping, type)) {
            return undefined;
        }

        const decorators: Data[] = Array.isArray(data) ? data : getNodeDecorators(data);

        const representations: Array<Representation<T>> = (Array.isArray(this.mapping[type]) ?
            this.mapping[type] :
            [this.mapping[type]]) as Array<Representation<T>>;

        for (let i = 0; i < representations.length; i++) {
            const items = decorators.filter((decorator) => decorator.text === representations[i].id);
            if (items.length > 0) {
                return new RepresentationManager<T>(
                    representations[i],
                    items,
                );
            }
        }

        return undefined;
    }

    // -------------------------------------------

    private aggregate(): void {
        if (typeof this.config === 'undefined') {
            this.mapping = {};
            return;
        }

        const items: Array<Partial<RepresentationMap>> = [];

        // mapping - internal
        const internalMap = getDecoratorMap('internal');
        items.push(
            typeof this.config.internal === 'undefined' ?
                internalMap :
                reduceTypeRepresentationMapping(internalMap, (type) => isMappingTypeIncluded(type, this.config.internal)),
        );

        // mapping - extension
        if (typeof this.config.map !== 'undefined') {
            items.push(this.config.map);
        }

        // mapping - library
        if (typeof this.config.library !== 'undefined') {
            // check if string or string[]

            if (
                typeof this.config.library === 'string' ||
                Array.isArray(this.config.library)
            ) {
                const libraries: string[] = Array.isArray(this.config.library) ?
                    this.config.library :
                    [this.config.library];

                items.push(...libraries.map((library) => getDecoratorMap(library)));
            } else {
                const keys = Object.keys(this.config.library);
                for (let i = 0; i < keys.length; i++) {
                    items.push(
                        reduceTypeRepresentationMapping(
                            getDecoratorMap(keys[i]),
                            (type) => isMappingTypeIncluded(type, this.config.library[keys[i]]),
                        ),
                    );
                }
            }
        }

        this.mapping = this.merge(...items);
    }

    /**
     * Merge decorator type-representation mappings of different libraries together.
     *
     * @param mappings
     * @private
     */
    private merge(...mappings: Array<Partial<RepresentationMap>>): Partial<RepresentationMap> {
        const result: Partial<RepresentationMap> = {};

        // we need all available mapping keys :)
        let keys: ID[] = mappings
            .map((mapping) => Object.keys(mapping))
            .reduce(((previousValue, currentValue) => [...previousValue, ...currentValue])) as ID[];

        keys = Array.from(new Set(keys));

        for (let i = 0; i < keys.length; i++) {
            const representations: Array<Representation<any>> = [];

            for (let j = 0; j < mappings.length; j++) {
                if (hasOwnProperty(mappings[j], keys[i])) {
                    const value: Representation<any> | Array<Representation<any>> = mappings[j][keys[i]];

                    if (typeof value === 'undefined') {
                        continue;
                    }

                    if (Array.isArray(value)) {
                        representations.push(...value);
                    } else {
                        representations.push(value);
                    }
                }
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            result[keys[i]] = representations;
        }

        return result;
    }
}
