/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    ScriptTarget,
    SyntaxKind,
    createCompilerHost,
    createProgram,
    createSourceFile,
    isCallExpression,
    isClassDeclaration,
} from 'typescript';
import type {
    CompilerHost,
    CompilerOptions,
    Expression,
    SourceFile,
} from 'typescript';
import { getInitializerValue } from '../../../src/adapters/typescript/initializer';

const FILE_NAME = 'sample.ts';

function buildProgram(source: string) {
    const sourceFile = createSourceFile(
        FILE_NAME,
        source,
        ScriptTarget.Latest,
        true,
    );
    const compilerOptions: CompilerOptions = {
        target: ScriptTarget.Latest,
        experimentalDecorators: true,
        noResolve: true,
        noLib: true,
    };
    const baseHost = createCompilerHost(compilerOptions);
    const host: CompilerHost = {
        ...baseHost,
        getSourceFile: (name) => (name === FILE_NAME ? sourceFile : undefined),
        fileExists: (name) => name === FILE_NAME,
        readFile: (name) => (name === FILE_NAME ? source : undefined),
        getDefaultLibFileName: () => 'lib.d.ts',
    };
    const program = createProgram([FILE_NAME], compilerOptions, host);
    return { program, sourceFile: program.getSourceFile(FILE_NAME) as SourceFile };
}

function firstClassDecoratorArgument(sf: SourceFile): Expression {
    const cls = sf.statements.find(isClassDeclaration);
    if (!cls) {
        throw new Error('class not found');
    }
    const modifiers = cls.modifiers ?? [];
    for (const modifier of modifiers) {
        if (modifier.kind !== SyntaxKind.Decorator) {
            continue;
        }
        const decorator = modifier as unknown as { expression: Expression };
        if (!isCallExpression(decorator.expression)) {
            continue;
        }
        const [first] = decorator.expression.arguments;
        if (first) {
            return first;
        }
    }
    throw new Error('no decorator argument found');
}

describe('getInitializerValue', () => {
    it('returns undefined for an inline arrow-function decorator argument', () => {
        const { program, sourceFile } = buildProgram(`
            declare function Tree(...args: any[]): any;
            @Tree(() => 'x')
            class C {}
        `);
        const arg = firstClassDecoratorArgument(sourceFile);

        expect(() => getInitializerValue(arg, program.getTypeChecker())).not.toThrow();
        expect(getInitializerValue(arg, program.getTypeChecker())).toBeUndefined();
    });

    it('returns undefined for arrow-function values nested in an object literal', () => {
        // Mirrors the @Tree('closure-table', { ancestorColumnName: () => 'a' }) shape
        // from the issue — the object-literal branch recurses into each value, and
        // unresolvable arrow expressions must not crash the recursion.
        const { program, sourceFile } = buildProgram(`
            declare function Tree(...args: any[]): any;
            @Tree('closure-table', {
                ancestorColumnName: () => 'ancestor_id',
                descendantColumnName: () => 'descendant_id',
            })
            class C {}
        `);
        const cls = sourceFile.statements.find(isClassDeclaration)!;
        const decorator = (cls.modifiers ?? []).find(
            (m) => m.kind === SyntaxKind.Decorator,
        ) as unknown as { expression: Expression };
        const call = decorator.expression as unknown as { arguments: Expression[] };
        const objectLiteralArg = call.arguments[1];

        const checker = program.getTypeChecker();
        expect(() => getInitializerValue(objectLiteralArg, checker)).not.toThrow();
        expect(getInitializerValue(objectLiteralArg, checker)).toEqual({
            ancestorColumnName: undefined,
            descendantColumnName: undefined,
        });
    });
});
