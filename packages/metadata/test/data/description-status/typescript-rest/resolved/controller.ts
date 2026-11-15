/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Description, Path } from '../../../_stubs';
import { HttpStatus, IMPORTED_CONFLICT, STATUS } from '../../constants';

const GET: any = () => () => { /* no-op */ };

const LOCAL_NOT_FOUND = 404;

@Path('/statuses')
export class DescriptionStatusController {
    @GET
    @Path('/local')
    @Description(LOCAL_NOT_FOUND, 'Not found')
    public local(): string {
        return '';
    }

    @GET
    @Path('/imported')
    @Description(IMPORTED_CONFLICT, 'Conflict')
    public imported(): string {
        return '';
    }

    @GET
    @Path('/enum')
    @Description(HttpStatus.Created, 'Created')
    public enumMember(): string {
        return '';
    }

    @GET
    @Path('/as-const')
    @Description(STATUS.ACCEPTED, 'Accepted')
    public asConst(): string {
        return '';
    }

    @GET
    @Path('/literal')
    @Description(400, 'Bad request')
    public literal(): string {
        return '';
    }

    @GET
    @Path('/absent')
    @Description()
    public absent(): string {
        return '';
    }
}
