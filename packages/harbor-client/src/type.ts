/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HarborProject } from './project';
import { HarborSearchRepository } from './project-repository';

export type HarborClientConfig = {
    host: string,
    user: string,
    password: string
};

export type HarborSearchResult = {
    project: HarborProject[],
    repository: HarborSearchRepository[]
};
