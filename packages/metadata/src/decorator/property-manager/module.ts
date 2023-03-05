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
    DecoratorPropertiesConfig,
    DecoratorPropertyConfig,
} from '../index';
import type { NodeDecorator } from '../../utils';
import { hasOwnProperty } from '../../utils';
import { extendRepresentationPropertyConfig, extractRepresentationPropertyValue } from './utils';

export class DecoratorPropertyManager<T extends `${DecoratorID}`> {
    protected extendedProperties: Partial<DecoratorPropertiesConfig<DecoratorProperties<T>>> = {};

    protected representation: DecoratorConfig<T>;

    public decorators: NodeDecorator[];

    constructor(
        representation: DecoratorConfig<T>,
        decorators: NodeDecorator[],
    ) {
        this.representation = representation;
        this.decorators = decorators;
    }

    get key() : T {
        return this.representation.id;
    }

    // -------------------------------------------

    /**
     * Get one or more specific value(s) of the decorator arguments or typeArguments.
     *
     * @param type
     * @param decoratorOrIndex
     */
    public getPropertyValue<P extends keyof DecoratorProperties<T>>(
        type: P,
        decoratorOrIndex?: number | NodeDecorator,
    ): DecoratorProperties<T>[P] | undefined {
        const config = this.getPropertyConfiguration(type);
        if (typeof config === 'undefined') {
            return undefined;
        }

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

        return extractRepresentationPropertyValue(decorator, config) as DecoratorProperties<T>[P];
    }

    // -------------------------------------------

    public getPropertyConfiguration(type: keyof DecoratorProperties<T>): DecoratorPropertyConfig | undefined {
        if (!hasOwnProperty(this.representation.properties, type)) {
            return undefined;
        }

        return this.extendProperty(type);
    }

    // -------------------------------------------

    protected extendProperty<P extends keyof DecoratorProperties<T>>(type: P): DecoratorPropertyConfig {
        if (hasOwnProperty(this.extendedProperties, type)) {
            return this.extendedProperties[type];
        }

        const property = this.representation.properties[type];
        this.extendedProperties[type] = extendRepresentationPropertyConfig(property);

        return this.extendedProperties[type];
    }
}
