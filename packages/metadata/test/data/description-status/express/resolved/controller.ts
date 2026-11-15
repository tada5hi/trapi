/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Description,
    Get,
} from '../../../_stubs';
import { HttpStatus, IMPORTED_CONFLICT, STATUS } from '../../constants';

const LOCAL_NOT_FOUND = 404;

@Controller('/statuses')
export class DescriptionStatusController {
    @Get('/local')
    @Description(LOCAL_NOT_FOUND, 'Not found')
    public local(): string {
        return '';
    }

    @Get('/imported')
    @Description(IMPORTED_CONFLICT, 'Conflict')
    public imported(): string {
        return '';
    }

    @Get('/enum')
    @Description(HttpStatus.Created, 'Created')
    public enumMember(): string {
        return '';
    }

    @Get('/as-const')
    @Description(STATUS.ACCEPTED, 'Accepted')
    public asConst(): string {
        return '';
    }

    @Get('/literal')
    @Description(400, 'Bad request')
    public literal(): string {
        return '';
    }

    @Get('/absent')
    @Description()
    public absent(): string {
        return '';
    }
}
