/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { normalizePath } from '../../../src';

describe('src/utils/path.ts', () => {
    it('should normalize path parameters', () => {
        expect(normalizePath('/domains//id/')).toEqual('domains/id');
    });
});
