/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {setTrapiClientConfig, useTrapiClient} from "../../src";
import {TestTrapiClient} from "../data/child-class";

describe('src/**/*.ts', () => {
    it('should create instance with inherited class', () => {
        setTrapiClientConfig('default', {
            clazz: TestTrapiClient
        });

        const instance = useTrapiClient<TestTrapiClient>('default');

        expect(instance.test()).toEqual(true);
    });
})
