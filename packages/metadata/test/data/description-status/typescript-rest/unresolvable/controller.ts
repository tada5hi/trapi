/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Description, Path } from '../../../_stubs';

const GET: any = () => () => { /* no-op */ };

declare function computeStatus(): number;

@Path('/statuses')
export class UnresolvableStatusController {
    @GET
    @Path('/')
    @Description(computeStatus(), 'Computed')
    public computed(): string {
        return '';
    }
}
