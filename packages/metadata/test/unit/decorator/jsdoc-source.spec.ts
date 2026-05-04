/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ScriptTarget, createSourceFile, isClassDeclaration } from 'typescript';
import type { ClassDeclaration, MethodDeclaration, SourceFile } from 'typescript';
import type { Type } from '../../../src/core/resolver/types';
import {
    buildJsDocSources,
} from '../../../src/adapters/decorator/typescript/module';

function compileSource(source: string): SourceFile {
    return createSourceFile(
        'sample.ts',
        source,
        ScriptTarget.Latest,
        true,
    );
}

function findClass(sf: SourceFile, name: string): ClassDeclaration {
    const found = sf.statements.find(
        (s): s is ClassDeclaration =>
            isClassDeclaration(s) && s.name?.text === name,
    );
    if (!found) {
        throw new Error(`class ${name} not found`);
    }
    return found;
}

const stubResolveTypeNode = (): Type => ({ typeName: 'any' } as Type);

describe('buildJsDocSources', () => {
    it('extracts simple tag with text', () => {
        const sf = compileSource(`
            /**
             * @hidden
             * @deprecated use new endpoint
             */
            class C {}
        `);
        const cls = findClass(sf, 'C');
        const sources = buildJsDocSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toHaveLength(2);
        expect(sources[0].tag).toEqual('hidden');
        expect(sources[0].text).toBeUndefined();
        expect(sources[1].tag).toEqual('deprecated');
        expect(sources[1].text).toEqual('use new endpoint');
    });

    it('captures parameterName from @param tags', () => {
        const sf = compileSource(`
            class C {
                /**
                 * @param userId the user id
                 */
                find(userId: string) {}
            }
        `);
        const cls = findClass(sf, 'C');
        const method = cls.members[0] as MethodDeclaration;
        const sources = buildJsDocSources(method, {
            target: 'method',
            host: { name: 'find', parentName: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        const paramTag = sources.find((s) => s.tag === 'param');
        expect(paramTag).toBeDefined();
        expect(paramTag?.parameterName).toEqual('userId');
        expect(paramTag?.text).toEqual('the user id');
    });

    it('captures dotted parameterName from QualifiedName @param', () => {
        const sf = compileSource(`
            class C {
                /**
                 * @param obj.foo nested field
                 */
                find(obj: { foo: string }) {}
            }
        `);
        const cls = findClass(sf, 'C');
        const method = cls.members[0] as MethodDeclaration;
        const sources = buildJsDocSources(method, {
            target: 'method',
            host: { name: 'find', parentName: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        const paramTag = sources.find((s) => s.tag === 'param');
        expect(paramTag).toBeDefined();
        expect(paramTag?.parameterName).toEqual('obj.foo');
    });

    it('exposes typeExpression as lazy resolver callback', () => {
        const sf = compileSource(`
            class C {
                /**
                 * @returns {Foo} a foo
                 */
                get(): unknown { return null; }
            }
        `);
        const cls = findClass(sf, 'C');
        const method = cls.members[0] as MethodDeclaration;
        const calls: string[] = [];
        const sources = buildJsDocSources(method, {
            target: 'method',
            host: { name: 'get', parentName: 'C' },
            resolveTypeNode: (node) => {
                calls.push(node.getText());
                return { typeName: 'any' } as Type;
            },
        });

        const returnsTag = sources.find((s) => s.tag === 'returns');
        expect(returnsTag).toBeDefined();
        expect(returnsTag?.typeExpression).toBeDefined();
        expect(calls).toEqual([]);
        returnsTag!.typeExpression!.resolve();
        expect(calls).toEqual(['Foo']);
    });

    it('returns empty array when node has no JSDoc', () => {
        const sf = compileSource('class C {}');
        const cls = findClass(sf, 'C');
        const sources = buildJsDocSources(cls, {
            target: 'class',
            host: { name: 'C' },
            resolveTypeNode: stubResolveTypeNode,
        });

        expect(sources).toEqual([]);
    });
});
