/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { getPackageJsonStringValue } from '../../src';

describe('src/package-json.ts', () => {
    it('should get package json string value', () => {
        const cwd = process.cwd();
        const configPath = path.join(cwd, './test/data/');

        expect(getPackageJsonStringValue(configPath, 'name')).toBe('@trapi/common');
        expect(getPackageJsonStringValue(configPath, 'foo')).toBe('');
        expect(getPackageJsonStringValue(configPath, 'foo', 'bar')).toBe('bar');

        const nonExistingPath : string = path.join(configPath, 'non-existing');

        expect(getPackageJsonStringValue(nonExistingPath, 'foo')).toBe('');
        expect(getPackageJsonStringValue(nonExistingPath, 'foo', 'bar')).toBe('bar');
    });
});
