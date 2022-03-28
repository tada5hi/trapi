/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type HarborRepository = {
    id: number,
    // <project-name>/<repository-name>
    name: string,
    project_id: number,
    project_name?: string,
    pull_count: number,
    artifact_count: number,
    description?: string,
    creation_time: string,
    update_time: string,
};

export type HarborSearchRepository = {
    // <project-name>/<repository-name>
    repository_name: string,
    project_name: string,
    artifact_count: number,
    project_public: boolean,
    project_id: number,
    pull_count: number
};
