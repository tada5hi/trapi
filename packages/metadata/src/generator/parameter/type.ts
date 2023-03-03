/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Validator } from '../../type';
import type { ArrayType, BaseType } from '../../resolver';

export interface Parameter {
    parameterName: string;
    description: string;
    in: string;
    name: string;
    required: boolean;
    type: BaseType;
    collectionFormat?: 'csv' | 'multi' | 'pipes' | 'ssv' | 'tsv';
    allowEmptyValue?: boolean;
    default?: any;
    maxItems?: number;
    minItems?: number;
    deprecated?: boolean;

    example?: unknown[];
    validators?: Record<string, Validator>;
}

export interface ArrayParameter extends Parameter {
    type: ArrayType;
}
