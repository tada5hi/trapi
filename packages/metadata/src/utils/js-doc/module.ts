/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Identifier, JSDoc, JSDocTag, Node,
} from 'typescript';
import { SyntaxKind, isJSDocParameterTag } from 'typescript';
import { hasOwnProperty } from '../object';
import type { JSDocTagName } from './constants';

// -----------------------------------------
// Description
// -----------------------------------------
export function getJSDocDescription(node: Node, index?: number) : string | undefined {
    const jsDoc = getJSDoc(node, index);
    if (!jsDoc) {
        return undefined;
    }

    if (Array.isArray(jsDoc.comment)) {
        if (jsDoc.comment.length === 0) {
            return undefined;
        }

        return jsDoc.comment[0];
    }

    return jsDoc.comment as string;
}

// -----------------------------------------
// Tag
// -----------------------------------------

export function getJSDoc(node: Node, index?: number) : undefined | JSDoc {
    if (!hasOwnProperty(node, 'jsDoc')) {
        return undefined;
    }

    const jsDoc : JSDoc[] | undefined = (node as any).jsDoc as JSDoc[];

    if (!jsDoc || !Array.isArray(jsDoc) || !jsDoc.length) {
        return undefined;
    }

    index = index ?? 0;
    return jsDoc.length > index && index >= 0 ? jsDoc[index] : undefined; // jsDoc[0] else case
}

export function getJSDocTags(
    node: Node,
    isMatching?: `${JSDocTagName}` | `${JSDocTagName}`[] | ((tag: JSDocTag) => boolean),
) : JSDocTag[] {
    const jsDoc : JSDoc = getJSDoc(node);
    if (typeof jsDoc === 'undefined') {
        return [];
    }

    const jsDocTags : JSDocTag[] = jsDoc.tags as unknown as JSDocTag[];

    if (typeof jsDocTags === 'undefined') {
        return [];
    }

    if (typeof isMatching === 'undefined') {
        return jsDocTags;
    }

    if (typeof isMatching === 'function') {
        return jsDocTags.filter(isMatching);
    }

    const tagNames : string[] = Array.isArray(isMatching) ? isMatching : [isMatching];

    return jsDocTags.filter((tag) => tagNames.indexOf(tag.tagName.text) !== -1);
}

export function hasJSDocTag(node: Node, tagName: ((tag: JSDocTag) => boolean) | `${JSDocTagName}`) : boolean {
    const tags : JSDocTag[] = getJSDocTags(node, tagName);

    return !(!tags || !tags.length);
}

// -----------------------------------------
// Tag Comment(s)
// -----------------------------------------

export function getJSDocTagComment(node: Node, tagName: ((tag: JSDocTag) => boolean) | `${JSDocTagName}`) : undefined | string {
    const tags : JSDocTag[] = getJSDocTags(node, tagName);

    if (!tags || !tags.length || typeof tags[0].comment !== 'string') {
        return undefined;
    }
    return tags[0].comment;
}

// -----------------------------------------
// Tag Names
// -----------------------------------------

export function getJSDocTagNames(node: Node, requireTagName = false) : string[] {
    let tags: JSDocTag[];

    /* istanbul ignore next */
    if (node.kind === SyntaxKind.Parameter) {
        const parameterName = ((node as any).name as Identifier).text;
        tags = getJSDocTags(node.parent as any, (tag) => {
            if (isJSDocParameterTag(tag)) {
                return false;
            } if (tag.comment === undefined) {
                throw new Error(`Orphan tag: @${String(tag.tagName.text || tag.tagName.escapedText)} should have a parameter name follows with.`);
            }
            return typeof tag.comment === 'string' ? tag.comment.startsWith(parameterName) : false;
        });
    } else {
        tags = getJSDocTags(node as any, (tag) => (requireTagName ? tag.comment !== undefined : true));
    }

    return tags.map((tag) => tag.tagName.text);
}
