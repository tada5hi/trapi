/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    type DecoratorArgument,
    type DecoratorTypeArgument,
    append,
    createHandlerContext,
    flag,
    into,
    newControllerDraft,
    newMethodDraft,
    newParameterDraft,
} from '../../../src/adapters/decorator';
import type { Type } from '../../../src/core/resolver/types';

function makeContext(args: DecoratorArgument[], typeArgs: DecoratorTypeArgument[] = []) {
    return createHandlerContext({ args, typeArgs });
}

describe('into', () => {
    it('positional(i) writes literal arg into draft key', () => {
        const draft = newControllerDraft({ name: 'C', location: 'test.ts' });
        const apply = into('name').positional(0);
        apply(makeContext([{ raw: 'Renamed', kind: 'literal' }]), draft);
        expect(draft.name).toEqual('Renamed');
    });

    it('positional(i) writes identifier arg into draft key', () => {
        const draft = newControllerDraft({ name: 'C', location: 'test.ts' });
        const apply = into('name').positional(0);
        apply(makeContext([{ raw: 'Ident', kind: 'identifier' }]), draft);
        expect(draft.name).toEqual('Ident');
    });

    it('positional(i) skips when arg is unresolvable', () => {
        const draft = newControllerDraft({ name: 'C', location: 'test.ts' });
        const apply = into('name').positional(0);
        apply(makeContext([{ raw: undefined, kind: 'unresolvable' }]), draft);
        expect(draft.name).toEqual('C');
    });

    it('positional(i) does nothing when arg is missing', () => {
        const draft = newControllerDraft({ name: 'C', location: 'test.ts' });
        const apply = into('name').positional(0);
        apply(makeContext([]), draft);
        expect(draft.name).toEqual('C');
    });

    it('typeArgument writes resolved type into draft key', () => {
        const draft = newMethodDraft({ name: 'list' });
        const stub = { typeName: 'string' } as unknown as Type;
        const apply = into('type').typeArgument();
        apply(makeContext([], [{ resolve: () => stub }]), draft);
        expect(draft.type).toEqual(stub);
    });
});

describe('append', () => {
    it('positional(i) appends literal arg to existing array', () => {
        const draft = newMethodDraft({ name: 'list' });
        const apply = append('produces').positional(0);
        apply(makeContext([{ raw: 'application/json', kind: 'literal' }]), draft);
        expect(draft.produces).toEqual(['application/json']);
    });

    it('positional(i) flattens an array argument', () => {
        const draft = newMethodDraft({ name: 'list' });
        const apply = append('produces').positional(0);
        apply(makeContext([{ raw: ['a', 'b'], kind: 'array' }]), draft);
        expect(draft.produces).toEqual(['a', 'b']);
    });

    it('positionalAll() appends all args', () => {
        const draft = newMethodDraft({ name: 'list' });
        const apply = append('tags').positionalAll();
        apply(
            makeContext([
                { raw: 'auth', kind: 'literal' },
                { raw: 'admin', kind: 'literal' },
            ]),
            draft,
        );
        expect(draft.tags).toEqual(['auth', 'admin']);
    });

    it('positionalAll() flattens array args', () => {
        const draft = newMethodDraft({ name: 'list' });
        const apply = append('tags').positionalAll();
        apply(
            makeContext([
                { raw: ['a', 'b'], kind: 'array' },
                { raw: 'c', kind: 'literal' },
            ]),
            draft,
        );
        expect(draft.tags).toEqual(['a', 'b', 'c']);
    });

    it('appends to a fresh array when key not yet set', () => {
        const draft = newParameterDraft({ parameterName: 'p' });
        const apply = append('exampleLabels').positional(0);
        apply(makeContext([{ raw: 'first', kind: 'literal' }]), draft);
        expect(draft.exampleLabels).toEqual(['first']);
    });

    it('throws when existing key holds a non-array value', () => {
        const draft = newControllerDraft({ name: 'C', location: 'test.ts' });
        (draft as Record<string, unknown>).name = 'scalar';
        const apply = append('name').positional(0);
        expect(() => apply(makeContext([{ raw: 'x', kind: 'literal' }]), draft))
            .toThrow(/not an array/);
    });
});

describe('flag', () => {
    it('sets the key to true by default', () => {
        const draft = newControllerDraft({ name: 'C', location: 'test.ts' });
        const apply = flag('hidden');
        apply(makeContext([]), draft);
        expect(draft.hidden).toBe(true);
    });

    it('sets a custom value', () => {
        const draft = newMethodDraft({ name: 'list' });
        const apply = flag('verb', 'get');
        apply(makeContext([]), draft);
        expect(draft.verb).toEqual('get');
    });
});
