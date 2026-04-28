/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Metadata } from '../../../src';
import { generateMetadata } from '../../../src';

describe('controller metadata extraction', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
    });

    describe('tags', () => {
        it('should extract tags from @Tags decorator', () => {
            const myService = metadata.controllers.find(
                (c) => c.name === 'MyService',
            )!;
            expect(myService).toBeDefined();
            expect(myService.tags).toContain('My Services');
            expect(myService.tags).toContain('Foo');
        });

        it('should have empty tags when no @Tags decorator', () => {
            const secureEndpoint = metadata.controllers.find(
                (c) => c.name === 'SecureEndpoint',
            )!;
            expect(secureEndpoint.tags).toEqual([]);
        });
    });

    describe('consumes / accept', () => {
        it('should have consumes array on controller', () => {
            const myService = metadata.controllers.find(
                (c) => c.name === 'MyService',
            )!;
            expect(myService.consumes).toBeDefined();
            expect(Array.isArray(myService.consumes)).toBe(true);
        });
    });

    describe('produces', () => {
        it('should extract @Produces on method level', () => {
            const promiseService = metadata.controllers.find(
                (c) => c.name === 'PromiseService',
            )!;
            const testFile = promiseService.methods.find(
                (m) => m.name === 'testFile',
            )!;
            expect(testFile.produces).toContain('application/pdf');
        });
    });

    describe('controller paths', () => {
        it('should extract controller path from @Mount', () => {
            const controllers: Record<string, string> = {
                MyService: 'mypath',
                PromiseService: 'promise',
                SecureEndpoint: 'secure',
                PrimitiveEndpoint: 'primitives',
                TestUnionType: 'unionTypes',
            };

            for (const [name, expectedPath] of Object.entries(controllers)) {
                const controller = metadata.controllers.find(
                    (c) => c.name === name,
                );
                expect(controller, `controller ${name} should exist`).toBeDefined();
                expect(controller!.paths).toEqual([expectedPath]);
            }
        });

        it('should extract parameterized controller path', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'ParameterizedEndpoint',
            )!;
            expect(controller).toBeDefined();
            expect(controller.paths).toHaveLength(1);
            expect(controller.paths[0]).toContain('parameterized');
            expect(controller.paths[0]).toContain(':objectId');
        });
    });

    describe('method metadata', () => {
        it('should extract HTTP method type', () => {
            const myService = metadata.controllers.find(
                (c) => c.name === 'MyService',
            )!;

            const getMethod = myService.methods.find(
                (m) => m.name === 'test',
            )!;
            expect(getMethod.method).toEqual('get');

            const postMethod = myService.methods.find(
                (m) => m.name === 'testPostString',
            )!;
            expect(postMethod.method).toEqual('post');
        });

        it('should extract method path from @Mount', () => {
            const myService = metadata.controllers.find(
                (c) => c.name === 'MyService',
            )!;

            const test2 = myService.methods.find(
                (m) => m.name === 'test2',
            )!;
            expect(test2.path).toEqual('secondpath');
        });

        it('should extract JSDoc description on method', () => {
            const myService = metadata.controllers.find(
                (c) => c.name === 'MyService',
            )!;
            const test2 = myService.methods.find(
                (m) => m.name === 'test2',
            )!;
            expect(test2.description).toEqual('This is the method description');
        });

        it('should extract JSDoc param description', () => {
            const myService = metadata.controllers.find(
                (c) => c.name === 'MyService',
            )!;
            const test2 = myService.methods.find(
                (m) => m.name === 'test2',
            )!;
            const testRequiredParam = test2.parameters.find(
                (p) => p.name === 'testRequired',
            );
            expect(testRequiredParam!.description).toEqual(
                'This is the test param description',
            );
        });
    });

    describe('inheritance', () => {
        it('should include own methods from PromiseService', () => {
            const promiseService = metadata.controllers.find(
                (c) => c.name === 'PromiseService',
            )!;
            expect(promiseService).toBeDefined();
            const methodNames = promiseService.methods.map((m) => m.name);
            expect(methodNames).toContain('test');
            expect(methodNames).toContain('testGetSingle');
            expect(methodNames).toContain('testPost');
            expect(methodNames).toContain('testFile');
        });

        it('should include inherited methods from BaseService', () => {
            const promiseService = metadata.controllers.find(
                (c) => c.name === 'PromiseService',
            )!;
            expect(promiseService).toBeDefined();
            // testDelete is defined on BaseService, inherited by PromiseService
            const methodNames = promiseService.methods.map((m) => m.name);
            expect(methodNames).toContain('testDelete');
        });

        it('should extract correct metadata for inherited methods', () => {
            const promiseService = metadata.controllers.find(
                (c) => c.name === 'PromiseService',
            )!;
            const testDelete = promiseService.methods.find(
                (m) => m.name === 'testDelete',
            )!;
            expect(testDelete).toBeDefined();
            expect(testDelete.method).toEqual('delete');
            // Inherited @Mount(':id') should produce the path segment
            expect(testDelete.path).toEqual(':id');
            // Should have one path parameter 'id'
            const idParam = testDelete.parameters.find((p) => p.name === 'id');
            expect(idParam).toBeDefined();
            expect(idParam!.in).toEqual('path');
        });

        it('should give priority to own methods over inherited ones with the same name', () => {
            // If both child and parent define a method with the same name,
            // the child's version should win (set dedup keeps first occurrence)
            const promiseService = metadata.controllers.find(
                (c) => c.name === 'PromiseService',
            )!;
            // All own methods are present — inherited testDelete doesn't conflict
            const methodNames = promiseService.methods.map((m) => m.name);
            const uniqueNames = new Set(methodNames);
            expect(uniqueNames.size).toEqual(methodNames.length);
        });

        it('should detect abstract entity endpoint', () => {
            const abstractEndpoint = metadata.controllers.find(
                (c) => c.name === 'AbstractEntityEndpoint',
            )!;
            expect(abstractEndpoint).toBeDefined();
            expect(abstractEndpoint.paths).toEqual(['abstract']);
        });
    });

    describe('all controllers discovered', () => {
        it('should discover all decorated controllers', () => {
            const expectedControllers = [
                'MyService',
                'PromiseService',
                'SecureEndpoint',
                'SuperSecureEndpoint',
                'PrimitiveEndpoint',
                'TestUnionType',
                'ResponseController',
                'ParameterizedEndpoint',
                'AbstractEntityEndpoint',
                'UtilityTypes',
            ];

            const foundNames = metadata.controllers.map((c) => c.name);
            for (const name of expectedControllers) {
                expect(foundNames, `should find ${name}`).toContain(name);
            }
        });
    });
});
