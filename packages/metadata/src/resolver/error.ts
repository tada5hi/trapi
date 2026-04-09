/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalize } from 'node:path';
import type { Node, TypeNode } from 'typescript';
import { MetadataError } from '../error';

export class ResolverError extends MetadataError {
    public readonly file?: string;

    public readonly line?: number;

    constructor(
        message: string,
        node?: Node | TypeNode,
        options?: boolean | { onlyCurrent?: boolean, cause?: unknown },
    ) {
        const opts = typeof options === 'boolean' ? { onlyCurrent: options } : options;
        const onlyCurrent = opts?.onlyCurrent ?? false;

        const parts: string[] = [message];
        let file: string | undefined;
        let line: number | undefined;

        if (node) {
            const location = prettyLocationOfNode(node);
            if (location) {
                parts.push(location.text);
                file = location.file;
                line = location.line;
            }

            parts.push(prettyTroubleCause(node, onlyCurrent));
        }

        super({
            message: parts.join('\n'),
            cause: opts?.cause,
        });

        this.file = file;
        this.line = line;
    }
}

export function prettyLocationOfNode(node: Node | TypeNode): {
    text: string,
    file: string,
    line?: number,
} | undefined {
    try {
        const sourceFile = node.getSourceFile();
        if (!sourceFile) return undefined;

        const token = node.getFirstToken() || node.parent?.getFirstToken();
        const start = token ? sourceFile.getLineAndCharacterOfPosition(token.getStart()).line + 1 : undefined;
        const end = token ? sourceFile.getLineAndCharacterOfPosition(token.getEnd()).line + 1 : undefined;

        const normalizedFile = normalize(sourceFile.fileName);
        const startSuffix = start ? `:${start}` : '';
        const endSuffix = end ? `:${end}` : '';

        return {
            text: `At: ${normalizedFile}${startSuffix}${endSuffix}.`,
            file: sourceFile.fileName,
            line: start,
        };
    } catch {
        return undefined;
    }
}

export function prettyTroubleCause(node: Node | TypeNode, onlyCurrent = false) {
    try {
        let name: string;
        if (onlyCurrent || !node.parent) {
            name = node.pos !== -1 ? node.getText() : (node as any).name.text;
        } else {
            name = node.parent.pos !== -1 ? node.parent.getText() : (node as any).parent.name.text;
        }

        return `This was caused by '${name}'`;
    } catch {
        return 'This was caused by an unknown node';
    }
}
