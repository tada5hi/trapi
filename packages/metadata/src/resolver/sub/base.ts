/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import {
    SyntaxKind, TypeChecker, canHaveModifiers, displayPartsToString, getModifiers,
} from 'typescript';
import { hasOwnProperty } from '../../utils';

export class ResolverBase {
    protected hasPublicModifier(node: Node) {
        if (!canHaveModifiers(node)) {
            return true;
        }

        const modifiers = getModifiers(node);
        if (!modifiers) {
            return true;
        }

        return modifiers.every(
            (modifier) => modifier.kind !== SyntaxKind.ProtectedKeyword && modifier.kind !== SyntaxKind.PrivateKeyword,
        );
    }

    protected hasStaticModifier(node: Node) {
        if (!canHaveModifiers(node)) {
            return false;
        }

        const modifiers = getModifiers(node);

        return modifiers && modifiers.some((modifier) => modifier.kind === SyntaxKind.StaticKeyword);
    }

    protected isAccessibleParameter(node: Node) {
        // No modifiers
        if (!canHaveModifiers(node)) {
            return false;
        }

        const modifiers = getModifiers(node);
        if (!modifiers) {
            return false;
        }

        // public || public readonly
        if (modifiers.some((modifier) => modifier.kind === SyntaxKind.PublicKeyword)) {
            return true;
        }

        // readonly, not private readonly, not public readonly
        const isReadonly = modifiers.some((modifier) => modifier.kind === SyntaxKind.ReadonlyKeyword);
        const isProtectedOrPrivate = modifiers.some(
            (modifier) => modifier.kind === SyntaxKind.ProtectedKeyword ||
                modifier.kind === SyntaxKind.PrivateKeyword,
        );

        return isReadonly && !isProtectedOrPrivate;
    }
}
