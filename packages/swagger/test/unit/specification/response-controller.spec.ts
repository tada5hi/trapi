/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import jsonata from 'jsonata';
import { load } from 'locter';
import type { Metadata, SpecV2, SpecV3 } from '../../../src';
import { Version, generate } from '../../../src';

describe('ResponseController', () => {
    let spec : SpecV2 | SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        spec = await generate({
            version: Version.V2,
            options: {
                output: false,
                servers: 'http://localhost:3000/',
                metadata,
            },
        });
    });

    it('should support multiple response decorators on controller', async () => {
        let expression = jsonata('paths."/response".get.responses."400".description');
        expect(await expression.evaluate(spec)).toEqual('The request format was incorrect.');
        expression = jsonata('paths."/response".get.responses."500".description');
        expect(await expression.evaluate(spec)).toEqual('There was an unexpected error.');
    });

    it('should support decorators on controller and method', async () => {
        let expression = jsonata('paths."/response/test".get.responses."400".description');
        expect(await expression.evaluate(spec)).toEqual('The request format was incorrect.');
        expression = jsonata('paths."/response/test".get.responses."500".description');
        expect(await expression.evaluate(spec)).toEqual('There was an unexpected error.');
        expression = jsonata('paths."/response/test".get.responses."502".description');
        expect(await expression.evaluate(spec)).toEqual('Internal server error.');
        expression = jsonata('paths."/response/test".get.responses."401".description');
        expect(await expression.evaluate(spec)).toEqual('Unauthorized.');
    });
});
