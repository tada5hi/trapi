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

// <label, scope[]>
export type Security = Record<string, string[]>;

export interface Example {
    value: unknown | unknown[];
    summary?: string;
    description?: string;
    label?: string
}

export interface Response {
    description: string;
    examples?: Example[];
    headers?: NestedObjectLiteralType | RefObjectType;
    name: string;
    produces?: string[],
    status: string;
    schema?: BaseType;
}
