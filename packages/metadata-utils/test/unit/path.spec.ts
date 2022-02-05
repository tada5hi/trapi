/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizePath, normalizePathParameters } from '../../src';

describe('src/path.ts', () => {
    it('should normalize path parameters', () => {
        expect(normalizePath('/domains//id/')).toEqual('domains/id');
    });

    it('should normalize path parameters', () => {
        expect(normalizePathParameters('/domains')).toBe('/domains');
        expect(normalizePathParameters('/domains/:id')).toBe('/domains/{id}');
        expect(normalizePathParameters('/domains/<id>')).toBe('/domains/{id}');
        expect(normalizePathParameters('/domains/<:id>')).toBe('/domains/{id}');
    });
});
