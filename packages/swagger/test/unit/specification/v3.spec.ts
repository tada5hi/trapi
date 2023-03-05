/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load } from 'locter';
import type {
    AbstractSpecGenerator,
    MetadataGeneratorOutput,
} from '../../../src';
import {
    Version3SpecGenerator,
    createSpecificationGenerator,
} from '../../../src';

describe('SpecGenerator', () => {
    let specGenerator : AbstractSpecGenerator<any, any>;

    beforeAll(async () => {
        const metadata : MetadataGeneratorOutput = await load('./test/data/metadata.json');

        specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });
    });

    it('should be able to generate open api 3.0 outputs', async () => {
        const openapi = await new Version3SpecGenerator(specGenerator.getMetaData(), {}).getSwaggerSpec();
        expect(openapi.openapi).toEqual('3.0.0');
    });
});
