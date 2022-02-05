/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mapYupRuleForDictionary } from '../../src';

describe('src/yup.ts', () => {
    it('map yup rule for dictionary', () => {
        const dict : Record<string, any> = {
            foo: 'bar',
        };

        expect(mapYupRuleForDictionary(dict, 'baz')).toEqual({ foo: 'baz' });
        expect(mapYupRuleForDictionary({}, 'baz')).toEqual({});
        expect(mapYupRuleForDictionary(undefined, 'baz')).toEqual({});
    });
});
