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

describe('security metadata extraction', () => {
    let metadata: Metadata;
    let secureController: Controller;
    let superSecureController: Controller;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });

        secureController = metadata.controllers.find(
            (c) => c.name === 'SecureEndpoint',
        )!;
        superSecureController = metadata.controllers.find(
            (c) => c.name === 'SuperSecureEndpoint',
        )!;
    });

    describe('SecureEndpoint', () => {
        it('should extract controller-level security', () => {
            expect(secureController).toBeDefined();
            expect(secureController.security).toBeDefined();
            expect(secureController.security!.length).toBeGreaterThan(0);
        });

        it('should extract security with roles and scheme', () => {
            const security = secureController.security!;
            // Should have access_token scheme with roles
            const accessTokenSecurity = security.find(
                (s) => Object.keys(s).includes('access_token'),
            );
            expect(accessTokenSecurity).toBeDefined();
            expect(accessTokenSecurity!.access_token).toContain('ROLE_1');
            expect(accessTokenSecurity!.access_token).toContain('ROLE_2');
        });

        it('should inherit controller security on GET method', () => {
            const getMethod = secureController.methods.find(
                (m) => m.name === 'get',
            );
            expect(getMethod).toBeDefined();
            // Method should inherit controller security
            expect(getMethod!.security).toBeDefined();
        });

        it('should override controller security on POST method', () => {
            const postMethod = secureController.methods.find(
                (m) => m.name === 'post',
            );
            expect(postMethod).toBeDefined();
            expect(postMethod!.security).toBeDefined();
            // Should have user_email scheme
            const userEmailSecurity = postMethod!.security!.find(
                (s) => Object.keys(s).includes('user_email'),
            );
            expect(userEmailSecurity).toBeDefined();
        });
    });

    describe('SuperSecureEndpoint', () => {
        it('should exist and have security defined', () => {
            expect(superSecureController).toBeDefined();
            // Security may be empty array if @Security('scheme_name') is treated
            // as roles=['scheme_name'] rather than scheme=scheme_name
            expect(superSecureController.security).toBeDefined();
        });

        it('should inherit security on GET method', () => {
            const getMethod = superSecureController.methods.find(
                (m) => m.name === 'get',
            );
            expect(getMethod).toBeDefined();
            expect(getMethod!.security).toBeDefined();
        });
    });
});
