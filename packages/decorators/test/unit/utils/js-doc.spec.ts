/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    JSDoc, JSDocTag, Node, NodeArray,
} from 'typescript';
import {
    getJSDoc,
    getJSDocDescription,
    getJSDocTagComment,
    getJSDocTagNames,
    getJSDocTags,
    isExistJSDocTag,
} from '../../../src';

describe('src/utils/js-doc.ts', () => {
    const tags : NodeArray<JSDocTag> = [
        {
            tagName: {
                text: 'foo',
            },
        },
        {
            tagName: {
                text: 'bar',
            },
            comment: 'comment',
        },
    ] as unknown as NodeArray<JSDocTag>;

    const jsDoc : JSDoc[] = [
        {
            comment: 'This is a comment.',
            tags,
        } as JSDoc,
    ];
    const fakeNode : Record<string, any> = {
        kind: 0,
        jsDoc,
    };

    it('should get jsDoc description', () => {
        let comment = getJSDocDescription(fakeNode as Node);

        expect(comment).toBeDefined();
        expect(comment).toEqual('This is a comment.');

        let emptyNode : Record<string, any> = { jsDoc: [] };
        comment = getJSDocDescription(emptyNode as Node);
        expect(comment).toBeUndefined();

        emptyNode = {};
        comment = getJSDocDescription(emptyNode as Node);
        expect(comment).toBeUndefined();
    });

    it('should get jsDoc', () => {
        let jsDoc = getJSDoc(fakeNode as Node);
        expect(jsDoc).toEqual(jsDoc);

        jsDoc = getJSDoc(fakeNode as Node, 1);
        expect(jsDoc).toBeUndefined();

        jsDoc = getJSDoc({} as Node);
        expect(jsDoc).toBeUndefined();
    });

    it('should get jsDoc tags', () => {
        let data = getJSDocTags(fakeNode as Node);
        expect(data).toEqual(tags);

        data = getJSDocTags(fakeNode as Node, (tag) => tag.tagName.text === 'baz');
        expect(data).toEqual([]);

        data = getJSDocTags({} as Node);
        expect(data).toEqual([]);
    });

    it('should check jsDoc tag', () => {
        let data = isExistJSDocTag(fakeNode as Node, 'foo');
        expect(data).toBeTruthy();

        data = isExistJSDocTag(fakeNode as Node, (tag) => tag.tagName.text === 'baz');
        expect(data).toBeFalsy();
    });

    it('should get jsDoc tag comment', () => {
        let data = getJSDocTagComment(fakeNode as Node, 'foo');
        expect(data).toBeUndefined();

        data = getJSDocTagComment(fakeNode as Node, (tag) => tag.tagName.text === 'bar');
        expect(data).toEqual('comment');
    });

    it('should get jsDoc tag names', () => {
        let data = getJSDocTagNames(fakeNode as Node);
        expect(data).toEqual(['foo', 'bar']);

        data = getJSDocTagNames({} as Node);
        expect(data).toEqual([]);
    });
});
