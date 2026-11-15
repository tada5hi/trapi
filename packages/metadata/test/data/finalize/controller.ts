/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Controller, Get, Post } from '../_stubs';

interface IItem {
    id: string;
}

@Controller('/items')
export class FinalizeController {
    /**
     * @summary List items
     */
    @Get('/list')
    public list(): IItem[] {
        return [];
    }

    @Post('/create')
    public create(): IItem {
        return { id: '1' };
    }

    // No verb decorator: not a route method, so no finalizer runs for it.
    public helper(): string {
        return '';
    }
}

// No controller decorator: only a controller finalizer can claim it.
export class UnclaimedController {
    @Get('/ping')
    public ping(): string {
        return 'pong';
    }
}
