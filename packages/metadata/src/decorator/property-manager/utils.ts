/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import type { Expression } from 'typescript';
import type { NodeDecorator } from '../../utils';
import { getInitializerValue, hasOwnProperty } from '../../utils';
import type { DecoratorPropertyConfig, DecoratorPropertyConfigInput } from '../type';

export function buildDecoratorPropertyConfig(property: DecoratorPropertyConfigInput): DecoratorPropertyConfig {
    return {
        ...property,
        isType: property.isType ?? false,
        index: property.index ?? 0,
        amount: property.amount ?? 1,
    };
}

export function extractPropertyFromDecorator(
    decorator: NodeDecorator,
    config: DecoratorPropertyConfig,
): unknown | undefined {
    const items = config.isType ?
        decorator.typeArguments :
        extractValueFromArgumentType(decorator.arguments);

    if (items.length <= config.index) {
        return undefined;
    }

    const data = (
        config.amount >= 1 ?
            items.slice(config.index, config.index + config.amount) :
            items.slice(config.index)
    );

    if (data.length === 0) {
        return undefined;
    }

    if (config.strategy) {
        if (config.strategy === 'merge') {
            return mergeArguments(data);
        }

        return config.strategy(data);
    }

    if (config.amount === 1) {
        if (data.length > 0) {
            return data[0];
        }

        return undefined;
    }

    return data;
}

export function mergeArguments(data: unknown[]) {
    if (data.length === 0) {
        return undefined;
    }

    // we are merging object properties
    if (isObject(data[0])) {
        const element = data[0];
        if (data.length === 1) {
            return element;
        }

        for (let i = 1; i < data.length; i++) {
            if (isObject(data[i])) {
                Object.assign(element, data[i]);
            }
        }

        return element;
    }

    const output : any[] = Array.isArray(data[0]) ? data[0] : [data[0]];
    if (data.length === 1) {
        return output;
    }

    for (let i = 1; i < data.length; i++) {
        if (Array.isArray(data[i])) {
            output.push(...(data[i] as unknown[]));
        } else {
            output.push(data[i]);
        }
    }

    return output;
}

function extractValueFromArgumentType(argument: unknown[]) {
    const values : unknown[] = [];

    for (let i = 0; i < argument.length; i++) {
        if (!hasOwnProperty(argument[i], 'kind')) {
            values.push(argument[i]);
            continue;
        }

        values.push(getInitializerValue(argument[i] as Expression));
    }

    return values;
}
