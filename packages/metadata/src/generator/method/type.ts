/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BaseType, Extension } from '../../resolver';
import type { Parameter } from '../parameter';
import type { Response, Security } from '../type';

export interface Method {
    operationId?: string;
    deprecated?: boolean;
    description: string;
    method: MethodType;
    extensions: Extension[];
    name: string;
    parameters: Parameter[];
    path: string;
    type: BaseType;
    tags: string[];
    responses: Response[];
    security?: Security[];
    summary?: string;
    consumes: string[];
    produces: string[];
    hidden: boolean;
}

export type MethodType = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch';
