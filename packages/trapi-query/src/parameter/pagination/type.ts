/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ParseOptionsBase } from '../../parse';
import { Parameter } from '../../type';

// -----------------------------------------------------------
// Build
// -----------------------------------------------------------

export type PaginationBuildInput<T> = {
    limit?: number,
    offset?: number
};

// -----------------------------------------------------------
// Parse
// -----------------------------------------------------------

export type PaginationParseOptions = ParseOptionsBase<Parameter.PAGINATION> & {
    maxLimit?: number
};

export type PaginationParseOutput = ParseOptionsBase<Parameter.PAGINATION> & {
    limit?: number,
    offset?: number
};
