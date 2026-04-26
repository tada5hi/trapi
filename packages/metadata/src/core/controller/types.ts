/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Extension } from '../resolver/extension';
import type { Response, Security } from '../generator/types';
import type { Method } from '../method/types';

export type Controller = {
    /**
     * Allowed Content-Types to pass
     * data according the definition.
     *
     * i.e. ['application/json']
     */
    consumes: string[];

    /**
     * Vendor extensions (x-* keys) declared on the controller class.
     */
    extensions: Extension[];

    /**
     * Is controller hidden, and should
     * not be used/displayed in some scenarios.
     */
    hidden: boolean,
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
};

export interface IControllerGenerator {
    isValid(): boolean;
    generate(): Controller | null;
}
