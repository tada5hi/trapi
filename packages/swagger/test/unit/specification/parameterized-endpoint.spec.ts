/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load } from 'locter';
import jsonata from 'jsonata';
import type { Metadata, SpecificationV2, SpecificationV3 } from '../../../src';
import { createSpecificationGenerator } from '../../../src';

describe('ParameterizedEndpoint', () => {
    let spec : SpecificationV2.Spec | SpecificationV3.Spec;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        const specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });

        spec = await specGenerator.getSwaggerSpec();
    });

    it('should generate path param for params declared on class', async () => {
        const expression = jsonata('paths."/parameterized/{objectId}/test".get.parameters[0].in');
        expect(await expression.evaluate(spec)).toEqual('path');
    });
});
