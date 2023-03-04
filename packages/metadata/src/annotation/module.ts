/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as console from 'console';
import type { Node } from 'typescript';
import { AnnotationPropertyManager } from './manager';
import type { AnnotationKey } from './constants';
import { loadPreset } from './preset';
import type {
    AnnotationRepresentation,
    AnnotationRepresentations,
    MapperRepresentations,
} from './type';
import type { NodeDecorator } from '../utils';
import { getNodeDecorators, hasOwnProperty } from '../utils';

export class AnnotationResolver {
    protected map: MapperRepresentations;

    // -------------------------------------------

    constructor(input?: string | AnnotationRepresentations) {
        this.map = {};
        this.setup(input);
    }

    has(id: `${AnnotationKey}`) {
        return hasOwnProperty(this.map, id);
    }

    getAll() {
        return this.map;
    }

    // -------------------------------------------

    /**
     * Try to find a matching representation for a given decorator type and decorators or node.
     *
     * @param id
     * @param data
     */
    public match<T extends `${AnnotationKey}`>(
        id: T,
        data: NodeDecorator[] | Node,
    ) : AnnotationPropertyManager<T> | undefined {
        if (!hasOwnProperty(this.map, id)) {
            return undefined;
        }

        const decorators: NodeDecorator[] = Array.isArray(data) ?
            data :
            getNodeDecorators(data);

        if (!hasOwnProperty(this.map, id)) {
            return undefined;
        }

        for (let i = 0; i < this.map[id].length; i++) {
            const items = decorators.filter((decorator) => decorator.text === this.map[id][i].id);
            if (items.length > 0) {
                return new AnnotationPropertyManager<T>(
                    (this.map[id] as AnnotationRepresentation<T>[])[i],
                    items,
                );
            }
        }

        return undefined;
    }

    // -------------------------------------------

    setup(input?: string | AnnotationRepresentations): void {
        let items: AnnotationRepresentations = [];

        if (typeof input === 'string') {
            items = loadPreset(input);
        } else if (Array.isArray(input)) {
            items = input;
        }

        this.map = this.aggregate(...items);
    }

    /**
     * Aggregate/group different annotation sources.
     *
     * @param input
     * @private
     */
    private aggregate(...input: AnnotationRepresentations): MapperRepresentations {
        const result: MapperRepresentations = {};

        for (let i = 0; i < input.length; i++) {
            const mapping = input[i];
            if (!Object.prototype.hasOwnProperty.call(result, mapping.key)) {
                result[mapping.key] = [];
            }

            (result[mapping.key] as AnnotationRepresentation[]).push(mapping);
        }

        return result;
    }
}
