/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ArrayType,
    BaseType,
    EnumType, Extension,
    IntersectionType,
    Metadata,
    NestedObjectLiteralType,
    Parameter,
    ParameterSource, PrimitiveType,
    RefAliasType, RefEnumType,
    RefObjectType, ReferenceType,
    ResolverProperty,
    UnionType,
    Validators,
    VariableType,
} from '@trapi/metadata';
import {
    TypeName,
    ValidatorName,
    isArrayType,
    isEnumType,
    isIntersectionType,
    isNestedObjectLiteralType,
    isPrimitiveType,
    isReferenceType,
    isUndefinedType,
    isUnionType, isVoidType,
} from '@trapi/metadata';

import path from 'node:path';
import fs from 'node:fs';
import { isObject } from 'smob';
import YAML from 'yamljs';
import { buildOptions } from '../config';
import type { Options, OptionsInput } from '../config';
import type { DocumentFormat } from '../constants';
import { DataFormatName, DataTypeName } from '../schema';

import type { DocumentFormatData } from '../type';
import type {
    BaseSchema,
    Info,
    SchemaV2,
    SchemaV3,
    SpecV2,
    SpecV3,
} from '../schema';

export abstract class AbstractSpecGenerator<Spec extends SpecV2 | SpecV3, Schema extends SchemaV3 | SchemaV2> {
    protected spec: Spec | undefined;

    protected readonly metadata: Metadata;

    protected readonly config: Options;

    constructor(metadata: Metadata, config: OptionsInput) {
        this.metadata = metadata;
        this.config = buildOptions(config);
    }

    async save(): Promise<Record<`${DocumentFormat}`, DocumentFormatData>> {
        if (!this.config.output) {
            return;
        }

        if (typeof this.spec === 'undefined') {
            throw new Error('The spec has not been build yet...');
        }

        try {
            await fs.promises.access(this.config.outputDirectory, fs.constants.R_OK | fs.constants.O_DIRECTORY);
        } catch (e) {
            await fs.promises.mkdir(this.config.outputDirectory, { recursive: true });
        }

        const data : DocumentFormatData[] = [
            {
                path: path.join(this.config.outputDirectory, `${this.config.outputFileName}.json`),
                name: `${this.config.outputFileName}.json`,
                content: JSON.stringify(this.spec, null, 4),
            },
        ];

        if (this.config.yaml) {
            data.push({
                path: path.join(this.config.outputDirectory, `${this.config.outputFileName}.yaml`),
                name: `${this.config.outputFileName}.yaml`,
                content: YAML.stringify(this.spec, 1000),
            });
        }

        const promises: Promise<void>[] = [];

        for (let i = 0; i < data.length; i++) {
            promises.push(fs.promises.writeFile(data[i].path, data[i].content, { encoding: 'utf-8' }));
        }

        await Promise.all(promises);
    }

    public abstract build(): Promise<Spec>;

