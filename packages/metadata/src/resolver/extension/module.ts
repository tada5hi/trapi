/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import type { DecoratorResolver } from '../../decorator';
import { DecoratorID } from '../../decorator';
import type { Extension } from './type';

export function getNodeExtensions(node: Node, resolver: DecoratorResolver) : Extension[] {
    const decorator = resolver.match(DecoratorID.EXTENSION, node);
    if (!decorator) {
        return [];
    }

    const output : Extension[] = [];

    for (let i = 0; i < decorator.decorators.length; i++) {
        const key = decorator.get('key', i);
        const value = decorator.get('value', i);

        output.push({ key, value: value as any });
    }

    return output;
}
