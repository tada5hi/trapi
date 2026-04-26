/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import { buildDecoratorArgument } from '../../../src/adapters/decorator/typescript/utils';

function parseFirstArgument(decoratorCallSource: string): ts.Expression {
    const sf = ts.createSourceFile(
        'sample.ts',
        decoratorCallSource,
        ts.ScriptTarget.Latest,
        true,
    );
    const stmt = sf.statements[0] as ts.ExpressionStatement;
    const call = stmt.expression as ts.CallExpression;
    return call.arguments[0];
}

describe('buildDecoratorArgument', () => {
    it('classifies string literal as literal', () => {
        const arg = parseFirstArgument('Foo("hello")');
        expect(buildDecoratorArgument(arg)).toEqual({ raw: 'hello', kind: 'literal' });
    });

    it('classifies number literal as literal', () => {
        const arg = parseFirstArgument('Foo(42)');
        expect(buildDecoratorArgument(arg)).toEqual({ raw: 42, kind: 'literal' });
    });

    it('classifies negative number as literal', () => {
        const arg = parseFirstArgument('Foo(-7)');
        expect(buildDecoratorArgument(arg)).toEqual({ raw: -7, kind: 'literal' });
    });

    it('treats logical-not prefix as unresolvable instead of throwing', () => {
        const arg = parseFirstArgument('Foo(!FOO)');
        expect(buildDecoratorArgument(arg)).toEqual({ raw: undefined, kind: 'unresolvable' });
    });

    it('treats bitwise-not prefix as unresolvable instead of throwing', () => {
        const arg = parseFirstArgument('Foo(~mask)');
        expect(buildDecoratorArgument(arg)).toEqual({ raw: undefined, kind: 'unresolvable' });
    });

    it('classifies true/false/null as literal', () => {
        expect(buildDecoratorArgument(parseFirstArgument('Foo(true)'))).toEqual({ raw: true, kind: 'literal' });
        expect(buildDecoratorArgument(parseFirstArgument('Foo(false)'))).toEqual({ raw: false, kind: 'literal' });
        expect(buildDecoratorArgument(parseFirstArgument('Foo(null)'))).toEqual({ raw: null, kind: 'literal' });
    });

    it('classifies object literal as object', () => {
        const arg = parseFirstArgument('Foo({ a: 1, b: "two" })');
        const result = buildDecoratorArgument(arg);
        expect(result.kind).toEqual('object');
        expect(result.raw).toEqual({ a: 1, b: 'two' });
    });

    it('classifies array literal as array', () => {
        const arg = parseFirstArgument('Foo([1, 2, 3])');
        const result = buildDecoratorArgument(arg);
        expect(result.kind).toEqual('array');
        expect(result.raw).toEqual([1, 2, 3]);
    });

    it('classifies bare identifier without resolver as unresolvable', () => {
        const arg = parseFirstArgument('Foo(SomeConst)');
        const result = buildDecoratorArgument(arg);
        expect(result.kind).toEqual('unresolvable');
        expect(result.raw).toBeUndefined();
    });
});
