/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Extension,
    Get,
    QueryProp,
    Tags,
} from '../_stubs';

@Controller('extensions')
@Tags('extensions')
@Extension('x-controller', 'controller-value')
@Extension('x-controller-meta', { team: 'platform' })
export class ExtensionsController {
    @Get()
    list(
        @QueryProp('limit')
        @Extension('x-param', 'param-value')
        limit?: number,
    ): Promise<string[]> {
        return Promise.resolve([]);
    }
}
