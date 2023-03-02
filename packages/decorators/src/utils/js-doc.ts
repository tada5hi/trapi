/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Identifier, JSDoc, JSDocTag, Node,
} from 'typescript';
import { SyntaxKind, isJSDocParameterTag } from 'typescript';
import { hasOwnProperty } from './object';

// -----------------------------------------
// Description
// -----------------------------------------
export function getJSDocDescription(node: Node) : string | undefined {
    if (!hasOwnProperty(node, 'jsDoc')) {
        return undefined;
    }

    const jsDocs = ((node as any).jsDoc as JSDoc[])
        .filter((jsDoc) => typeof jsDoc.comment === 'string');

    if (jsDocs.length === 0) {
        return undefined;
    }

    return Array.isArray(jsDocs[0].comment) ? (jsDocs[0].comment.length === 0 ? undefined : jsDocs[0].comment[0]) : jsDocs[0].comment;
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
    isMatching?: string | string[] | ((tag: JSDocTag) => boolean),
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

export function isExistJSDocTag(node: Node, tagName: ((tag: JSDocTag) => boolean) | string) : boolean {
    const tags : JSDocTag[] = getJSDocTags(node, tagName);

    return !(!tags || !tags.length);
}

// -----------------------------------------
// Tag Comment(s)
// -----------------------------------------

export function getJSDocTagComment(node: Node, tagName: ((tag: JSDocTag) => boolean) | string) : undefined | string {
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
