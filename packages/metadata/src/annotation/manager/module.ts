/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AnnotationData,
    AnnotationKey,
    AnnotationRepresentation,
    AnnotationRepresentationConfig,
    RepresentationPropertyConfig,
} from '../index';
import type { NodeDecorator } from '../../utils';
import { hasOwnProperty } from '../../utils';
import { extendRepresentationPropertyConfig, extractRepresentationPropertyValue } from './property';

export class AnnotationPropertyManager<T extends `${AnnotationKey}`> {
    protected extendedProperties: Partial<AnnotationRepresentationConfig<AnnotationData<T>>> = {};

    protected representation: AnnotationRepresentation<T>;

    public decorators: NodeDecorator[];

    constructor(
        representation: AnnotationRepresentation<T>,
        decorators: NodeDecorator[],
    ) {
        this.representation = representation;
        this.decorators = decorators;
    }

    get key() : T {
        return this.representation.key;
    }

    // -------------------------------------------

    /**
     * Get one or more specific value(s) of the decorator arguments or typeArguments.
     *
     * @param type
     * @param decoratorOrIndex
     */
    public getPropertyValue<P extends keyof AnnotationData<T>>(
        type: P,
        decoratorOrIndex?: number | NodeDecorator,
    ): AnnotationData<T>[P] | undefined {
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

        return extractRepresentationPropertyValue(decorator, config) as AnnotationData<T>[P];
    }

    // -------------------------------------------

    public getPropertyConfiguration(type: keyof AnnotationData<T>): RepresentationPropertyConfig | undefined {
        if (!hasOwnProperty(this.representation.properties, type)) {
            return undefined;
        }

        return this.extendProperty(type);
    }

    // -------------------------------------------

    protected extendProperty<P extends keyof AnnotationData<T>>(type: P): RepresentationPropertyConfig {
        if (hasOwnProperty(this.extendedProperties, type)) {
            return this.extendedProperties[type];
        }

        const property = this.representation.properties[type];
        this.extendedProperties[type] = extendRepresentationPropertyConfig(property);

        return this.extendedProperties[type];
    }
}
