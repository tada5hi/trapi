/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import { ts } from '../../../../core/compiler';


export class ResolverBase {
    protected hasPublicModifier(node: Node) {
        if (!ts.canHaveModifiers(node)) {
            return true;
        }

        const modifiers = ts.getModifiers(node);
        if (!modifiers) {
            return true;
        }

        return modifiers.every(
            (modifier) => modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword,
        );
    }

    protected hasStaticModifier(node: Node) {
        if (!ts.canHaveModifiers(node)) {
            return false;
        }

        const modifiers = ts.getModifiers(node);

        return modifiers && modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword);
    }

    protected isAccessibleParameter(node: Node) {
        // No modifiers
        if (!ts.canHaveModifiers(node)) {
            return false;
        }

        const modifiers = ts.getModifiers(node);
        if (!modifiers) {
            return false;
        }

        // public || public readonly
        if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.PublicKeyword)) {
            return true;
        }

        // readonly, not private readonly, not public readonly
        const isReadonly = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword);
        const isProtectedOrPrivate = modifiers.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
                modifier.kind === ts.SyntaxKind.PrivateKeyword,
        );

        return isReadonly && !isProtectedOrPrivate;
    }
}
