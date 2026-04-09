/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IResolverCache, ReferenceType } from './types';

export class ResolverCache implements IResolverCache {
    private referenceTypes = new Map<string, ReferenceType>();

    private inProgressTypes = new Set<string>();

    getCachedType(name: string): ReferenceType | undefined {
        return this.referenceTypes.get(name);
    }

    setCachedType(name: string, type: ReferenceType): void {
        this.referenceTypes.set(name, type);
    }

    isInProgress(name: string): boolean {
        return this.inProgressTypes.has(name);
    }

    markInProgress(name: string): void {
        this.inProgressTypes.add(name);
    }

    clearInProgress(name: string): void {
        this.inProgressTypes.delete(name);
    }

    clear(): void {
        this.referenceTypes.clear();
        this.inProgressTypes.clear();
    }
}
