/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    MapperID,
    MapperIDProperties,
    MapperIDPropertiesConfig,
    MapperIDPropertyConfig,
    MapperIDRepresentationItem,
    NodeDecorator,
} from '../types';
import { hasOwnProperty } from '../utils';
import { extendRepresentationPropertyConfig, extractRepresentationPropertyValue } from './property';

export class RepresentationManager<T extends MapperID> {
    protected extendedProperties: Partial<MapperIDPropertiesConfig<MapperIDProperties[T]>> = {};

    protected representation: MapperIDRepresentationItem<T>;

    public decorators: NodeDecorator[];

    constructor(
        representation: MapperIDRepresentationItem<T>,
        decorators: NodeDecorator[],
    ) {
        this.representation = representation;
        this.decorators = decorators;
    }

    // -------------------------------------------

    /**
     * Get one or more specific value(s) of the decorator arguments or typeArguments.
     * @param type
     * @param decoratorOrIndex
     */
    public getPropertyValue<P extends keyof MapperIDProperties[T]>(
        type: P,
        decoratorOrIndex?: number | NodeDecorator,
    ): MapperIDProperties[T][P] | undefined {
        const config: MapperIDPropertyConfig = this.getPropertyConfiguration(type);
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

        return extractRepresentationPropertyValue<T, P>(decorator, config);
    }

    // -------------------------------------------

    public getPropertyConfiguration(type: keyof MapperIDProperties[T]): MapperIDPropertyConfig | undefined {
        if (!hasOwnProperty(this.representation.properties, type)) {
            return undefined;
        }

        return this.extendProperty(type);
    }

    // -------------------------------------------

    protected extendProperty<P extends keyof MapperIDProperties[T]>(type: P): MapperIDPropertyConfig {
        if (hasOwnProperty(this.extendedProperties, type)) {
            return this.extendedProperties[type];
        }

        const property = this.representation.properties[type];
        this.extendedProperties[type] = extendRepresentationPropertyConfig(property);

        return this.extendedProperties[type];
    }
}
