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
    identifierArg,
    into,
    literalArg,
    newControllerDraft,
    newMethodDraft,
    newParameterDraft,
    readNumber,
    readString,
    requireArgument,
    requireNumber,
    requireString,
    unresolvableArg,
} from '../../../src/decorator';
import { CoreErrorCode } from '../../../src/error/codes';
import type { Type } from '../../../src/resolver/types';

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

describe('draft factories', () => {
    it('newMethodDraft initialises successProduces to []', () => {
        expect(newMethodDraft({ name: 'list' }).successProduces).toEqual([]);
    });

    it('newControllerDraft initialises successProduces to []', () => {
        expect(newControllerDraft({ name: 'C', location: 'test.ts' }).successProduces).toEqual([]);
    });
});

describe('readNumber', () => {
    it('reads a numeric literal', () => {
        expect(readNumber(literalArg(201))).toBe(201);
    });

    it('reads a numeric identifier', () => {
        expect(readNumber(identifierArg(202))).toBe(202);
    });

    it('ignores a string identifier', () => {
        expect(readNumber(identifierArg('202'))).toBeUndefined();
    });
});

describe('requireNumber', () => {
    it('returns undefined when the argument is absent', () => {
        expect(requireNumber(createHandlerContext(), 0)).toBeUndefined();
    });

    it('returns a literal', () => {
        expect(requireNumber(createHandlerContext({ args: [literalArg(201)] }), 0)).toBe(201);
    });

    it('returns a resolved constant', () => {
        expect(requireNumber(createHandlerContext({ args: [identifierArg(202)] }), 0)).toBe(202);
    });

    it('throws DECORATOR_ARGUMENT_INVALID for an unresolvable argument', () => {
        const ctx = createHandlerContext({
            args: [unresolvableArg()],
            host: { name: 'create', parentName: 'UserController' },
            decorator: { name: 'Returns', location: { file: 'users.ts', line: 12 } },
        });

        let caught: unknown;

        try {
            requireNumber(ctx, 0);
        } catch (e) {
            caught = e;
        }

        expect(caught).toMatchObject({ code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID });
        expect((caught as Error).message).toEqual(
            "Argument 0 of '@Returns' on 'UserController.create' must be a number, " +
            'but could not be resolved to one. (users.ts:12)',
        );
        expect((caught as Error).message).toContain('@Returns');
        expect((caught as Error).message).toContain('UserController.create');
        expect((caught as Error).message).toContain('users.ts:12');
    });

    it('throws for a string literal', () => {
        const ctx = createHandlerContext({ args: [literalArg('201')] });

        expect(() => requireNumber(ctx, 0)).toThrow(expect.objectContaining({ code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID }));
    });

    it('omits the location when unknown', () => {
        const ctx = createHandlerContext({
            args: [unresolvableArg()],
            host: { name: 'create' },
            decorator: { name: 'Returns' },
        });

        expect(() => requireNumber(ctx, 0)).toThrow(expect.objectContaining({ message: "Argument 0 of '@Returns' on 'create' must be a number, but could not be resolved to one." }));
    });
});

describe('requireString', () => {
    it('returns undefined when the argument is absent', () => {
        expect(requireString(createHandlerContext(), 0)).toBeUndefined();
    });

    it('returns a literal', () => {
        expect(requireString(createHandlerContext({ args: [literalArg('users')] }), 0)).toBe('users');
    });

    it('throws for a number', () => {
        const ctx = createHandlerContext({ args: [literalArg(1)], decorator: { name: 'Path' } });

        expect(() => requireString(ctx, 0)).toThrow(expect.objectContaining({
            code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID,
            message: "Argument 0 of '@Path' on 'TestHost' must be a string, but could not be resolved to one.",
        }));
    });
});

describe('requireArgument', () => {
    const readStatus = (arg: DecoratorArgument) => readString(arg) ?? readNumber(arg)?.toString();

    it('accepts whatever a custom reader resolves (string or number)', () => {
        expect(requireArgument(createHandlerContext({ args: [literalArg('201')] }), 0, readStatus, 'a status code'))
            .toBe('201');
        expect(requireArgument(createHandlerContext({ args: [identifierArg(202)] }), 0, readStatus, 'a status code'))
            .toBe('202');
    });

    it('throws with the custom expectation when the reader yields nothing', () => {
        const ctx = createHandlerContext({ args: [literalArg(true)], decorator: { name: 'Status' } });

        expect(() => requireArgument(ctx, 0, readStatus, 'a status code')).toThrow(expect.objectContaining({
            code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID,
            message: "Argument 0 of '@Status' on 'TestHost' must be a status code, but could not be resolved to one.",
        }));
    });
});
