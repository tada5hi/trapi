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
import type { Controller, Metadata } from '../../../src';
import { generateMetadata } from '../../../src';

describe('response metadata extraction', () => {
    let metadata: Metadata;
    let responseController: Controller;
    let promiseService: Controller;
    let myService: Controller;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../decorators'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });

        responseController = metadata.controllers.find(
            (c) => c.name === 'ResponseController',
        )!;
        promiseService = metadata.controllers.find(
            (c) => c.name === 'PromiseService',
        )!;
        myService = metadata.controllers.find(
            (c) => c.name === 'MyService',
        )!;
    });

    describe('ResponseController - class-level descriptions', () => {
        it('should extract class-level response descriptions', () => {
            expect(responseController).toBeDefined();
            expect(responseController.responses.length).toBeGreaterThan(0);
        });

        it('should have 400 and 500 response descriptions at class level', () => {
            const statuses = responseController.responses.map((r) => r.status);
            expect(statuses).toContain('400');
            expect(statuses).toContain('500');
        });

        it('should have correct descriptions', () => {
            const res400 = responseController.responses.find((r) => r.status === '400');
            const res500 = responseController.responses.find((r) => r.status === '500');
            expect(res400!.description).toEqual('The request format was incorrect.');
            expect(res500!.description).toEqual('There was an unexpected error.');
        });

        it('should have method-level descriptions on test method', () => {
            const testMethod = responseController.methods.find(
                (m) => m.name === 'test',
            );
            expect(testMethod).toBeDefined();
            const statuses = testMethod!.responses.map((r) => r.status);
            expect(statuses).toContain('401');
            expect(statuses).toContain('502');
        });
    });

    describe('PromiseService - response examples', () => {
        it('should extract response example from @Example decorator', () => {
            const testGetSingle = promiseService.methods.find(
                (m) => m.name === 'testGetSingle',
            )!;
            expect(testGetSingle).toBeDefined();

            // Should have a 200 response with example
            const res200 = testGetSingle.responses.find((r) => r.status === '200');
            expect(res200).toBeDefined();
            expect(res200!.examples).toBeDefined();
            expect(res200!.examples!.length).toBeGreaterThan(0);
        });

        it('should extract 201 response from @Description with example', () => {
            const testPost = promiseService.methods.find(
                (m) => m.name === 'testPost',
            )!;
            expect(testPost).toBeDefined();

            const res201 = testPost.responses.find((r) => r.status === '201');
            expect(res201).toBeDefined();
            expect(res201!.description).toEqual('Person Created');
        });

        it('should extract 401 response descriptions', () => {
            const testMethod = promiseService.methods.find(
                (m) => m.name === 'test',
            )!;
            expect(testMethod).toBeDefined();

            const res401 = testMethod.responses.find((r) => r.status === '401');
            expect(res401).toBeDefined();
            expect(res401!.description).toEqual('Unauthorized');
        });

        it('should extract produces from @Produces decorator', () => {
            const testFile = promiseService.methods.find(
                (m) => m.name === 'testFile',
            )!;
            expect(testFile).toBeDefined();
            expect(testFile.produces).toContain('application/pdf');
        });
    });

    describe('MyService - multiple response decorators', () => {
        it('should extract multiple response status codes', () => {
            const testMethod = myService.methods.find(
                (m) => m.name === 'test',
            )!;
            expect(testMethod).toBeDefined();

            const statuses = testMethod.responses.map((r) => r.status);
            expect(statuses).toContain('400');
            expect(statuses).toContain('500');
        });

        it('should extract response with schema and example on test2', () => {
            const test2 = myService.methods.find(
                (m) => m.name === 'test2',
            )!;
            expect(test2).toBeDefined();

            const res200 = test2.responses.find((r) => r.status === '200');
            expect(res200).toBeDefined();
            expect(res200!.description).toEqual('The success test.');
        });
    });
});
