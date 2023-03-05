/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load } from 'locter';
import jsonata from 'jsonata';
import type { MetadataGeneratorOutput, SpecificationV2, SpecificationV3 } from '../../../src';
import { createSpecificationGenerator } from '../../../src';

describe('PrimitiveEndpoint', () => {
    let spec : SpecificationV2.Spec | SpecificationV3.Spec;

    beforeAll(async () => {
        const metadata : MetadataGeneratorOutput = await load('./test/data/metadata.json');

        const specGenerator = await createSpecificationGenerator(metadata, {
            host: 'http://localhost:3000/',
        });

        spec = await specGenerator.getSwaggerSpec();
    });

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
