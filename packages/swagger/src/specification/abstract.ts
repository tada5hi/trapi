/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ArrayType,
    BaseType,
    EnumType,
    IntersectionType,
    Metadata,
    NestedObjectLiteralType,
    Parameter,
    ParameterSource,
    PrimitiveTypeLiteral,
    ReferenceType,
    ResolverProperty, TypeVariant,

    UnionType,
} from '@trapi/metadata';
import {
    isAnyType,
    isArrayType,
    isEnumType,
    isIntersectionType,
    isNestedObjectLiteralType,
    isReferenceType,
    isUnionType,

    isVoidType,
} from '@trapi/metadata';

import path from 'node:path';
import fs from 'node:fs';
import YAML from 'yamljs';
import type { Options } from '../config';
import type { DocumentFormat } from '../constants';
import { hasOwnProperty } from '../utils';

import type { DocumentFormatData } from '../type';
import type {
    BaseSchema, Info,
} from './type';
import type { SchemaV2, SpecV2 } from './v2';
import type { SchemaV3, SpecV3 } from './v3';

export abstract class AbstractSpecGenerator<Spec extends SpecV2 | SpecV3, Schema extends SchemaV3 | SchemaV2> {
    protected spec: Spec;

    protected readonly metadata: Metadata;

    protected readonly config: Options;

    constructor(metadata: Metadata, config: Options) {
        this.metadata = metadata;
        this.config = config;
    }

    public async save(): Promise<Record<`${DocumentFormat}`, DocumentFormatData>> {
        const spec = this.build();
        const swaggerDir: string = path.resolve(this.config.outputDirectory);

        await fs.promises.mkdir(swaggerDir, { recursive: true });

        const data: Record<`${DocumentFormat}`, DocumentFormatData> = {
            json: {
                path: path.join(swaggerDir, 'swagger.json'),
                name: 'swagger.json',
                content: JSON.stringify(spec, null, '\t'),
            },
            yaml: undefined,
        };

        if (this.config.yaml) {
            data.yaml = {
                path: path.join(swaggerDir, 'swagger.yaml'),
                name: 'swagger.yaml',
                content: YAML.stringify(spec, 1000),
            };
        }

        const filePromises: Array<Promise<void>> = [];

        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            if (typeof data[keys[i]] === 'undefined') {
                continue;
            }

            const output = data[keys[i]];

            filePromises.push(fs.promises.writeFile(output.path, output.content));
        }

        await Promise.all(filePromises);

