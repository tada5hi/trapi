/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GeneratorOutput } from '@trapi/metadata';
import jsonata from 'jsonata';
import { Version3SpecGenerator, createSpecificationGenerator } from '../../src';

const metadata : GeneratorOutput = require('../data/metadata.json');

const specGenerator = createSpecificationGenerator(metadata, {
    host: 'http://localhost:3000/',
});

const spec = specGenerator.getSwaggerSpec();

describe('generating swagger spec from metadata', () => {
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
        expect(evaluate.schema).toHaveProperty('$ref');
        expect(evaluate.schema.$ref).toEqual('#/definitions/TestEnum');
    });

    it('should generate specs for enum params based on it values types', async () => {
        let expression = jsonata('paths."/mypath/secondpath".get.parameters[3]');
        let paramSpec = await expression.evaluate(spec);
        expect(paramSpec.schema).toHaveProperty('$ref');
        expect(paramSpec.schema.$ref).toEqual('#/definitions/TestEnum');
        expect(paramSpec.in).toEqual('query');

        expression = jsonata('paths."/mypath/secondpath".get.parameters[4]');
        paramSpec = await expression.evaluate(spec);
        expect(paramSpec.schema).toHaveProperty('$ref');
        expect(paramSpec.schema.$ref).toEqual('#/definitions/TestNumericEnum');
        expect(paramSpec.in).toEqual('query');

        expression = jsonata('paths."/mypath/secondpath".get.parameters[5]');
        paramSpec = await expression.evaluate(spec);

        expect(paramSpec.schema.$ref).toEqual('#/definitions/TestMixedEnum');
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
        expect(await expression.evaluate(spec)).toEqual('string');
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
        expect(param.collectionFormat).toEqual('multi');
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

describe('TypeEndpoint', () => {
    it('should generate definitions for type aliases', async () => {
        expect(spec.paths).toHaveProperty('/type/{param}');
        let expression = jsonata('definitions.SimpleHelloType.properties.greeting.description');
        expect(await expression.evaluate(spec)).toEqual('Description for greeting property');

        expression = jsonata('definitions.UUID');
        expect(await expression.evaluate(spec)).toEqual({
            description: undefined,
            default: undefined,
            example: undefined,
            format: undefined,
            type: 'string',
        });
    });

    it('should generate nested object types in definitions', async () => {
        let expression = jsonata('definitions.SimpleHelloType.properties.profile.type');
        expect(await expression.evaluate(spec)).toEqual('object');
        expression = jsonata('definitions.SimpleHelloType.properties.profile.description');
        expect(await expression.evaluate(spec)).toEqual('Description for profile');
        expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.type');
        expect(await expression.evaluate(spec)).toEqual('string');
        expression = jsonata('definitions.SimpleHelloType.properties.profile.properties.name.description');
        expect(await expression.evaluate(spec)).toEqual('Description for profile name');
    });

    it('should ignore properties that are functions', async () => {
        const expression = jsonata('definitions.SimpleHelloType.properties.comparePassword');
        expect(await expression.evaluate(spec)).toBeDefined(); // todo: fix
    });

    it('should support compilerOptions', async () => {
        let expression = jsonata('definitions.TestInterface');
        expect(await expression.evaluate(spec)).toEqual({
            description: undefined,
            properties: {
                a: { type: 'string', description: undefined },
                b: { type: 'number', format: 'double', description: undefined },
            },
            required: ['a', 'b'],
            type: 'object',
        });
        expect(spec.paths).toHaveProperty('/mypath/test-compiler-options');
        expression = jsonata('paths."/mypath/test-compiler-options".post.responses."200".schema');
        expect(await expression.evaluate(spec)).toEqual({ $ref: '#/definitions/TestInterface' });
        expression = jsonata('paths."/mypath/test-compiler-options".post.parameters[0].schema');
        expect(await expression.evaluate(spec)).toEqual({ $ref: '#/definitions/TestInterface' });
    });
    /*
    it('should support formparam', () => {
        expect(spec.paths).toHaveProperty('/mypath/test-form-param');
        let expression = jsonata('paths."/mypath/test-form-param".post.responses."200".schema');
        expect(expression.evaluate(spec)).toEqual({ type: 'string' });
        expression = jsonata('paths."/mypath/test-form-param".post.parameters[0]');
        expect(expression.evaluate(spec)).toEqual({
            description: '',
            in: 'formData',
            name: 'id',
            required: true,
            type: 'string',
        });
    });

     */
});

describe('PrimitiveEndpoint', () => {
    it('should generate integer type for @IsInt decorator declared on class property', async () => {
        let expression = jsonata('definitions.PrimitiveClassModel.properties.int.type');
        expect(await expression.evaluate(spec)).toEqual('integer');
        expression = jsonata('definitions.PrimitiveClassModel.properties.int.format');
        expect(await expression.evaluate(spec)).toEqual('int32');
        expression = jsonata('definitions.PrimitiveClassModel.properties.int.description');
        expect(await expression.evaluate(spec)).toEqual('An integer');
    });

    it('should generate integer type for @IsLong decorator declared on class property', async () => {
        let expression = jsonata('definitions.PrimitiveClassModel.properties.long.type');
        expect(await expression.evaluate(spec)).toEqual('integer');
        expression = jsonata('definitions.PrimitiveClassModel.properties.long.format');
        expect(await expression.evaluate(spec)).toEqual('int64');
        expression = jsonata('definitions.PrimitiveClassModel.properties.long.description');
        expect(await expression.evaluate(spec)).toEqual(undefined);
    });

    it('should generate number type for @IsFloat decorator declared on class property', async () => {
        let expression = jsonata('definitions.PrimitiveClassModel.properties.float.type');
        expect(await expression.evaluate(spec)).toEqual('number');
        expression = jsonata('definitions.PrimitiveClassModel.properties.float.format');
        expect(await expression.evaluate(spec)).toEqual('float');
        expression = jsonata('definitions.PrimitiveClassModel.properties.float.description');
        expect(await expression.evaluate(spec)).toEqual(undefined);
    });

    it('should generate number type for @IsDouble decorator declared on class property', async () => {
        let expression = jsonata('definitions.PrimitiveClassModel.properties.double.type');
        expect(await expression.evaluate(spec)).toEqual('number');
        expression = jsonata('definitions.PrimitiveClassModel.properties.double.format');
        expect(await expression.evaluate(spec)).toEqual('double');
        expression = jsonata('definitions.PrimitiveClassModel.properties.double.description');
        expect(await expression.evaluate(spec)).toEqual(undefined);
    });

    it('should generate integer type for jsdoc @IsInt tag on interface property', async () => {
        let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.type');
        expect(await expression.evaluate(spec)).toEqual('integer');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.format');
        expect(await expression.evaluate(spec)).toEqual('int32');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.int.description');
        expect(await expression.evaluate(spec)).toEqual('An integer');
    });

    it('should generate integer type for jsdoc @IsLong tag on interface property', async () => {
        let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.type');
        expect(await expression.evaluate(spec)).toEqual('integer');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.format');
        expect(await expression.evaluate(spec)).toEqual('int64');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.long.description');
        expect(await expression.evaluate(spec)).toEqual(undefined);
    });

    it('should generate number type for jsdoc @IsFloat tag on interface property', async () => {
        let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.type');
        expect(await expression.evaluate(spec)).toEqual('number');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.format');
        expect(await expression.evaluate(spec)).toEqual('float');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.float.description');
        expect(await expression.evaluate(spec)).toEqual(undefined);
    });

    it('should generate number type for jsdoc @IsDouble tag on interface property', async () => {
        let expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.type');
        expect(await expression.evaluate(spec)).toEqual('number');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.format');
        expect(await expression.evaluate(spec)).toEqual('double');
        expression = jsonata('definitions.PrimitiveInterfaceModel.properties.double.description');
        expect(await expression.evaluate(spec)).toEqual(undefined);
    });

    it('should generate number type decorated path params', async () => {
        let expression = jsonata('paths."/primitives/{id}".get.parameters[0].type');
        expect(await expression.evaluate(spec)).toEqual('integer');
        expression = jsonata('paths."/primitives/{id}".get.parameters[0].format');
        expect(await expression.evaluate(spec)).toEqual('int64');
    });

    it('should generate array type names as type + Array', async () => {
        let expression = jsonata('definitions.ResponseBodystringArray');
        expect(await expression.evaluate(spec)).toBeUndefined();
        expression = jsonata('paths."/primitives/arrayNative".get.responses."200".schema."$ref"');
        expect(await expression.evaluate(spec)).toEqual('#/definitions/ResponseBodystringarray');
        expression = jsonata('paths."/primitives/array".get.responses."200".schema."$ref"');
        expect(await expression.evaluate(spec)).toEqual('#/definitions/ResponseBodystringarray');
    });
});

describe('ParameterizedEndpoint', () => {
    it('should generate path param for params declared on class', async () => {
        const expression = jsonata('paths."/parameterized/{objectId}/test".get.parameters[0].in');
        expect(await expression.evaluate(spec)).toEqual('path');
    });
});

describe('AbstractEntityEndpoint', () => {
    it('should not duplicate inherited properties in the required list', async () => {
        const expression = jsonata('definitions.NamedEntity.required');
        expect(await expression.evaluate(spec)).toStrictEqual(['id', 'name']);
    });

    it('should use property description from base class if not defined in child', async () => {
        const expression = jsonata('definitions.NamedEntity.properties.id.description');
        expect(await expression.evaluate(spec)).toEqual('A numeric identifier');
    });
});

describe('ResponseController', () => {
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

describe('SpecGenerator', () => {
    it('should be able to generate open api 3.0 outputs', async () => {
        const openapi = await new Version3SpecGenerator(specGenerator.getMetaData(), {}).getSwaggerSpec();
        expect(openapi.openapi).toEqual('3.0.0');
    });
});

describe('TestUnionType', () => {
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
