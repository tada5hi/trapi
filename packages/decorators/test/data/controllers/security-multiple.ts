/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Mount, Security,
} from '../../../src';

@Controller()
@Mount('supersecure')
@Security('access_token')
@Security('user_email')
@Security()
export class SuperSecureEndpoint {
    @Get()
    public get(): string {
        return 'Access Granted';
    }
}
