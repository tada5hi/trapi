/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Node, TypeChecker } from 'typescript';
import { SyntaxKind, displayPartsToString } from 'typescript';
import { hasOwnProperty } from '../utils';

export function getNodeDescription(
    node: Node,
    typeChecker: TypeChecker,
) {
    if (!hasOwnProperty(node, 'name')) {
        return undefined;
    }

    const symbol = typeChecker.getSymbolAtLocation(node.name as Node);
    if (!symbol) {
        return undefined;
    }

    /**
     * TODO: Workaround for what seems like a bug in the compiler
     * Warrants more investigation and possibly a PR against typescript
     */
    if (node.kind === SyntaxKind.Parameter) {
        // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
        symbol.flags = 0;
    }

    const comments = symbol.getDocumentationComment(typeChecker);
    if (comments.length) {
        return displayPartsToString(comments);
    }

    return undefined;
}
