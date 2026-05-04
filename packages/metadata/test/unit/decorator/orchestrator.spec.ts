/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ScriptTarget, createSourceFile, isClassDeclaration } from 'typescript';
import type { ClassDeclaration, MethodDeclaration, SourceFile } from 'typescript';
import {
    type ApplyHandlersOptions,
    type ControllerDraft,
    type ControllerHandler,
    type ControllerJsDocHandler,
    type MethodHandler,
    applyDecoratorHandlers,
    applyJsDocHandlers,
    newControllerDraft,
    newMethodDraft,
} from '../../../src/adapters/decorator';
import type { Type } from '../../../src/core/resolver/types';

function compile(source: string): SourceFile {
    return createSourceFile('sample.ts', source, ScriptTarget.Latest, true);
}

function findClass(sf: SourceFile, name: string): ClassDeclaration {
    const found = sf.statements.find(
        (s): s is ClassDeclaration => isClassDeclaration(s) && s.name?.text === name,
    );
    if (!found) throw new Error(`class ${name} not found`);
    return found;
}

const stubResolveTypeNode = (): Type => ({ typeName: 'any' } as Type);

function options(host: string, target: 'class' | 'method' | 'parameter' = 'class'): ApplyHandlersOptions {
    return {
        target,
        host: { name: host },
        resolveTypeNode: stubResolveTypeNode,
    };
}

