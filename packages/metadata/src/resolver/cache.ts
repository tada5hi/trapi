/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IResolverCache, ReferenceType } from './types';

export class ResolverCache implements IResolverCache {
    private referenceTypes: Record<string, ReferenceType> = {};

    private inProgressTypes: Record<string, boolean> = {};

    getCachedType(name: string): ReferenceType | undefined {
        return this.referenceTypes[name];
    }

    setCachedType(name: string, type: ReferenceType): void {
        this.referenceTypes[name] = type;
    }

    isInProgress(name: string): boolean {
        return !!this.inProgressTypes[name];
    }

    markInProgress(name: string): void {
        this.inProgressTypes[name] = true;
    }

    clearInProgress(name: string): void {
        delete this.inProgressTypes[name];
    }

    clear(): void {
        this.referenceTypes = {};
        this.inProgressTypes = {};
    }
}
