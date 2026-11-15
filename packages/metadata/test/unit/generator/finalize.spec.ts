/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
    ControllerFinalizer,
    ControllerHandler,
    MethodFinalizer,
    MethodHandler,
    MethodJsDocHandler,
    Preset,
    Registry,
    Type,
} from '@trapi/core';
import { createRegistry } from '@trapi/core';
import { generateMetadata } from '../../../src';
import { CACHE_FILE_PREFIX } from '../../../src/adapters/cache/constants';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

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
        cwd: path.join(dataDir, 'finalize'),
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
            methodFinalizers: [(ctx, draft) => {
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
            methodFinalizers: [(ctx, draft) => {
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
            methodFinalizers: [(_ctx, draft) => {
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
            methodFinalizers: [(_ctx, draft) => {
                if (draft.name === 'list') {
                    draft.hidden = true;
                }
            }],
        });

        expect(metadata.controllers[0]!.methods.map((m) => m.name)).toEqual(['create']);
    });

    it('omits a method the finalizer strips of its verb', async () => {
        const metadata = await withFinalizers({
            methodFinalizers: [(_ctx, draft) => {
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
            controllerFinalizers: [(ctx, draft) => {
                log.push(`controller:${ctx.host.name}:${draft.paths!.join(',')}`);
                draft.tags.push('finalized');
            }],
            methodFinalizers: [(_ctx, draft) => {
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

    it('does not run controller finalizers for a class no controller handler claimed', async () => {
        const seen: string[] = [];

        const metadata = await withFinalizers({
            controllerFinalizers: [(ctx) => {
                seen.push(ctx.host.name);
            }],
        });

        // `UnclaimedController` and the TypeScript lib classes in the program
        // carry no `@Controller`, so only the one claimed controller is seen.
        expect(metadata.controllers.map((c) => c.name)).toEqual(['FinalizeController']);
        expect(seen).toEqual(['FinalizeController']);
    });

    it('runs finalizers in registry order', async () => {
        const log: string[] = [];

        await withFinalizers({
            methodFinalizers: [
                (_ctx, draft) => {
                    log.push(`a:${draft.name}`);
                },
                (_ctx, draft) => {
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

describe('finalize hooks: runtime tolerance', () => {
    it('treats a successProduces a method finalizer unset as empty', async () => {
        const metadata = await withFinalizers({
            methodFinalizers: [(_ctx, draft) => {
                draft.successProduces = undefined as unknown as string[];
            }],
        });

        const create = metadata.controllers[0]!.methods.find((m) => m.name === 'create')!;

        expect(create.responses).toHaveLength(1);
        expect('produces' in create.responses[0]!).toBe(false);
    });

    it('treats a successProduces a controller finalizer unset as empty', async () => {
        const metadata = await withFinalizers({
            controllerFinalizers: [(_ctx, draft) => {
                draft.successProduces = undefined as unknown as string[];
            }],
        });

        const create = metadata.controllers[0]!.methods.find((m) => m.name === 'create')!;

        expect('produces' in create.responses[0]!).toBe(false);
    });

    it('drops the controller when a controller finalizer clears its paths', async () => {
        const metadata = await withFinalizers({
            controllerFinalizers: [(_ctx, draft) => {
                draft.paths = undefined;
            }],
        });

        expect(metadata.controllers).toEqual([]);
    });

    it('copies the controller successProduces into each method without mutating the draft list', async () => {
        let controllerList: string[] = [];

        const metadata = await withFinalizers({
            controllerFinalizers: [(_ctx, draft) => {
                draft.successProduces = ['application/xml'];
                controllerList = draft.successProduces;
            }],
        });

        const [list, create] = metadata.controllers[0]!.methods;
        const listProduces = list!.responses[0]!.produces;
        const createProduces = create!.responses[0]!.produces;

        expect(listProduces).toEqual(['application/xml']);
        expect(createProduces).toEqual(['application/xml']);
        expect(listProduces).not.toBe(createProduces);
        expect(listProduces).not.toBe(controllerList);
        expect(createProduces).not.toBe(controllerList);
        expect(controllerList).toEqual(['application/xml']);
    });
});

describe('finalize hooks through a preset', () => {
    const presetFinalizers = {
        finalizeController: (_ctx, draft) => {
            draft.tags.push('controller:preset');
        },
        finalizeMethod: (_ctx, draft) => {
            draft.tags.push('method:preset');
        },
    } satisfies Pick<Preset, 'finalizeController' | 'finalizeMethod'>;

    const inlineRegistry = createRegistry({
        controllerFinalizers: [(_ctx, draft) => {
            draft.tags.push('controller:inline');
        }],
        methodFinalizers: [(_ctx, draft) => {
            draft.tags.push('method:inline');
        }],
    });

    const run = (preset: Preset) => generateMetadata({
        entryPoint: [{ cwd: path.join(dataDir, 'finalize'), pattern: '**/*.ts' }],
        cache: false,
        preset,
        registry: inlineRegistry,
    });

    it('runs the preset finalizers before the inline registry ones', async () => {
        const metadata = await run({
            name: 'finalize-inline',
            controllers,
            methods,
            ...presetFinalizers,
        });

        const [owner] = metadata.controllers;

        expect(owner!.tags).toEqual(['controller:preset', 'controller:inline']);
        expect(owner!.methods.map((m) => [m.name, m.tags])).toEqual([
            ['list', ['method:preset', 'method:inline']],
            ['create', ['method:preset', 'method:inline']],
        ]);
    });

    it('runs a parent preset finalizer first', async () => {
        const metadata = await run({
            name: 'finalize-child',
            extends: [path.join(dataDir, 'finalize-preset', 'parent.ts')],
            controllers,
            methods,
            ...presetFinalizers,
        });

        const [owner] = metadata.controllers;

        expect(owner!.tags).toEqual(['controller:parent', 'controller:preset', 'controller:inline']);
        expect(owner!.methods.map((m) => [m.name, m.tags])).toEqual([
            ['list', ['method:parent', 'method:preset', 'method:inline']],
            ['create', ['method:parent', 'method:preset', 'method:inline']],
        ]);
    });
});

describe('finalize hooks and the cache', () => {
    const dir = path.join(
        os.tmpdir(),
        `trapi-cache-finalize-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    afterEach(async () => {
        await fs.promises.rm(dir, { recursive: true, force: true });
    });

    const run = (finalizer: MethodFinalizer) => generateMetadata({
        entryPoint: [{ cwd: path.join(dataDir, 'finalize'), pattern: '**/*.ts' }],
        cache: { enabled: true, directoryPath: dir },
        registry: createRegistry({
            controllers,
            methods,
            methodFinalizers: [finalizer],
        }),
    });

    const cacheFiles = async () => (await fs.promises.readdir(dir))
        .filter((f) => f.startsWith(CACHE_FILE_PREFIX));

    it('serves a second run from the cache and misses it when the finalizer changes', async () => {
        let calls = 0;

        const first = await run((_ctx, draft) => {
            calls += 1;
            draft.tags.push('a');
        });

        expect(calls).toEqual(2);
        expect(await cacheFiles()).toHaveLength(1);

        const second = await run((_ctx, draft) => {
            calls += 1;
            draft.tags.push('a');
        });

        // Same finalizer body: a cache hit, the finalizer does not run.
        expect(calls).toEqual(2);
        expect(second).toEqual(first);
        expect(await cacheFiles()).toHaveLength(1);

        const third = await run((_ctx, draft) => {
            calls += 1;
            draft.tags.push('b');
        });

        // Different finalizer body: a different key, a fresh run.
        expect(calls).toEqual(4);
        expect(await cacheFiles()).toHaveLength(2);
        expect(third.controllers[0]!.methods.map((m) => m.tags)).toEqual([['b'], ['b']]);
    });
});
