/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JsDocMatch, Match } from './handler';
import type { DecoratorSource, JsDocSource } from './source';

export function matches(match: Match, source: Pick<DecoratorSource, 'name' | 'target'>): boolean {
    if (match.name !== source.name) {
        return false;
    }
    if (match.on && match.on !== source.target) {
        return false;
    }
    return true;
}

export function matchesJsDoc(match: JsDocMatch, source: Pick<JsDocSource, 'tag' | 'target'>): boolean {
    if (match.tag !== source.tag) {
        return false;
    }
    if (match.on && match.on !== source.target) {
        return false;
    }
    return true;
}
