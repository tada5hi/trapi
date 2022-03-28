/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientDriverInstance } from '@trapi/client';
import { HarborRepository } from './type';
import { buildProjectNameFromRepositoryName } from './utils';

export class HarborProjectRepositoryAPI {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async find(projectName: string, repositoryName: string): Promise<HarborRepository | undefined> {
        const { data } = await this.client.get(`projects/${projectName}/repositories?q=name=~${repositoryName}&=page_size=1`);

        if (data.length !== 1) {
            return undefined;
        }

        const item : HarborRepository = data[0];

        return {
            ...item,
            project_name: buildProjectNameFromRepositoryName(item.name),
        };
    }

    async getOne(projectName: string, repositoryName: string) : Promise<HarborRepository> {
        const { data } : { data: HarborRepository } = await this.client.get(`projects/${projectName}/repositories/${repositoryName}`);
        return {
            ...data,
            project_name: buildProjectNameFromRepositoryName(data.name),
        };
    }

    async getMany(projectName: string): Promise<HarborRepository[]> {
        const result = await this.client
            .get(`projects/${projectName}/repositories`);

        return result.data.map((item: HarborRepository) => ({
            ...item,
            project_name: buildProjectNameFromRepositoryName(item.name),
        }));
    }

    async update(projectName: string, repositoryName: string, data: Partial<HarborRepository>) {
        await this.client
            .put(`projects/${projectName}/repositories/${repositoryName}`, data);
    }

    async delete(projectName: string, repositoryName: string) : Promise<void> {
        await this.client
            .get(`projects/${projectName}/repositories/${repositoryName}`);
    }
}
