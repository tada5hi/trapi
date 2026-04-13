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

describe('parameter metadata extraction', () => {
    let metadata: Metadata;
    let myService: Controller;
    let promiseService: Controller;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../decorators'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });

        myService = metadata.controllers.find(
            (c) => c.name === 'MyService',
        )!;
        promiseService = metadata.controllers.find(
            (c) => c.name === 'PromiseService',
        )!;
    });

    describe('query parameters', () => {
        it('should extract required query parameter', () => {
            const test2 = myService.methods.find((m) => m.name === 'test2')!;
            const testRequired = test2.parameters.find(
                (p) => p.name === 'testRequired',
            );
            expect(testRequired).toBeDefined();
            expect(testRequired!.in).toEqual('queryProp');
            expect(testRequired!.required).toBe(true);
            expect(testRequired!.type.typeName).toEqual('string');
        });

        it('should extract optional query parameter', () => {
            const test2 = myService.methods.find((m) => m.name === 'test2')!;
            const testOptional = test2.parameters.find(
                (p) => p.name === 'testOptional',
            );
            expect(testOptional).toBeDefined();
            expect(testOptional!.required).toBe(false);
        });

        it('should extract query parameter with default value', () => {
            const test2 = myService.methods.find((m) => m.name === 'test2')!;
            const testDefault = test2.parameters.find(
                (p) => p.name === 'testDefault',
            );
            expect(testDefault).toBeDefined();
            expect(testDefault!.required).toBe(false);
            expect(testDefault!.default).toEqual('value');
        });

        it('should extract enum query parameter', () => {
            const test2 = myService.methods.find((m) => m.name === 'test2')!;
            const testEnum = test2.parameters.find(
                (p) => p.name === 'testEnum',
            );
            expect(testEnum).toBeDefined();
            expect(testEnum!.required).toBe(false);
            // Should reference the enum type
            expect(testEnum!.type.typeName).toEqual('refEnum');
        });

        it('should extract numeric enum query parameter', () => {
            const test2 = myService.methods.find((m) => m.name === 'test2')!;
            const testNumericEnum = test2.parameters.find(
                (p) => p.name === 'testNumericEnum',
            );
            expect(testNumericEnum).toBeDefined();
            expect(testNumericEnum!.type.typeName).toEqual('refEnum');
        });
    });

    describe('default query values', () => {
        it('should extract numeric default value', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testDefaultQuery',
            )!;
            const numParam = method.parameters.find((p) => p.name === 'num');
            expect(numParam).toBeDefined();
            expect(numParam!.default).toEqual(5);
            expect(numParam!.required).toBe(false);
        });

        it('should extract string default value', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testDefaultQuery',
            )!;
            const strParam = method.parameters.find((p) => p.name === 'str');
            expect(strParam).toBeDefined();
            expect(strParam!.default).toEqual('default value');
        });

        it('should extract boolean default values', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testDefaultQuery',
            )!;
            const bool1Param = method.parameters.find((p) => p.name === 'bool1');
            const bool2Param = method.parameters.find((p) => p.name === 'bool2');
            expect(bool1Param!.default).toEqual(true);
            expect(bool2Param!.default).toEqual(false);
        });

        it('should extract array default value', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testDefaultQuery',
            )!;
            const arrParam = method.parameters.find((p) => p.name === 'arr');
            expect(arrParam).toBeDefined();
            expect(arrParam!.default).toEqual(['a', 'b', 'c']);
            expect(arrParam!.type.typeName).toEqual('array');
        });
    });

    describe('multi-query parameters', () => {
        it('should extract array query parameter', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testMultiQuery',
            )!;
            const idParam = method.parameters.find((p) => p.name === 'id');
            expect(idParam).toBeDefined();
            expect(idParam!.type.typeName).toEqual('array');
            expect(idParam!.required).toBe(true);
        });

        it('should extract union-type query parameter', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testMultiQuery',
            )!;
            const nameParam = method.parameters.find((p) => p.name === 'name');
            expect(nameParam).toBeDefined();
            expect(nameParam!.required).toBe(false);
        });
    });

    describe('body parameters', () => {
        it('should extract body parameter from @Body decorator', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testPostString',
            )!;
            // @Body('name') creates a bodyProp parameter
            const bodyParam = method.parameters.find(
                (p) => p.in === 'body' || p.in === 'bodyProp',
            );
            expect(bodyParam).toBeDefined();
            expect(bodyParam!.type.typeName).toEqual('string');
        });

        it('should extract object body parameter', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testPostObject',
            )!;
            expect(method.parameters.length).toBeGreaterThan(0);
        });
    });

    describe('form parameters', () => {
        it('should extract form parameter', () => {
            const method = myService.methods.find(
                (m) => m.name === 'testFormParam',
            )!;
            const formParam = method.parameters.find(
                (p) => p.in === 'formData',
            );
            expect(formParam).toBeDefined();
            expect(formParam!.name).toEqual('id');
            expect(formParam!.type.typeName).toEqual('string');
        });
    });

    describe('path parameters', () => {
        it('should extract path parameter from PromiseService', () => {
            const method = promiseService.methods.find(
                (m) => m.name === 'testGetSingle',
            )!;
            const pathParam = method.parameters.find((p) => p.in === 'path');
            expect(pathParam).toBeDefined();
            expect(pathParam!.name).toEqual('id');
            expect(pathParam!.type.typeName).toEqual('string');
            expect(pathParam!.required).toBe(true);
        });
    });

    describe('optional parameters', () => {
        it('should mark optional parameters correctly', () => {
            const method = promiseService.methods.find(
                (m) => m.name === 'test',
            )!;
            const testParam = method.parameters.find(
                (p) => p.name === 'testParam',
            );
            expect(testParam).toBeDefined();
            expect(testParam!.required).toBe(false);
        });
    });
});
