/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MapperID,
    MapperProperties,
    MapperPropertiesConfig,
    MapperPropertyConfig,
    MapperRepresentation,
    NodeDecorator,
} from '../types';
import { hasOwnProperty } from '../utils';
import { extendRepresentationPropertyConfig, extractRepresentationPropertyValue } from './property';

export class RepresentationManager<T extends MapperID> {
    protected extendedProperties: Partial<MapperPropertiesConfig<MapperProperties[T]>> = {};

    protected representation: MapperRepresentation<T>;

    public decorators: NodeDecorator[];

    constructor(
        representation: MapperRepresentation<T>,
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
    public getPropertyValue<P extends keyof MapperProperties[T]>(
        type: P,
        decoratorOrIndex?: number | NodeDecorator,
    ): MapperProperties[T][P] | undefined {
        const config: MapperPropertyConfig = this.getPropertyConfiguration(type);
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

    public getPropertyConfiguration(type: keyof MapperProperties[T]): MapperPropertyConfig | undefined {
        if (!hasOwnProperty(this.representation.properties, type)) {
            return undefined;
        }

        return this.extendProperty(type);
    }

    // -------------------------------------------

    protected extendProperty<P extends keyof MapperProperties[T]>(type: P): MapperPropertyConfig {
        if (hasOwnProperty(this.extendedProperties, type)) {
            return this.extendedProperties[type];
        }

        const property = this.representation.properties[type];
        this.extendedProperties[type] = extendRepresentationPropertyConfig(property);

        return this.extendedProperties[type];
    }
}
