/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '../../src';

describe('src/object.ts', () => {
    it('should determine if property exist', () => {
        const ob : Record<string, any> = {
            foo: 'bar',
        };

        expect(hasOwnProperty(ob, 'foo')).toBeTruthy();
        expect(hasOwnProperty(ob, 'bar')).toBeFalsy();
    });
});
