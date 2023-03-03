/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Response, Security } from '../type';
import type { Method } from '../method';

export interface Controller {
    /**
     * File Location of the Controller.
     */
    location: string;
    /**
     * Array of found method ( class functions )
     * for a specific controller (class)
     */
    methods: Method[];
    name: string;
    /**
     * The relative URL Path, i.e /users
     */
    path: string;
    /**
     * Allowed Content-Types to pass
     * data according the definition.
     *
     * i.e. ['application/json']
     */
    consumes: string[];
    /**
     * Possible Content-Types to receive
     * data according the definition.
     *
     * i.e. ['application/json']
     */
    produces: string[];
    responses: Response[];
    /**
     * Tags can be used to group controllers
     * by a name together.
     *
     * i.e. ['auth']
     */
    tags: string[];
    security?: Security[];
}
