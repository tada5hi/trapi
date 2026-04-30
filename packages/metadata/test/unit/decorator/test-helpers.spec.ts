/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    MarkerName,
    arrayArg,
    controller,
    createHandlerContext,
    identifierArg,
    literalArg,
    newControllerDraft,
    newMethodDraft,
    objectArg,
    setControllerPaths,
    setMethodPath,
    typeArg,
    unresolvableArg,
} from '../../../src/adapters/decorator';
import type { Type } from '../../../src/core/resolver/types';

const setHidden = (
    _ctx: { argument: (i: number) => unknown },
    draft: { hidden: boolean },
) => {
    draft.hidden = true;
};

describe('test-helpers', () => {
    it('createHandlerContext exposes args and typeArgs', () => {
        const ctx = createHandlerContext({
            args: [literalArg('users'), literalArg(42)],
            typeArgs: [typeArg({ typeName: 'string' } as Type)],
        });

        expect(ctx.argument(0)?.raw).toBe('users');
        expect(ctx.argument(1)?.raw).toBe(42);
        expect(ctx.argument(2)).toBeUndefined();
        expect(ctx.arguments()).toHaveLength(2);
        expect(ctx.typeArgument(0)?.resolve()).toEqual({ typeName: 'string' });
        expect(ctx.typeArguments()).toHaveLength(1);
    });

    it('createHandlerContext defaults to empty args / TestHost', () => {
        const ctx = createHandlerContext();
        expect(ctx.argument(0)).toBeUndefined();
        expect(ctx.arguments()).toEqual([]);
        expect(ctx.host.name).toBe('TestHost');
    });

    it('arg builders produce the expected shapes', () => {
        expect(literalArg('x')).toEqual({ kind: 'literal', raw: 'x' });
        expect(identifierArg('CONST')).toEqual({ kind: 'identifier', raw: 'CONST' });
        expect(arrayArg(['a', 'b'])).toEqual({ kind: 'array', raw: ['a', 'b'] });
        expect(objectArg({ a: 1 })).toEqual({ kind: 'object', raw: { a: 1 } });
        expect(unresolvableArg()).toEqual({ kind: 'unresolvable', raw: undefined });
    });

    it('lets a controller handler be unit-tested in isolation', () => {
        const handler = controller({
            match: { name: 'Controller', on: 'class' },
            apply: (ctx, draft) => {
                setControllerPaths(draft, ctx.argument(0));
            },
        });

        const draft = newControllerDraft({ name: 'UserController', location: '/x.ts' });
        handler.apply(
            createHandlerContext({ args: [literalArg('users')] }),
            draft,
        );

        expect(draft.paths).toEqual(['users']);
    });

    it('lets a multi-mount handler be unit-tested', () => {
        const handler = controller({
            match: { name: 'Controller', on: 'class' },
            apply: (ctx, draft) => {
                setControllerPaths(draft, ctx.argument(0));
            },
        });

        const draft = newControllerDraft({ name: 'C', location: '/x.ts' });
        handler.apply(
            createHandlerContext({ args: [arrayArg(['/roles', '/realms/:id/roles'])] }),
            draft,
        );

        expect(draft.paths).toEqual(['/roles', '/realms/:id/roles']);
    });

    it('setMethodPath leaves draft unchanged when arg is missing', () => {
        const draft = newMethodDraft({ name: 'list' });
        setMethodPath(draft, undefined);
        expect(draft.path).toBe('');
    });

    it('round-trips marker metadata declared on the handler', () => {
        const handler = controller({
            match: { name: 'Skip', on: 'class' },
            apply: setHidden,
            marker: MarkerName.Hidden,
        });

        expect(handler.marker).toBe('hidden');
        expect(handler.match.name).toBe('Skip');
    });
});