describe('applyDecoratorHandlers', () => {
    it('applies a matching handler to the draft', () => {
        const sf = compile(`
            @Controller("/users")
            class UsersController {}
        `);
        const node = findClass(sf, 'UsersController');
        const draft = newControllerDraft({ name: 'UsersController', location: 'sample.ts' });
        const handlers: ControllerHandler[] = [
            {
                match: { name: 'Controller' },
                apply: (ctx, d) => {
                    const arg = ctx.argument(0);
                    if (arg && arg.kind === 'literal') {
                        d.paths = [arg.raw as string];
                    }
                },
            },
        ];

        applyDecoratorHandlers(node, handlers, draft, options('UsersController'));
        expect(draft.paths).toEqual(['/users']);
    });

    it('skips when no handler matches', () => {
        const sf = compile('@Other() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const handlers: ControllerHandler[] = [
            { match: { name: 'Controller' }, apply: () => { throw new Error('should not run'); } },
        ];

        applyDecoratorHandlers(node, handlers, draft, options('C'));
        expect(draft.paths).toBeUndefined();
    });

    it('runs all matching handlers in registry order (additive)', () => {
        const sf = compile('@Controller() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const trace: string[] = [];
        const handlers: ControllerHandler[] = [
            { match: { name: 'Controller' }, apply: () => { trace.push('a'); } },
            { match: { name: 'Controller' }, apply: () => { trace.push('b'); } },
        ];

        applyDecoratorHandlers(node, handlers, draft, options('C'));
        expect(trace).toEqual(['a', 'b']);
    });

    it('respects match.on filter', () => {
        const sf = compile('@Body() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const trace: string[] = [];
        const handlers: ControllerHandler[] = [
            { match: { name: 'Body', on: 'parameter' }, apply: () => { trace.push('param'); } },
            { match: { name: 'Body' }, apply: () => { trace.push('any'); } },
        ];

        applyDecoratorHandlers(node, handlers, draft, options('C'));
        expect(trace).toEqual(['any']);
    });

    it('exposes ctx.argument and ctx.typeArgument from sources', () => {
        const sf = compile(`
            class C {
                @Get<MyType>("/path", { extra: 1 })
                list() {}
            }
        `);
        const cls = findClass(sf, 'C');
        const method = cls.members[0] as MethodDeclaration;
        const draft = newMethodDraft({ name: 'list' });
        const handlers: MethodHandler[] = [
            {
                match: { name: 'Get' },
                apply: (ctx, d) => {
                    const path = ctx.argument(0);
                    const opts = ctx.argument(1);
                    const ta = ctx.typeArgument(0);
                    if (path?.kind === 'literal') d.path = path.raw as string;
                    if (opts?.kind === 'object') d.extensions.push({ key: 'first-arg', value: opts.raw as never });
                    if (ta) d.extensions.push({ key: 'type-arg', value: 'present' });
                },
            },
        ];

        applyDecoratorHandlers(method, handlers, draft, {
            target: 'method',
            host: { name: 'list', parentName: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(draft.path).toEqual('/path');
        expect(draft.extensions).toContainEqual({ key: 'first-arg', value: { extra: 1 } });
        expect(draft.extensions).toContainEqual({ key: 'type-arg', value: 'present' });
    });

    it('does nothing when handlers array is empty', () => {
        const sf = compile('@Controller() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });

        applyDecoratorHandlers(node, [], draft, options('C'));
        expect(draft.paths).toBeUndefined();
    });

    it('does nothing when node has no decorators', () => {
        const sf = compile('class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const handlers: ControllerHandler[] = [
            { match: { name: 'Controller' }, apply: () => { throw new Error('should not run'); } },
        ];

        applyDecoratorHandlers(node, handlers, draft, options('C'));
        expect(draft.paths).toBeUndefined();
    });
});

describe('applyJsDocHandlers', () => {
    it('applies a matching JSDoc handler to the draft', () => {
        const sf = compile(`
            /**
             * @hidden
             */
            class C {}
        `);
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const handlers: ControllerJsDocHandler[] = [
            { match: { tag: 'hidden' }, apply: (_ctx, d: ControllerDraft) => { d.hidden = true; } },
        ];

        applyJsDocHandlers(node, handlers, draft, options('C'));
        expect(draft.hidden).toBe(true);
    });

    it('exposes the source object on the context', () => {
        const sf = compile(`
            /**
             * @description short text
             */
            class C {}
        `);
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const seen: string[] = [];
        const handlers: ControllerJsDocHandler[] = [
            {
                match: { tag: 'description' },
                apply: (ctx) => { if (ctx.source.text) seen.push(ctx.source.text); },
            },
        ];

        applyJsDocHandlers(node, handlers, draft, options('C'));
        expect(seen).toEqual(['short text']);
    });

    it('exposes the parameterType callback on JsDocHandlerContext', () => {
        const sf = compile(`
            /**
             * @description short text
             */
            class C {}
        `);
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        let resolved: Type | undefined;
        const handlers: ControllerJsDocHandler[] = [
            {
                match: { tag: 'description' },
                apply: (ctx) => { resolved = ctx.parameterType(); },
            },
        ];

        applyJsDocHandlers(node, handlers, draft, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
            parameterType: () => ({ typeName: 'string' } as Type),
        });
        expect(resolved).toEqual({ typeName: 'string' });
    });
});

describe('applyDecoratorHandlers — unmatched reporting', () => {
    it('fires onUnmatchedDecorator for sources with no matching handler', () => {
        const sf = compile('@Hiden() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const handlers: ControllerHandler[] = [
            { match: { name: 'Hidden' }, apply: () => { throw new Error('should not match @Hiden'); } },
        ];
        const reports: string[] = [];

        applyDecoratorHandlers(node, handlers, draft, {
            ...options('C'),
            onUnmatchedDecorator: (r) => reports.push(`${r.name}@${r.target}`),
        });

        expect(reports).toEqual(['Hiden@class']);
    });

    it('does not fire when at least one handler matches', () => {
        const sf = compile('@Controller() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const handlers: ControllerHandler[] = [
            { match: { name: 'Controller' }, apply: () => { /* no-op */ } },
        ];
        const reports: string[] = [];

        applyDecoratorHandlers(node, handlers, draft, {
            ...options('C'),
            onUnmatchedDecorator: (r) => reports.push(r.name),
        });
        expect(reports).toEqual([]);
    });

    it('reports each unmatched decorator independently', () => {
        const sf = compile('@A() @B() class C {}');
        const node = findClass(sf, 'C');
        const draft = newControllerDraft({ name: 'C', location: 'sample.ts' });
        const reports: string[] = [];

        applyDecoratorHandlers(node, [], draft, {
            ...options('C'),
            onUnmatchedDecorator: (r) => reports.push(r.name),
        });
        expect(reports.sort()).toEqual(['A', 'B']);
    });

    it('captures host name and target in the report', () => {
        const sf = compile('@Foo() class Bar {}');
        const node = findClass(sf, 'Bar');
        const draft = newControllerDraft({ name: 'Bar', location: 'sample.ts' });
        const seen: {
            name: string; 
            target: string; 
            host: string 
        }[] = [];

        applyDecoratorHandlers(node, [], draft, {
            ...options('Bar'),
            onUnmatchedDecorator: (r) => seen.push({
                name: r.name, 
                target: r.target, 
                host: r.host.name, 
            }),
        });
        expect(seen).toEqual([{
            name: 'Foo',
            target: 'class',
            host: 'Bar',
        }]);
    });

    it('reports per-decorator line precision (each stacked decorator gets its own line)', () => {
        const sf = compile([
            'class Wrap {}',
            '',
            '@A()',
            '@B()',
            '@C()',
            'class Bar {}',
        ].join('\n'));
        const node = findClass(sf, 'Bar');
        const draft = newControllerDraft({ name: 'Bar', location: 'sample.ts' });
        const seen: { name: string; line: number }[] = [];

        applyDecoratorHandlers(node, [], draft, {
            ...options('Bar'),
            onUnmatchedDecorator: (r) => seen.push({ name: r.name, line: r.line }),
        });

        // Lines 3, 4, 5 — each decorator's own line, not the class line (6).
        expect(seen).toEqual([
            { name: 'A', line: 3 },
            { name: 'B', line: 4 },
            { name: 'C', line: 5 },
        ]);
    });
});

describe('applyDecoratorHandlers — parameterType wiring', () => {
    it('passes the parameterType callback through to handlers', () => {
        const sf = compile(`
            class C {
                @Get() list() {}
            }
        `);
        const cls = findClass(sf, 'C');
        const method = cls.members[0] as MethodDeclaration;
        const draft = newMethodDraft({ name: 'list' });
        let observed: Type | undefined;
        const handlers: MethodHandler[] = [
            {
                match: { name: 'Get' },
                apply: (ctx) => { observed = ctx.parameterType(); },
            },
        ];

        applyDecoratorHandlers(method, handlers, draft, {
            target: 'method',
            host: { name: 'list', parentName: 'C' },
            resolveTypeNode: stubResolveTypeNode,
            parameterType: () => ({ typeName: 'string' } as Type),
        });
        expect(observed).toEqual({ typeName: 'string' });
    });
});
