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

describe('TestUnionType', () => {
    let spec : SpecV2 | SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        spec = await generate({
            version: Version.V2,
            options: {
                servers: 'http://localhost:3000/',
                metadata,
            },
        });
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
