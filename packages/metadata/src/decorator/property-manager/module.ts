/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DecoratorConfig,
    DecoratorID,
    DecoratorProperties,
    DecoratorPropertyConfig,
} from '../index';
import type { NodeDecorator } from '../../utils';
import { hasOwnProperty } from '../../utils';
import { buildDecoratorPropertyConfig, extractPropertyFromDecorator } from './utils';

export class DecoratorPropertyManager<T extends `${DecoratorID}`> {
    public readonly representation: DecoratorConfig<T>;

    public readonly decorators: NodeDecorator[];

    protected properties: Record<string, DecoratorPropertyConfig>;

    constructor(
        representation: DecoratorConfig<T>,
        decorators: NodeDecorator[],
    ) {
        this.representation = representation;
        this.decorators = decorators;
        this.properties = {};

        this.build();
    }

    // -------------------------------------------

    /**
     * Get one or more specific value(s) of the decorator arguments or typeArguments.
     *
     * @param type
     * @param decoratorOrIndex
     */
    public get<P extends keyof DecoratorProperties<T>>(
        type: P,
        decoratorOrIndex?: number | NodeDecorator,
    ): DecoratorProperties<T>[P] | undefined {
        if (!hasOwnProperty(this.properties, type)) {
            return undefined;
        }

        const config = this.properties[type];

        let decorator: NodeDecorator;

        if (
            typeof decoratorOrIndex === 'number' ||
            typeof decoratorOrIndex === 'undefined'
        ) {
            decoratorOrIndex = decoratorOrIndex ?? 0;
            if (decoratorOrIndex < 0 || decoratorOrIndex >= this.decorators.length) {
                return undefined;
            }

            decorator = this.decorators[decoratorOrIndex];
        } else {
            decorator = decoratorOrIndex;
        }

        return extractPropertyFromDecorator(decorator, config) as DecoratorProperties<T>[P];
    }

    // -------------------------------------------

    protected build() {
        if (!this.representation.properties) {
            return;
        }

        const keys = Object.keys(this.representation.properties);
        const output : Record<string, DecoratorPropertyConfig> = {};
        for (let i = 0; i < keys.length; i++) {
            output[keys[i]] = buildDecoratorPropertyConfig(this.representation.properties[keys[i]]);
        }

        this.properties = output;
    }
}
