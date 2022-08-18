/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@trapi/common';
import {
    Data,
    ID,
    Properties,
    PropertiesConfig,
    PropertyConfig,
    Representation,
} from '../types';
import { extendRepresentationPropertyConfig, extractRepresentationPropertyValue } from './property';

export class RepresentationManager<T extends ID> {
    protected extendedProperties: Partial<PropertiesConfig<Properties[T]>> = {};

    protected representation: Representation<T>;

    public decorators: Data[];

    constructor(
        representation: Representation<T>,
        decorators: Data[],
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
    public getPropertyValue<P extends keyof Properties[T]>(
        type: P,
        decoratorOrIndex?: number | Data,
    ): Properties[T][P] | undefined {
        const config: PropertyConfig = this.getPropertyConfiguration(type);
        if (typeof config === 'undefined') {
            return undefined;
        }

        let decorator: Data;

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

    public getPropertyConfiguration(type: keyof Properties[T]): PropertyConfig | undefined {
        if (!hasOwnProperty(this.representation.properties, type)) {
            return undefined;
        }

        return this.extendProperty(type);
    }

    // -------------------------------------------

    protected extendProperty<P extends keyof Properties[T]>(type: P): PropertyConfig {
        if (hasOwnProperty(this.extendedProperties, type)) {
            return this.extendedProperties[type];
        }

        const property = this.representation.properties[type];
        this.extendedProperties[type] = extendRepresentationPropertyConfig(property);

        return this.extendedProperties[type];
    }
}
