/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import jsonata from 'jsonata';
import { load } from 'locter';
import type { Metadata, SpecificationV2, SpecificationV3 } from '../../../src';
import { createSpecificationGenerator } from '../../../src';

describe('TestUnionType', () => {
    let spec : SpecificationV2.SpecV2 | SpecificationV3.SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        const specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });

        spec = await specGenerator.getSwaggerSpec();
    });

    it('should support union types', async () => {
        const expression = jsonata('paths."/unionTypes".post.parameters[0]');
        const paramSpec = await expression.evaluate(spec);
        const definitionExpression = jsonata('definitions.MyTypeWithUnion.properties.property');
        const myTypeDefinition = await definitionExpression.evaluate(spec);
        expect(paramSpec.schema.$ref).toEqual('#/definitions/MyTypeWithUnion');
        expect(myTypeDefinition.type).toEqual('string');
        expect(myTypeDefinition.enum).toEqual(['value1', 'value2']);
    });
});
