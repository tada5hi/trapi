/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import jsonata from 'jsonata';
import { load } from 'locter';
import type { MetadataGeneratorOutput, SpecificationV2, SpecificationV3 } from '../../../src';
import { createSpecificationGenerator } from '../../../src';

describe('ResponseController', () => {
    let spec : SpecificationV2.Spec | SpecificationV3.Spec;

    beforeAll(async () => {
        const metadata : MetadataGeneratorOutput = await load('./test/data/metadata.json');

        const specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });

        spec = await specGenerator.getSwaggerSpec();
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
