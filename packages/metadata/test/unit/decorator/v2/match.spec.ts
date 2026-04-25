/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { matches, matchesJsDoc } from '../../../../src/adapters/decorator/v2/utils';

describe('matches (decorator)', () => {
    it('matches by name when on is omitted', () => {
        expect(
            matches(
                { name: 'Get' },
                { name: 'Get', target: 'method' },
            ),
        ).toBe(true);
    });

    it('rejects when name differs', () => {
        expect(
            matches(
                { name: 'Get' },
                { name: 'Post', target: 'method' },
            ),
        ).toBe(false);
    });

    it('matches when on equals target', () => {
        expect(
            matches(
                { name: 'Body', on: 'parameter' },
                { name: 'Body', target: 'parameter' },
            ),
        ).toBe(true);
    });

    it('rejects when on differs from target', () => {
        expect(
            matches(
                { name: 'Body', on: 'parameter' },
                { name: 'Body', target: 'method' },
            ),
        ).toBe(false);
    });
});

describe('matchesJsDoc', () => {
    it('matches by tag when on is omitted', () => {
        expect(
            matchesJsDoc(
                { tag: 'hidden' },
                { tag: 'hidden', target: 'method' },
            ),
        ).toBe(true);
    });

    it('rejects when tag differs', () => {
        expect(
            matchesJsDoc(
                { tag: 'hidden' },
                { tag: 'deprecated', target: 'method' },
            ),
        ).toBe(false);
    });

    it('rejects when on differs from target', () => {
        expect(
            matchesJsDoc(
                { tag: 'hidden', on: 'class' },
                { tag: 'hidden', target: 'method' },
            ),
        ).toBe(false);
    });
});
