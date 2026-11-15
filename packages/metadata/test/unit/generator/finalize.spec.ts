/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
    ControllerFinalizer,
    ControllerHandler,
    MethodFinalizer,
    MethodHandler,
    MethodJsDocHandler,
    Registry,
    Type,
} from '@trapi/core';
import { createRegistry } from '@trapi/core';
import { generateMetadata } from '../../../src';

const controllers: ControllerHandler[] = [{
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        draft.paths = [ctx.argument(0)!.raw as string];
    },
}];

const methods: MethodHandler[] = [
    {
        match: { name: 'Get', on: 'method' },
        apply: (ctx, draft) => {
            draft.verb = 'get';
            draft.path = ctx.argument(0)!.raw as string;
        },
    },
    {
        match: { name: 'Post', on: 'method' },
        apply: (ctx, draft) => {
            draft.verb = 'post';
            draft.path = ctx.argument(0)!.raw as string;
        },
    },
];

const methodJsDoc: MethodJsDocHandler[] = [{
    match: { tag: 'summary', on: 'method' },
    apply: (ctx, draft) => {
        draft.summary = ctx.source.text;
    },
}];

const generate = (registry: Registry) => generateMetadata({
    entryPoint: [{
        cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/finalize'),
        pattern: '**/*.ts',
    }],
    cache: false,
    registry,
});

const withFinalizers = (input: {
    methodFinalizers?: MethodFinalizer[],
    controllerFinalizers?: ControllerFinalizer[],
}) => generate(createRegistry({
    controllers,
    methods,
    methodJsDoc,
    ...input,
}));

describe('finalize hooks', () => {
    it('runs once per route method after decorator and JSDoc handlers', async () => {
        const seen: {
            name: string,
            verb?: string,
            path: string,
            summary?: string,
            host: string
        }[] = [];

        await withFinalizers({
            methodFinalizers: [(draft, ctx) => {
                seen.push({
                    name: draft.name,
                    verb: draft.verb,
                    path: draft.path,
                    summary: draft.summary,
                    host: `${ctx.host.parentName}.${ctx.host.name}`,
                });
            }],
        });

        expect(seen).toEqual([
            {
                name: 'list',
                verb: 'get',
                path: '/list',
                summary: 'List items',
                host: 'FinalizeController.list',
            },
            {
                name: 'create',
                verb: 'post',
                path: '/create',
                summary: undefined,
                host: 'FinalizeController.create',
            },
        ]);
    });

    it('exposes the resolved return type', async () => {
        const types: Record<string, Type> = {};

        const metadata = await withFinalizers({
            methodFinalizers: [(draft, ctx) => {
                types[draft.name] = ctx.returnType();
            }],
        });

        expect(types.create).toMatchObject({ typeName: 'refObject', refName: 'IItem' });
        expect(types.list).toMatchObject({ typeName: 'array', elementType: { typeName: 'refObject', refName: 'IItem' } });

        // One memoised resolution: the finalizer sees the very object the
        // generator documents.
        const create = metadata.controllers[0]!.methods.find((m) => m.name === 'create')!;

        expect(create.type).toBe(types.create);
    });

    it('can set successStatus and responses before the default response is built', async () => {
        const metadata = await withFinalizers({
            methodFinalizers: [(draft) => {
                if (draft.name !== 'create') {
                    return;
                }

                draft.successStatus = '201';
                draft.responses.push({
                    name: '400',
                    status: '400',
                    description: 'Bad request',
                });
            }],
        });

        const create = metadata.controllers[0]!.methods.find((m) => m.name === 'create')!;

        expect(create.responses).toHaveLength(2);
        expect(create.responses[0]).toEqual({
            name: '400',
            status: '400',
            description: 'Bad request',
        });
        expect(create.responses[1]).toEqual({
            name: '201',
            status: '201',
            description: 'Created',
            examples: [],
            schema: expect.objectContaining({ typeName: 'refObject', refName: 'IItem' }),
        });
    });

    it('omits a method the finalizer hides', async () => {
        const metadata = await withFinalizers({
            methodFinalizers: [(draft) => {
                if (draft.name === 'list') {
                    draft.hidden = true;
                }
            }],
        });

        expect(metadata.controllers[0]!.methods.map((m) => m.name)).toEqual(['create']);
    });

    it('omits a method the finalizer strips of its verb', async () => {
        const metadata = await withFinalizers({
            methodFinalizers: [(draft) => {
                if (draft.name === 'list') {
                    draft.verb = undefined;
                }
            }],
        });

        expect(metadata.controllers[0]!.methods.map((m) => m.name)).toEqual(['create']);
    });

    it('runs controller finalizers before methods', async () => {
        const log: string[] = [];

        const metadata = await withFinalizers({
            controllerFinalizers: [(draft, ctx) => {
                // Finalizers see every named class; only a claimed one has paths.
                if (draft.paths === undefined) {
                    return;
                }

                log.push(`controller:${ctx.host.name}:${draft.paths.join(',')}`);
                draft.tags.push('finalized');
            }],
            methodFinalizers: [(draft) => {
                log.push(`method:${draft.name}`);
            }],
        });

        expect(log).toEqual([
            'controller:FinalizeController:/items',
            'method:list',
            'method:create',
        ]);
        expect(metadata.controllers[0]!.tags).toEqual(['finalized']);
    });

    it('runs controller finalizers before the controller check', async () => {
        const metadata = await withFinalizers({
            controllerFinalizers: [(draft, ctx) => {
                if (ctx.host.name === 'UnclaimedController') {
                    draft.paths = ['/claimed'];
                }
            }],
        });

        const claimed = metadata.controllers.find((c) => c.name === 'UnclaimedController')!;

        expect(metadata.controllers.map((c) => c.name)).toEqual(['FinalizeController', 'UnclaimedController']);
        expect(claimed.paths).toEqual(['claimed']);
        expect(claimed.methods.map((m) => m.name)).toEqual(['ping']);
    });

    it('runs finalizers in registry order', async () => {
        const log: string[] = [];

        await withFinalizers({
            methodFinalizers: [
                (draft) => {
                    log.push(`a:${draft.name}`);
                },
                (draft) => {
                    log.push(`b:${draft.name}`);
                },
            ],
        });

        expect(log).toEqual(['a:list', 'b:list', 'a:create', 'b:create']);
    });

    it('propagates a finalizer error', async () => {
        await expect(withFinalizers({
            methodFinalizers: [() => {
                throw new Error('finalizer exploded');
            }],
        })).rejects.toThrow('finalizer exploded');

        await expect(withFinalizers({
            controllerFinalizers: [() => {
                throw new Error('controller finalizer exploded');
            }],
        })).rejects.toThrow('controller finalizer exploded');
    });

    it('works with a registry that has no finalizer arrays', async () => {
        // A hand-built literal, as consumers wrote before finalizers existed.
        const registry: Registry = {
            controllers,
            methods,
            parameters: [],
            controllerJsDoc: [],
            methodJsDoc,
            parameterJsDoc: [],
        };

        const metadata = await generate(registry);

        expect(metadata.controllers[0]!.methods.map((m) => m.name)).toEqual(['list', 'create']);
        expect(metadata.controllers[0]!.methods[1]!.responses).toEqual([{
            name: '200',
            status: '200',
            description: 'Ok',
            examples: [],
            schema: expect.objectContaining({ typeName: 'refObject', refName: 'IItem' }),
        }]);
    });
});