    protected buildInfo() {
        const info: Info = {
            title: this.config.name || 'Documentation',
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

    protected getSchemaForType(type: BaseType): Schema | BaseSchema<Schema> {
        if (isVoidType(type) || isUndefinedType(type)) {
            return {} as Schema;
        } if (isReferenceType(type)) {
            return this.getSchemaForReferenceType(type);
        } if (isPrimitiveType(type)) {
            return this.getSchemaForPrimitiveType(type);
        } if (isArrayType(type)) {
            return this.getSchemaForArrayType(type);
        } if (isEnumType(type)) {
            return this.getSchemaForEnumType(type);
        } if (isUnionType(type)) {
            return this.getSchemaForUnionType(type);
        } if (isIntersectionType(type)) {
            return this.getSchemaForIntersectionType(type);
        } if (isNestedObjectLiteralType(type)) {
            return this.getSchemaForObjectLiteralType(type);
        }

        return {} as Schema;
    }

    protected abstract getSchemaForIntersectionType(type: IntersectionType): Schema;

    protected abstract getSchemaForEnumType(enumType: EnumType): Schema;

    private getSchemaForPrimitiveType(type: PrimitiveType): BaseSchema<Schema> {
        const PrimitiveSwaggerTypeMap: Partial<Record<TypeName, BaseSchema<Schema>>> = {
            [TypeName.ANY]: {
                additionalProperties: true,
            },
            [TypeName.BINARY]: { type: DataTypeName.STRING, format: DataFormatName.BINARY },
            [TypeName.BOOLEAN]: { type: DataTypeName.BOOLEAN },
            [TypeName.BUFFER]: { type: DataTypeName.STRING, format: DataFormatName.BYTE },
            [TypeName.BYTE]: { type: DataTypeName.STRING, format: DataFormatName.BYTE },
            [TypeName.DATE]: { type: DataTypeName.STRING, format: DataFormatName.DATE },
            [TypeName.DATETIME]: { type: DataTypeName.STRING, format: DataFormatName.DATE_TIME },
            [TypeName.DOUBLE]: { type: DataTypeName.NUMBER, format: DataFormatName.DOUBLE },
            [TypeName.FILE]: { type: DataTypeName.STRING, format: DataFormatName.BINARY },
            [TypeName.FLOAT]: { type: DataTypeName.NUMBER, format: DataFormatName.FLOAT },
            [TypeName.BIGINT]: { type: DataTypeName.INTEGER },
            [TypeName.INTEGER]: { type: DataTypeName.INTEGER, format: DataFormatName.INT_32 },
            [TypeName.LONG]: { type: DataTypeName.INTEGER, format: DataFormatName.INT_64 },
            [TypeName.OBJECT]: {
                type: DataTypeName.OBJECT,
                additionalProperties: true,
            },
            [TypeName.STRING]: { type: DataTypeName.STRING },
            [TypeName.UNDEFINED]: {},
        };

        return PrimitiveSwaggerTypeMap[type.typeName] || { type: DataTypeName.OBJECT };
    }

    private getSchemaForArrayType(arrayType: ArrayType): BaseSchema<Schema> {
        return {
            type: DataTypeName.ARRAY,
            items: this.getSchemaForType(arrayType.elementType),
        };
    }

    public getSchemaForObjectLiteralType(objectLiteral: NestedObjectLiteralType): BaseSchema<Schema> {
        const properties = this.buildProperties(objectLiteral.properties);

        const additionalProperties = objectLiteral.additionalProperties &&
            this.getSchemaForType(objectLiteral.additionalProperties);

        const required = objectLiteral.properties
            .filter((prop: ResolverProperty) => prop.required && !this.isUndefinedProperty(prop))
            .map((prop: ResolverProperty) => prop.name);

        // An empty list required: [] is not valid.
        // If all properties are optional, do not specify the required keyword.
        return {
            properties,
            ...(additionalProperties && { additionalProperties }),
            ...(required && required.length && { required }),
            type: DataTypeName.OBJECT,
        } as BaseSchema<Schema>;
    }

    protected abstract getSchemaForReferenceType(referenceType: ReferenceType): Schema;

    protected abstract getSchemaForUnionType(type: UnionType) : Schema;

    // ----------------------------------------------------------------

    protected abstract buildSchemaForRefAlias(referenceType: RefAliasType) : Schema;

    protected abstract buildSchemaForRefEnum(referenceType: RefEnumType) : Schema;

    protected abstract buildSchemaForRefObject(referenceType: RefObjectType) : Schema;

    protected buildSchemasForReferenceTypes(extendFn?: (output: Schema, input: ReferenceType) => void) : Record<string, Schema> {
        const output: Record<string, Schema> = {};

        const keys = Object.keys(this.metadata.referenceTypes);
        for (let i = 0; i < keys.length; i++) {
            const referenceType = this.metadata.referenceTypes[keys[i]];

            switch (referenceType.typeName) {
                case TypeName.REF_ALIAS: {
                    output[referenceType.refName] = this.buildSchemaForRefAlias(referenceType);
                    break;
                }
                case TypeName.REF_ENUM: {
                    output[referenceType.refName] = this.buildSchemaForRefEnum(referenceType);
                    break;
                }
                case TypeName.REF_OBJECT: {
                    output[referenceType.refName] = this.buildSchemaForRefObject(referenceType);
                    break;
                }
            }

            if (typeof extendFn === 'function') {
                extendFn(output[referenceType.refName], referenceType);
            }
        }

        return output;
    }

    // ----------------------------------------------------------------

    protected isUndefinedProperty(input: ResolverProperty) {
        return isUndefinedType(input.type) ||
            (isUnionType(input.type) && input.type.members.some((el) => isUndefinedType(el)));
    }

    protected abstract buildProperties(properties: ResolverProperty[]): Record<string, Schema>;

    protected determineTypesUsedInEnum(anEnum: Array<string | number | boolean | null>) : VariableType[] {
        const set = new Set<VariableType>();
        for (let i = 0; i < anEnum.length; i++) {
            if (anEnum[i] === null) {
                continue;
            }

            set.add(typeof anEnum[i]);
        }

        return Array.from(set);
    }

    protected decideEnumType(
        input: Array<string | number | boolean>,
    ): 'string' | 'number' | 'boolean' {
        const types = this.determineTypesUsedInEnum(input);

        if (types.length === 1) {
            const value = types[0];
            if (
                value === 'string' ||
                value === 'number' ||
                value === 'boolean'
            ) {
                return value;
            }

            throw new Error(`Enums can only have string or number values, but type "${types[0] || 'unknown'}" given.`);
        }

        for (let i = 0; i < types.length; i++) {
            const type = types[i];

            if (
                type !== 'string' &&
                type !== 'number' &&
                type !== 'boolean'
            ) {
                const values = types.join(',');
                throw new Error(`Enums can only have string or number values, but types ${values} given.`);
            }
        }

        return 'string';
    }

    protected getOperationId(name: string) {
        return name.charAt(0).toUpperCase() + name.substring(1);
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

    protected transformExtensions(input?: Extension[]) : Record<string, any> {
        if (!input) {
            return {};
        }

        const output : Record<string, any> = {};
        for (let i = 0; i < input.length; i++) {
            const extension = input[i];
            if (!extension.key.startsWith('x-')) {
                extension.key = `x-${extension.key}`;
            }

            output[extension.key] = extension.value;
        }

        return output;
    }

    protected transformValidators(input?: Validators) : Record<string, any> {
        if (!isObject(input)) {
            return {};
        }

        const keys = Object.keys(input);
        const output : Record<string, any> = {};
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (
                key.startsWith('is') ||
                key === ValidatorName.MIN_DATE ||
                key === ValidatorName.MAX_DATE
            ) {
                continue;
            }

            output[key] = input[key].value;
        }

        return output;
    }
}
