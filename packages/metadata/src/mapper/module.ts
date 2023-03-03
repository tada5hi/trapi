/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import { RepresentationManager } from '../representation';
import type {
    AnnotationOptions,
    MapperID,
    MapperIDRepresentation,
    MapperIDRepresentationItem,
    NodeDecorator,
} from '../types';
import { getNodeDecorators, hasOwnProperty } from '../utils';
import { isMappingTypeIncluded, reduceTypeRepresentationMapping, useDecoratorMap } from './utils';

export class Mapper {
    protected config?: AnnotationOptions;

    protected map: Partial<MapperIDRepresentation> = {};

    // -------------------------------------------

    constructor(config?: AnnotationOptions) {
        this.setConfig(config);
    }

    // -------------------------------------------

    public setConfig(config?: AnnotationOptions) {
        this.config = config;
        this.aggregate();
    }

    /**
     * Try to find a matching representation for a given decorator type and decorators or node.
     *
     * @param id
     * @param data
     */
    public match<T extends MapperID>(
        id: T,
        data: NodeDecorator[] | Node,
    ) : RepresentationManager<T> | undefined {
        if (!hasOwnProperty(this.map, id)) {
            return undefined;
        }

        const decorators: NodeDecorator[] = Array.isArray(data) ?
            data :
            getNodeDecorators(data);

        const representations: Array<MapperIDRepresentationItem<T>> = (Array.isArray(this.map[id]) ?
            this.map[id] :
            [this.map[id]]) as Array<MapperIDRepresentationItem<T>>;

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
            this.map = {};
            return;
        }

        const items: Array<Partial<MapperIDRepresentation>> = [];

        // mapping - internal
        const internalMap = useDecoratorMap('internal');
        items.push(
            typeof this.config.internal === 'undefined' ?
                internalMap :
                reduceTypeRepresentationMapping(internalMap, (type) => isMappingTypeIncluded(type, this.config.internal)),
        );

        // mapping - extension
        if (typeof this.config.custom !== 'undefined') {
            items.push(this.config.custom);
        }

        // mapping - library
        if (typeof this.config.preset !== 'undefined') {
            // check if string or string[]

            if (
                typeof this.config.preset === 'string' ||
                Array.isArray(this.config.preset)
            ) {
                const libraries: string[] = Array.isArray(this.config.preset) ?
                    this.config.preset :
                    [this.config.preset];

                items.push(...libraries.map((library) => useDecoratorMap(library)));
            } else {
                const keys = Object.keys(this.config.preset);
                for (let i = 0; i < keys.length; i++) {
                    items.push(
                        reduceTypeRepresentationMapping(
                            useDecoratorMap(keys[i]),
                            (type) => isMappingTypeIncluded(type, this.config.preset[keys[i]]),
                        ),
                    );
                }
            }
        }

        this.map = this.merge(...items);
    }

    /**
     * Merge decorator type-representation mappings of different libraries together.
     *
     * @param mappings
     * @private
     */
    private merge(...mappings: Array<Partial<MapperIDRepresentation>>): Partial<MapperIDRepresentation> {
        const result: Partial<MapperIDRepresentation> = {};

        // we need all available mapping keys :)
        let keys: MapperID[] = mappings
            .map((mapping) => Object.keys(mapping))
            .reduce(((previousValue, currentValue) => [...previousValue, ...currentValue])) as MapperID[];

        keys = Array.from(new Set(keys));

        for (let i = 0; i < keys.length; i++) {
            const representations: Array<MapperIDRepresentationItem<any>> = [];

            for (let j = 0; j < mappings.length; j++) {
                if (hasOwnProperty(mappings[j], keys[i])) {
                    const value: MapperIDRepresentationItem<any> | Array<MapperIDRepresentationItem<any>> = mappings[j][keys[i]];

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
