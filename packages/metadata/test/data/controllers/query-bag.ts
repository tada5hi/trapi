/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Controller, Get, Query } from '../_stubs';

@Controller('/search')
export class QueryBagController {
    @Get()
    public list(@Query() search: string, @Query() tags: string[]): string[] {
        return [search, ...tags];
    }
}
