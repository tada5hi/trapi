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

describe('AbstractEntityEndpoint', () => {
    let spec : SpecificationV2.SpecV2 | SpecificationV3.SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        const specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });

        spec = await specGenerator.getSwaggerSpec();
    });

    it('should not duplicate inherited properties in the required list', async () => {
        const expression = jsonata('definitions.NamedEntity.required');
        expect(await expression.evaluate(spec)).toStrictEqual(['id', 'name']);
    });

    it('should use property description from base class if not defined in child', async () => {
        const expression = jsonata('definitions.NamedEntity.properties.id.description');
        expect(await expression.evaluate(spec)).toEqual('A numeric identifier');
    });
});
