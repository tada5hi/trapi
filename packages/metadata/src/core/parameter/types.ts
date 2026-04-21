/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Validator } from '../validator/types';
import type { ArrayType, Type } from '../resolver/types';
import type { Example } from '../generator/types';
import type { CollectionFormat, ParameterSource } from './constants';

export interface Parameter {
    parameterName: string;
    description: string;
    in: `${ParameterSource}`;
    name: string;
    required: boolean;
    type: Type;
    collectionFormat?: `${CollectionFormat}`;
    allowEmptyValue?: boolean;
    default?: any;
    maxItems?: number;
    minItems?: number;
    deprecated?: boolean;

    examples?: Example[];
    exampleLabels?: string[],
    validators?: Record<string, Validator>;
}

export interface ArrayParameter extends Parameter {
    type: ArrayType;
}

export interface IParameterGenerator {
    generate(): Parameter[];
}
