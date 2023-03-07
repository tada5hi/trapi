/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import type { JSDocComment, NodeArray } from 'typescript';

export function transformJSDocComment(
    input?: string | NodeArray<JSDocComment>,
) : string | undefined {
    if (typeof input === 'string') {
        return input;
    }

    if (!input || input.length === 0) {
        return undefined;
    }

    const comment = input[0];
    if (typeof comment === 'string') {
        return comment;
    }

    if (
        isObject(comment) &&
        typeof comment.text === 'string'
    ) {
        return comment.text;
    }

    return undefined;
}
