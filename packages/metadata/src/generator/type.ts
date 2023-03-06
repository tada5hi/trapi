/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { BaseType, NestedObjectLiteralType, RefObjectType } from '../resolver';

export type {
    CompilerOptions,
};

export interface Security {
    name: string;
    scopes?: string[];
}

export interface Response {
    description: string;
    examples?: unknown[] | unknown;
    headers?: NestedObjectLiteralType | RefObjectType;
    name: string;
    status: string;
    schema?: BaseType;
}
