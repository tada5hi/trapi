/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import type { Type } from '../../../../src/core/resolver/types';
import {
    buildDecoratorSources,
} from '../../../../src/adapters/decorator/v2/typescript/module';

function compileSource(source: string): ts.SourceFile {
    return ts.createSourceFile(
        'sample.ts',
        source,
        ts.ScriptTarget.Latest,
        true,
    );
}

function findClass(sf: ts.SourceFile, name: string): ts.ClassDeclaration {
    const found = sf.statements.find(
        (s): s is ts.ClassDeclaration =>
            ts.isClassDeclaration(s) && s.name?.text === name,
    );
    if (!found) {
        throw new Error(`class ${name} not found`);
    }
    return found;
}

const stubResolveTypeNode = (): Type => ({ typeName: 'any' } as Type);

describe('buildDecoratorSources', () => {
    it('extracts a single decorator on a class', () => {
        const sf = compileSource(`
            @Controller("/users")
            class UsersController {}
        `);
        const cls = findClass(sf, 'UsersController');
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'UsersController' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toHaveLength(1);
        expect(sources[0].name).toEqual('Controller');
        expect(sources[0].target).toEqual('class');
        expect(sources[0].host.name).toEqual('UsersController');
        expect(sources[0].arguments).toEqual([
            { raw: '/users', kind: 'literal' },
        ]);
        expect(sources[0].typeArguments).toEqual([]);
    });

    it('extracts multiple decorators in declaration order', () => {
        const sf = compileSource(`
            @Tags("a")
            @Hidden()
            @Controller("/x")
            class C {}
        `);
        const cls = findClass(sf, 'C');
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources.map((s) => s.name)).toEqual(['Tags', 'Hidden', 'Controller']);
    });

    it('captures call expression with no arguments', () => {
        const sf = compileSource(`
            @Hidden()
            class C {}
        `);
        const cls = findClass(sf, 'C');
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toHaveLength(1);
        expect(sources[0].name).toEqual('Hidden');
        expect(sources[0].arguments).toEqual([]);
    });

    it('captures bare identifier decorator (no call)', () => {
        const sf = compileSource(`
            @Hidden
            class C {}
        `);
        const cls = findClass(sf, 'C');
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toHaveLength(1);
        expect(sources[0].name).toEqual('Hidden');
        expect(sources[0].arguments).toEqual([]);
    });

    it('captures property-access decorator names', () => {
        const sf = compileSource(`
            @http.Get("/x")
            class C {}
        `);
        const cls = findClass(sf, 'C');
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toHaveLength(1);
        expect(sources[0].name).toEqual('Get');
    });

    it('exposes typeArguments as lazy resolver callbacks', () => {
        const sf = compileSource(`
            @Response<MyError>("/users")
            class C {}
        `);
        const cls = findClass(sf, 'C');
        const calls: string[] = [];
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: (node) => {
                calls.push(node.getText());
                return { typeName: 'any' } as Type;
            },
        });

        expect(sources[0].typeArguments).toHaveLength(1);
        expect(calls).toEqual([]);
        sources[0].typeArguments[0].resolve();
        expect(calls).toEqual(['MyError']);
    });

    it('returns empty array when node has no decorators', () => {
        const sf = compileSource('class C {}');
        const cls = findClass(sf, 'C');
        const sources = buildDecoratorSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toEqual([]);
    });

    it('extracts decorators on a method', () => {
        const sf = compileSource(`
            class C {
                @Get("/users")
                list() {}
            }
        `);
        const cls = findClass(sf, 'C');
        const method = cls.members[0] as ts.MethodDeclaration;
        const sources = buildDecoratorSources(method, {
            target: 'method',
            host: { name: 'list', parentName: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toHaveLength(1);
        expect(sources[0].name).toEqual('Get');
        expect(sources[0].target).toEqual('method');
        expect(sources[0].host).toEqual({ name: 'list', parentName: 'C' });
    });
});
