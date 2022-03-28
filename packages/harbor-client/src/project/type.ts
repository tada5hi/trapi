/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type HarborProject = {
    name: string,
    project_id: string,
    owner_id: number,
    owner_name: string,
    registry_id?: number,
    repo_count: number,
    update_time: string,
    creation_time: string,
    metadata: HarborProjectMetadata
};

export type HarborProjectMetadata = {
    public: boolean,
    auto_scan?: string,
    severity?: 'none' | 'low' | 'medium' | 'high' | 'critical'
};

export type HarborProjectPayload = {
    project_name: string,
    public?: boolean,
    registry_id?: string | number | null,
    storage_limit?: number
};
