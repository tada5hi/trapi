/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import {
    type Registry,
    findDecoratorsByName,
    isExtensionMarker,
    namesForMarker,
} from '../../../decorator';
import type { Extension } from '../../../../core/types/extension';

export function getNodeExtensions(node: Node, registry: Registry) : Extension[] {
    const names = namesForMarker(registry, isExtensionMarker);
    if (names.size === 0) {
        return [];
    }

    const output : Extension[] = [];
    for (const name of names) {
        const decorators = findDecoratorsByName(node, name);
        for (const decorator of decorators) {
            const keyArg = decorator.arguments[0];
            const valueArg = decorator.arguments[1];
            if (!keyArg || keyArg.kind !== 'literal' || typeof keyArg.raw !== 'string') {
                continue;
            }
            if (!valueArg || valueArg.kind === 'unresolvable' || typeof valueArg.raw === 'undefined') {
                continue;
            }
            output.push({ key: keyArg.raw, value: valueArg.raw as never });
        }
    }
    return output;
}
