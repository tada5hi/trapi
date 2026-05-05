/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    type ControllerHandler,
    type ControllerJsDocHandler,
    MarkerName,
    type MethodHandler,
    NumericKind,
    type ParameterHandler,
    type ParameterJsDocHandler,
    type Registry,
    createRegistry,
    isDeprecatedMarker,
    isExtensionMarker,
    isHiddenMarker,
    namesForMarker,
    numericMarkerKind,
    tagsForMarker,
} from '../../../src/decorator';

const noop = () => { /* no-op */ };

function buildRegistry(overrides: Partial<Registry>): Registry {
    return {
        ...createRegistry(),
        ...overrides,
    };
}

const hiddenController: ControllerHandler = {
    match: { name: 'Skip', on: 'class' },
    apply: noop,
    marker: MarkerName.Hidden,
};

const hiddenMethod: MethodHandler = {
    match: { name: 'Hide', on: 'method' },
    apply: noop,
    marker: MarkerName.Hidden,
};

const deprecatedController: ControllerHandler = {
    match: { name: 'Gone', on: 'class' },
    apply: noop,
    marker: MarkerName.Deprecated,
};

const extensionMethod: MethodHandler = {
    match: { name: 'Ext', on: 'method' },
    apply: noop,
    marker: MarkerName.Extension,
};

const intParameter: ParameterHandler = {
    match: { name: 'AsInt', on: 'parameter' },
    apply: noop,
    marker: { numeric: NumericKind.Int },
};

const longParameter: ParameterHandler = {
    match: { name: 'AsLong', on: 'parameter' },
    apply: noop,
    marker: { numeric: NumericKind.Long },
};

const unmarkedController: ControllerHandler = {
    match: { name: 'Plain', on: 'class' },
    apply: noop,
};

const hiddenJsDoc: ControllerJsDocHandler = {
    match: { tag: 'gone' },
    apply: noop,
    marker: MarkerName.Hidden,
};

const deprecatedJsDoc: ParameterJsDocHandler = {
    match: { tag: 'old' },
    apply: noop,
    marker: MarkerName.Deprecated,
};

describe('namesForMarker', () => {
    it('returns empty set for an empty registry', () => {
        const names = namesForMarker(createRegistry(), isHiddenMarker);
        expect([...names]).toEqual([]);
    });

    it('returns names of handlers across kinds whose marker matches', () => {
        const registry = buildRegistry({
            controllers: [hiddenController, deprecatedController, unmarkedController],
            methods: [hiddenMethod, extensionMethod],
            parameters: [intParameter],
        });
        expect([...namesForMarker(registry, isHiddenMarker)].sort()).toEqual(['Hide', 'Skip']);
    });

    it('skips handlers without a marker', () => {
        const registry = buildRegistry({ controllers: [unmarkedController, hiddenController] });
        expect([...namesForMarker(registry, isHiddenMarker)]).toEqual(['Skip']);
    });

    it('deduplicates same-name handlers tagged with the marker', () => {
        const second: ControllerHandler = { ...hiddenController };
        const registry = buildRegistry({ controllers: [hiddenController, second] });
        expect([...namesForMarker(registry, isHiddenMarker)]).toEqual(['Skip']);
    });

    it('does not include JSDoc handlers (those go through tagsForMarker)', () => {
        const registry = buildRegistry({ controllerJsDoc: [hiddenJsDoc] });
        expect([...namesForMarker(registry, isHiddenMarker)]).toEqual([]);
    });

    it('separates extension and deprecated lookups', () => {
        const registry = buildRegistry({
            controllers: [hiddenController, deprecatedController],
            methods: [extensionMethod],
        });
        expect([...namesForMarker(registry, isExtensionMarker)]).toEqual(['Ext']);
        expect([...namesForMarker(registry, isDeprecatedMarker)]).toEqual(['Gone']);
    });
});

describe('tagsForMarker', () => {
    it('returns empty set for an empty registry', () => {
        const tags = tagsForMarker(createRegistry(), isHiddenMarker);
        expect([...tags]).toEqual([]);
    });

    it('returns tags of JSDoc handlers whose marker matches', () => {
        const registry = buildRegistry({
            controllerJsDoc: [hiddenJsDoc],
            parameterJsDoc: [deprecatedJsDoc],
        });
        expect([...tagsForMarker(registry, isHiddenMarker)]).toEqual(['gone']);
        expect([...tagsForMarker(registry, isDeprecatedMarker)]).toEqual(['old']);
    });

    it('skips JSDoc handlers without a marker', () => {
        const plain: ControllerJsDocHandler = { match: { tag: 'note' }, apply: noop };
        const registry = buildRegistry({ controllerJsDoc: [plain, hiddenJsDoc] });
        expect([...tagsForMarker(registry, isHiddenMarker)]).toEqual(['gone']);
    });
});

describe('numericMarkerKind', () => {
    it('returns the numeric kind for the four NumericKind values', () => {
        expect(numericMarkerKind({ numeric: NumericKind.Int })).toEqual('int');
        expect(numericMarkerKind({ numeric: NumericKind.Long })).toEqual('long');
        expect(numericMarkerKind({ numeric: NumericKind.Float })).toEqual('float');
        expect(numericMarkerKind({ numeric: NumericKind.Double })).toEqual('double');
    });

    it('returns undefined for non-numeric markers', () => {
        expect(numericMarkerKind(MarkerName.Hidden)).toBeUndefined();
        expect(numericMarkerKind(MarkerName.Deprecated)).toBeUndefined();
        expect(numericMarkerKind(MarkerName.Extension)).toBeUndefined();
    });
});

describe('numeric marker discovery', () => {
    it('namesForMarker filters by numeric kind via predicate composition', () => {
        const registry = buildRegistry({ parameters: [intParameter, longParameter] });
        const intNames = namesForMarker(registry, (m) => numericMarkerKind(m) === 'int');
        const longNames = namesForMarker(registry, (m) => numericMarkerKind(m) === 'long');
        expect([...intNames]).toEqual(['AsInt']);
        expect([...longNames]).toEqual(['AsLong']);
    });
});

describe('marker boolean predicates', () => {
    it('isHiddenMarker only matches the hidden marker', () => {
        expect(isHiddenMarker(MarkerName.Hidden)).toBe(true);
        expect(isHiddenMarker(MarkerName.Deprecated)).toBe(false);
        expect(isHiddenMarker({ numeric: NumericKind.Int })).toBe(false);
    });

    it('isDeprecatedMarker only matches the deprecated marker', () => {
        expect(isDeprecatedMarker(MarkerName.Deprecated)).toBe(true);
        expect(isDeprecatedMarker(MarkerName.Hidden)).toBe(false);
    });

    it('isExtensionMarker only matches the extension marker', () => {
        expect(isExtensionMarker(MarkerName.Extension)).toBe(true);
        expect(isExtensionMarker(MarkerName.Hidden)).toBe(false);
    });
});