        return data;
    }

    public getMetaData() {
        return this.metadata;
    }

    public abstract getSwaggerSpec(): Spec;

    public abstract build(): Spec;

    protected buildInfo() {
        const info: Info = {
            title: this.config.name || '',
            version: this.config.version || '1.0.0',
        };

        if (this.config.description) {
            info.description = this.config.description;
        }

        if (this.config.license) {
            info.license = { name: this.config.license };
        }

        return info;
    }

    protected getSwaggerType(type: BaseType): Schema | BaseSchema<Schema> {
        if (isVoidType(type)) {
            return {} as Schema;
        } if (isReferenceType(type)) {
            return this.getSwaggerTypeForReferenceType(type);
        } if (
            type.typeName === 'any' ||
            type.typeName === 'binary' ||
            type.typeName === 'boolean' ||
            type.typeName === 'buffer' ||
            type.typeName === 'byte' ||
            type.typeName === 'date' ||
            type.typeName === 'datetime' ||
            type.typeName === 'double' ||
            type.typeName === 'float' ||
            type.typeName === 'file' ||
            type.typeName === 'integer' ||
            type.typeName === 'long' ||
            type.typeName === 'object' ||
            type.typeName === 'string'
        ) {
            return this.getSwaggerTypeForPrimitiveType(type.typeName);
        } if (isArrayType(type)) {
            return this.getSwaggerTypeForArrayType(type);
        } if (isEnumType(type)) {
            return this.getSwaggerTypeForEnumType(type);
        } if (isUnionType(type)) {
            return this.getSwaggerTypeForUnionType(type);
        } if (isIntersectionType(type)) {
            return this.getSwaggerTypeForIntersectionType(type);
        } if (isNestedObjectLiteralType(type)) {
            return this.getSwaggerTypeForObjectLiteral(type);
        }

        return {} as Schema;
    }

    protected abstract getSwaggerTypeForIntersectionType(type: IntersectionType): Schema;

    protected abstract getSwaggerTypeForEnumType(enumType: EnumType): Schema;

    protected getSwaggerTypeForUnionType(type: UnionType): Schema | BaseSchema<Schema> {
        if (type.members.every((subType: TypeVariant) => subType.typeName === 'enum')) {
            const mergedEnum: EnumType = { typeName: 'enum', members: [] };
            type.members.forEach((t: TypeVariant) => {
                mergedEnum.members = [...mergedEnum.members, ...(t as EnumType).members];
            });
            return this.getSwaggerTypeForEnumType(mergedEnum);
        } if (type.members.length === 2 && type.members.find((typeInUnion: TypeVariant) => typeInUnion.typeName === 'enum' && typeInUnion.members.includes(null))) {
            // Backwards compatible representation of dataType or null, $ref does not allow any sibling attributes, so we have to bail out
            const nullEnumIndex = type.members.findIndex((a: TypeVariant) => isEnumType(a) && a.members.includes(null));
            const typeIndex = nullEnumIndex === 1 ? 0 : 1;
            const swaggerType = this.getSwaggerType(type.members[typeIndex]);
            const isRef = hasOwnProperty(swaggerType, '$ref') && !!swaggerType.$ref;

            if (isRef) {
                return { type: 'object' } as Schema;
            }

            swaggerType['x-nullable'] = true;

            return swaggerType;
        }

        if (type.members.length === 2) {
            let index = type.members.findIndex((member: TypeVariant) => isArrayType(member));
            if (index !== -1) {
                const otherIndex = index === 0 ? 1 : 0;

                if ((type.members[index] as ArrayType).elementType.typeName === type.members[otherIndex].typeName) {
                    return this.getSwaggerType(type.members[otherIndex]);
                }
            }

            index = type.members.findIndex((member: TypeVariant) => isAnyType(member));
            if (index !== -1) {
                const otherIndex = index === 0 ? 1 : 0;

                if (isAnyType(type.members[index])) {
                    return this.getSwaggerType(type.members[otherIndex]);
                }
            }
        }

        return { type: 'object' } as Schema;
    }

    private getSwaggerTypeForPrimitiveType(type: PrimitiveTypeLiteral): BaseSchema<Schema> {
        const PrimitiveSwaggerTypeMap: Record<PrimitiveTypeLiteral, BaseSchema<Schema>> = {
            any: {
                // While the any type is discouraged, it does explicitly allows anything, so it should always allow additionalProperties
                additionalProperties: true,
            },
            binary: { type: 'string', format: 'binary' },
            boolean: { type: 'boolean' },
            buffer: { type: 'string', format: 'byte' },
            byte: { type: 'string', format: 'byte' },
            date: { type: 'string', format: 'date' },
            datetime: { type: 'string', format: 'date-time' },
            double: { type: 'number', format: 'double' },
            file: { type: 'string', format: 'binary' },
            float: { type: 'number', format: 'float' },
            integer: { type: 'integer', format: 'int32' },
            long: { type: 'integer', format: 'int64' },
            object: { type: 'object' },
            string: { type: 'string' },
        };

        return PrimitiveSwaggerTypeMap[type];
    }

    private getSwaggerTypeForArrayType(arrayType: ArrayType): BaseSchema<Schema> {
        return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
    }

    public getSwaggerTypeForObjectLiteral(objectLiteral: NestedObjectLiteralType): BaseSchema<Schema> {
        const properties = this.buildProperties(objectLiteral.properties);

        const additionalProperties = objectLiteral.additionalProperties && this.getSwaggerType(objectLiteral.additionalProperties);

        const required = objectLiteral.properties
            .filter((prop: ResolverProperty) => prop.required).map((prop: ResolverProperty) => prop.name);

        // An empty list required: [] is not valid.
        // If all properties are optional, do not specify the required keyword.
        return {
            properties,
            ...(additionalProperties && { additionalProperties }),
            ...(required && required.length && { required }),
            type: 'object',
        } as BaseSchema<Schema>;
    }

    protected abstract getSwaggerTypeForReferenceType(referenceType: ReferenceType): Schema;

    protected abstract buildProperties(properties: ResolverProperty[]): Record<string, Schema>;

    protected determineTypesUsedInEnum(anEnum: Array<string | number | boolean | null>) {
        return anEnum.reduce((theSet, curr) => {
            if (curr !== null) {
                theSet.add(typeof curr);
            }
            return theSet;
        }, new Set<'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'>());
    }

    protected getOperationId(methodName: string) {
        return methodName.charAt(0).toUpperCase() + methodName.substring(1);
    }

    protected groupParameters(items: Parameter[]) : Partial<Record<ParameterSource, Parameter[]>> {
        const output : Partial<Record<ParameterSource, Parameter[]>> = {};

        for (let i = 0; i < items.length; i++) {
            if (typeof output[items[i].in] === 'undefined') {
                output[items[i].in] = [];
            }

            output[items[i].in].push(items[i]);
        }

        return output;
    }
}
