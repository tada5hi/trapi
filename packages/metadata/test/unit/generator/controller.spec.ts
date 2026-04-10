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
import process from 'node:process';
import type { Metadata } from '../../../src';
import { generateMetadata } from '../../../src';

describe('controller metadata extraction', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.join(process.cwd(), '..', 'decorators'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
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
                expect(controller!.path).toEqual(expectedPath);
            }
        });

        it('should extract parameterized controller path', () => {
            const controller = metadata.controllers.find(
                (c) => c.name === 'ParameterizedEndpoint',
            )!;
            expect(controller).toBeDefined();
            expect(controller.path).toContain('parameterized');
            expect(controller.path).toContain(':objectId');
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
        it('should detect controllers that extend a base class', () => {
            const promiseService = metadata.controllers.find(
                (c) => c.name === 'PromiseService',
            )!;
            expect(promiseService).toBeDefined();
            expect(promiseService.methods.length).toBeGreaterThan(0);
        });

        it('should detect abstract entity endpoint', () => {
            const abstractEndpoint = metadata.controllers.find(
                (c) => c.name === 'AbstractEntityEndpoint',
            )!;
            expect(abstractEndpoint).toBeDefined();
            expect(abstractEndpoint.path).toEqual('abstract');
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
