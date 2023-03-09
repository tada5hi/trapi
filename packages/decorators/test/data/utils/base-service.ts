/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Delete, Method, PathParam } from '../../../src';

export class BaseService {
    @Delete
    @Method(':id')
    public testDelete(@PathParam('id') id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        });
    }
}
