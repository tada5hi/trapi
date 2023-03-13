/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CollectionFormat } from '@trapi/metadata/src';
import jsonata from 'jsonata';
import { load } from 'locter';
import type { Metadata, SpecV2, SpecV3 } from '../../../src';
import { Version, generate } from '../../../src';

describe('generating swagger spec from metadata', () => {
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

    it('should generate paths for decorated services', () => {
        expect(spec.paths).toHaveProperty('/mypath');
        expect(spec.paths).toHaveProperty('/mypath/secondpath');
    });

    it('should generate paths for decorated services, declared on superclasses', () => {
        expect(spec.paths).toHaveProperty('/promise');
        expect(spec.paths).toHaveProperty('/promise/{id}');
    });

    it('should generate examples for object parameter', async () => {
        expect(spec.paths).toHaveProperty('/mypath/secondpath');
        const expression = jsonata('paths."/mypath/secondpath".get.responses."200".examples."application/json".name');
        expect(await expression.evaluate(spec)).toEqual('Joe');
    });

    it('should generate examples for array parameter', async () => {
        expect(spec.paths).toHaveProperty('/mypath');
        const expression = jsonata('paths."/mypath".post.responses."200".examples."application/json".name');
        expect(await expression.evaluate(spec)).toEqual('Joe');
    });

    it('should generate optional parameters for params with question marks or default initializers', async () => {
        let expression = jsonata('paths."/mypath/secondpath".get.parameters[0].required');
        expect(await expression.evaluate(spec)).toEqual(true);
        expression = jsonata('paths."/mypath/secondpath".get.parameters[1].required');
        expect(await expression.evaluate(spec)).toEqual(false);
        expression = jsonata('paths."/mypath/secondpath".get.parameters[2].required');
        expect(await expression.evaluate(spec)).toEqual(false);
        expression = jsonata('paths."/mypath/secondpath".get.parameters[3]');
        const evaluate = await expression.evaluate(spec);
        expect(evaluate.type).toEqual('string');
        expect(evaluate.enum).toBeDefined();

        // todo: this in v3 the case
        // expect(evaluate.schema).toHaveProperty('$ref');
        // expect(evaluate.schema.$ref).toEqual('#/definitions/TestEnum');
    });

    it('should generate specs for enum params based on it values types', async () => {
        let expression = jsonata('paths."/mypath/secondpath".get.parameters[3]');
        let paramSpec = await expression.evaluate(spec);
        expect(paramSpec.type).toEqual('string');
        expect(paramSpec.name).toEqual('testEnum');
        expect(paramSpec.enum).toBeDefined();

        // todo v3
        // expect(paramSpec.schema).toHaveProperty('$ref');
        // expect(paramSpec.schema.$ref).toEqual('#/definitions/TestEnum');
        expect(paramSpec.in).toEqual('query');

        expression = jsonata('paths."/mypath/secondpath".get.parameters[4]');
        paramSpec = await expression.evaluate(spec);
        expect(paramSpec.type).toEqual('number');
        expect(paramSpec.name).toEqual('testNumericEnum');
        expect(paramSpec.enum).toBeDefined();

        // expect(paramSpec.schema).toHaveProperty('$ref');
        // expect(paramSpec.schema.$ref).toEqual('#/definitions/TestNumericEnum');
        // expect(paramSpec.in).toEqual('query');

        expression = jsonata('paths."/mypath/secondpath".get.parameters[5]');
        paramSpec = await expression.evaluate(spec);
        expect(paramSpec.type).toEqual('string');
        expect(paramSpec.name).toEqual('testMixedEnum');
        expect(paramSpec.enum).toEqual(['0', 'option2']);

        // expect(paramSpec.schema.$ref).toEqual('#/definitions/TestMixedEnum');
    });

    it('should generate description for methods and parameters', async () => {
        let expression = jsonata('paths."/mypath/secondpath".get.parameters[0].description');
        expect(await expression.evaluate(spec)).toEqual('This is the test param description');
        expression = jsonata('paths."/mypath/secondpath".get.description');
        expect(await expression.evaluate(spec)).toEqual('This is the method description');
    });

    it('should support multiple response decorators', async () => {
        let expression = jsonata('paths."/mypath".get.responses."400".description');
        expect(await expression.evaluate(spec)).toEqual('The request format was incorrect.');
        expression = jsonata('paths."/mypath".get.responses."500".description');
        expect(await expression.evaluate(spec)).toEqual('There was an unexpected error.');
        expression = jsonata('paths."/mypath/secondpath".get.responses."200".description');
        expect(await expression.evaluate(spec)).toEqual('The success test.');
        expression = jsonata('paths."/mypath/secondpath".get.responses."200".schema."$ref"');
        expect(await expression.evaluate(spec)).toEqual('#/definitions/Person');
        expression = jsonata('paths."/mypath/secondpath".get.responses."200".examples."application/json"[0].name');
        expect(await expression.evaluate(spec)).toEqual('Joe');
    });

    it('should include default response if a non-conflicting response is declared with a decorator', async () => {
        let expression = jsonata('paths."/promise".get.responses');
        expect(Object.keys(await expression.evaluate(spec)).length).toEqual(2);
        expression = jsonata('paths."/promise".get.responses."200".description');
        expect(await expression.evaluate(spec)).toEqual('Ok');
        expression = jsonata('paths."/promise".get.responses."401".description');
        expect(await expression.evaluate(spec)).toEqual('Unauthorized');
    });

    it('should not include default response if it conflicts with a declared response', async () => {
        let expression = jsonata('paths."/promise".post.responses');
        expect(Object.keys(await expression.evaluate(spec)).length).toEqual(3); // todo: originally 2
        expression = jsonata('paths."/promise".post.responses."201".description');
        expect(await expression.evaluate(spec)).toEqual('Person Created');
        expression = jsonata('paths."/promise".post.responses."201".examples."application/json".name');
        expect(await expression.evaluate(spec)).toEqual('Test Person');
        expression = jsonata('paths."/promise".post.responses."401".description');
        expect(await expression.evaluate(spec)).toEqual('Unauthorized');
    });

    it('should update a declared response with the declared default response example if response annotation doesn\'t specify one', async () => {
        let expression = jsonata('paths."/promise/{id}".get.responses');
        expect(Object.keys(await expression.evaluate(spec)).length).toEqual(2);
        expression = jsonata('paths."/promise/{id}".get.responses."200".description');
        expect(await expression.evaluate(spec)).toEqual('All Good');

        expression = jsonata('paths."/promise/{id}".get.responses."200".examples."application/json".name');
        expect(await expression.evaluate(spec)).toEqual('Test Person');
        expression = jsonata('paths."/promise/{id}".get.responses."401".description');
        expect(await expression.evaluate(spec)).toEqual('Unauthorized');
    });

    it('should generate a definition with a referenced type', async () => {
        const expression = jsonata('definitions.Person.properties.address."$ref"');
        expect(await expression.evaluate(spec)).toEqual('#/definitions/Address');
    });

    it('should generate a body param with string schema type', async () => {
        let expression = jsonata('paths."/mypath".post.parameters[0].in');
        expect(await expression.evaluate(spec)).toEqual('body');
        expression = jsonata('paths."/mypath".post.parameters[0].name');
        expect(await expression.evaluate(spec)).toEqual('body');
        expression = jsonata('paths."/mypath".post.parameters[0].schema.type');
        expect(await expression.evaluate(spec)).toEqual('object');
    });

    it('should generate a body param with object schema type', async () => {
        let expression = jsonata('paths."/mypath/obj".post.parameters[0].name');
        expect(await expression.evaluate(spec)).toEqual('data');
        expression = jsonata('paths."/mypath/obj".post.parameters[0].schema.type');
        expect(await expression.evaluate(spec)).toEqual('object');
    });

    it('should generate a query param with array type', async () => {
        const param = await jsonata('paths."/mypath/multi-query".get.parameters[0]').evaluate(spec);
        expect(param.name).toEqual('id');
        expect(param.required).toEqual(true);
        expect(param.type).toEqual('array');
        expect(param.items).toBeDefined();
        expect(param.items.type).toEqual('string');
        expect(param.collectionFormat).toEqual(CollectionFormat.MULTI);
    });

    it('should generate an array query param for parameter with compatible array and primitive intersection type', async () => {
        const param = await jsonata('paths."/mypath/multi-query".get.parameters[1]').evaluate(spec);
        expect(param.name).toEqual('name');
        expect(param.required).toEqual(false);
        expect(param.type).toEqual('string'); // its union type of Array<string> and string -> object
        // expect(param.items).toBeDefined();
        // expect(param.items.type).toEqual('string');
        // expect(param.collectionFormat).toEqual('multi');
    });

    it('should generate default value for a number query param', async () => {
        const param = await jsonata('paths."/mypath/default-query".get.parameters[0]').evaluate(spec);
        expect(param.name).toEqual('num');
        expect(param.required).toEqual(false);
        expect(param.type).toEqual('number');
        expect(param.default).toEqual(5);
    });

    it('should generate default value for a string query param', async () => {
        const param = await jsonata('paths."/mypath/default-query".get.parameters[1]').evaluate(spec);
        expect(param.name).toEqual('str');
        expect(param.required).toEqual(false);
        expect(param.type).toEqual('string');
        expect(param.default).toEqual('default value');
    });

    it('should generate default value for a true boolean query param', async () => {
        const param = await jsonata('paths."/mypath/default-query".get.parameters[2]').evaluate(spec);
        expect(param.name).toEqual('bool1');
        expect(param.required).toEqual(false);
        expect(param.type).toEqual('boolean');
        expect(param.default).toEqual(true);
    });

    it('should generate default value for a false boolean query param', async () => {
        const param = await jsonata('paths."/mypath/default-query".get.parameters[3]').evaluate(spec);
        expect(param.name).toEqual('bool2');
        expect(param.required).toEqual(false);
        expect(param.type).toEqual('boolean');
        expect(param.default).toEqual(false);
    });

    it('should generate default value for a string array query param', async () => {
        const param = await jsonata('paths."/mypath/default-query".get.parameters[4]').evaluate(spec);
        expect(param.name).toEqual('arr');
        expect(param.required).toEqual(false);
        expect(param.type).toEqual('array');
        expect(param.items).toBeDefined();
        expect(param.items.type).toEqual('string');
        expect(param.default).toStrictEqual(['a', 'b', 'c']);
    });
});
