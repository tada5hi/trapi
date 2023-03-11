/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Description,
    Get,
    Mount,
} from '../../../src';

@Controller()
@Mount('response')
@Description<string>(400, 'The request format was incorrect.')
@Description<string>(500, 'There was an unexpected error.')
export class ResponseController {
    @Get()
    public get(): string {
        return '42';
    }

    @Description<string>(401, 'Unauthorized.')
    @Description<string>(502, 'Internal server error.')
    @Get()
    @Mount('/test')
    public test(): string {
        return 'OK';
    }
}
