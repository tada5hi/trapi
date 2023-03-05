/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import { DecoratorPropertyManager } from '../property-manager';
import type { DecoratorID } from '../constants';
import { loadPreset } from '../preset';
import type {
    DecoratorConfig,
} from '../type';
import type { NodeDecorator } from '../../utils';
import { getNodeDecorators, hasOwnProperty } from '../../utils';
import type { DecoratorResolverMap } from './type';

export class DecoratorResolver {
    protected items : DecoratorConfig[];

    protected map: DecoratorResolverMap;

    // -------------------------------------------

    constructor() {
        this.items = [];
        this.map = {};
    }

    // -------------------------------------------

    /**
     * Try to find a matching representation for a given decorator type and decorators or node.
     *
     * @param id
     * @param data
     */
    public match<T extends `${DecoratorID}`>(
        id: T,
        data: NodeDecorator[] | Node,
    ) : DecoratorPropertyManager<T> | undefined {
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
            const items = decorators.filter((decorator) => decorator.text === this.map[id][i].name);
            if (items.length > 0) {
                return new DecoratorPropertyManager<T>(
                    (this.map[id] as DecoratorConfig<T>[])[i],
                    items,
                );
            }
        }

        return undefined;
    }

    // -------------------------------------------

    apply(items: DecoratorConfig[]) {
        this.items.push(...items);

        this.aggregate();
    }

    async applyPreset(name: string) {
        const items = await loadPreset(name);
        this.items.push(...items);

        this.aggregate();
    }

    /**
     * Aggregate/group different annotation sources.
     *
     * @private
     */
    private aggregate(): void {
        const result: DecoratorResolverMap = {};

        for (let i = 0; i < this.items.length; i++) {
            const mapping = this.items[i];
            if (!Object.prototype.hasOwnProperty.call(result, mapping.id)) {
                result[mapping.id] = [];
            }

            (result[mapping.id] as DecoratorConfig[]).push(mapping);
        }

        this.map = result;
    }
}
