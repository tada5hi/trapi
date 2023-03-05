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
import type { DecoratorResolverContext, DecoratorResolverMap } from './type';

export class DecoratorResolver {
    protected map: DecoratorResolverMap;

    // -------------------------------------------

    constructor(input?: DecoratorResolverContext) {
        this.map = {};
        this.setup(input || {});
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

    setup(context: DecoratorResolverContext): void {
        const items: DecoratorConfig[] = [];

        if (context.preset) {
            items.push(...loadPreset(context.preset));
        }

        if (context.decorators) {
            items.push(...context.decorators);
        }

        this.map = this.aggregate(...items);
    }

    /**
     * Aggregate/group different annotation sources.
     *
     * @param input
     * @private
     */
    private aggregate(...input: DecoratorConfig[]): DecoratorResolverMap {
        const result: DecoratorResolverMap = {};

        for (let i = 0; i < input.length; i++) {
            const mapping = input[i];
            if (!Object.prototype.hasOwnProperty.call(result, mapping.id)) {
                result[mapping.id] = [];
            }

            (result[mapping.id] as DecoratorConfig[]).push(mapping);
        }

        return result;
    }
}
