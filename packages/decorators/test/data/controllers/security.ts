/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get, Mount,
    Post,
    Security,
} from '../../../src';

@Controller()
@Mount('secure')
@Security(['ROLE_1', 'ROLE_2'], 'access_token')
export class SecureEndpoint {
    @Get()
    public get(): string {
        return 'Access Granted';
    }

    @Post()
    @Security([], 'user_email')
    public post(): string {
        return 'Posted';
    }
}
