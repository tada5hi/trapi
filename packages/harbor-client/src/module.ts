/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, Config } from '@trapi/client';
import { HarborClientConfig, HarborSearchResult } from './type';
import { HarborRobotAccountAPI } from './robot-account';
import { HarborProjectAPI } from './project';
import { HarborProjectWebHookAPI } from './project-webhook';
import { HarborProjectRepositoryAPI } from './project-repository';
import { HarborProjectArtifactAPI } from './project-artifact';
import { parseConnectionString } from './utils';

export class HarborClient extends Client {
    public readonly project: HarborProjectAPI;

    public readonly projectArtifact: HarborProjectArtifactAPI;

    public readonly projectRepository: HarborProjectRepositoryAPI;

    public readonly projectWebHook: HarborProjectWebHookAPI;

    public readonly robotAccount : HarborRobotAccountAPI;

    // -----------------------------------------------------------------------------------

    constructor(config: Config) {
        const harborConfig : HarborClientConfig = parseConnectionString(config.extra.connectionString);

        config.driver = {
            ...(config.driver ?? {}),
            baseURL: harborConfig.host,
        };

        super(config);

        this.setAuthorizationHeader({
            type: 'Basic',
            username: harborConfig.user,
            password: harborConfig.password,
        });

        this.project = new HarborProjectAPI(this.driver);
        this.projectArtifact = new HarborProjectArtifactAPI(this.driver);
        this.projectWebHook = new HarborProjectWebHookAPI(this.driver);
        this.projectRepository = new HarborProjectRepositoryAPI(this.driver);
        this.robotAccount = new HarborRobotAccountAPI(this.driver);
    }

    // -----------------------------------------------------------------------------------

    async search(q: string): Promise<HarborSearchResult> {
        const { data } = await this.driver
            .get(`search?q=${q}`);

        return data;
    }
}
