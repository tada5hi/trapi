/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@trapi/metadata-utils';
import { Decorator } from '../type';
import { extendRepresentationPropertyConfig, extractRepresentationPropertyValue } from './property/utils';
import TypePropertyMaps = Decorator.TypePropertyMap;

export class RepresentationManager<T extends Decorator.Type> {
    protected extendedProperties : Partial<Decorator.RepresentationProperties<Decorator.TypePropertyMap[T]>> = {};

    constructor(
        protected representation: Decorator.Representation<T>,
        public decorators: Decorator.Data[],
    ) {

    }

    // -------------------------------------------

    /**
     * Get one or more specific value(s) of the decorator arguments or typeArguments.
     * @param type
     * @param decoratorOrIndex
     */
    public getPropertyValue<P extends keyof Decorator.TypePropertyMap[T]>(
        type: P,
        decoratorOrIndex?: number | Decorator.Data,
    ) : TypePropertyMaps[T][P] | undefined {
        const config : Decorator.Property = this.getPropertyConfiguration(type);
        if (typeof config === 'undefined') {
            return undefined;
        }

        let decorator : Decorator.Data;

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

        return extractRepresentationPropertyValue<T, P>(decorator, config);
    }

    // -------------------------------------------

    public getPropertyConfiguration(type: keyof Decorator.TypePropertyMap[T]) : Decorator.Property | undefined {
        if (!hasOwnProperty(this.representation.properties, type)) {
            return undefined;
        }

        return this.extendProperty(type);
    }

    // -------------------------------------------

    protected extendProperty<P extends keyof Decorator.TypePropertyMap[T]>(type: P) : Decorator.Property {
        if (hasOwnProperty(this.extendedProperties, type)) {
            return this.extendedProperties[type];
        }

        const property = this.representation.properties[type];
        this.extendedProperties[type] = extendRepresentationPropertyConfig(property);

        return this.extendedProperties[type];
    }
}
