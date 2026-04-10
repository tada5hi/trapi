/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ArrayType,
    BaseType,
    EnumType, 
    Extension,
    IntersectionType,
    Metadata,
    NestedObjectLiteralType,
    Parameter,
    ParameterSource, 
    PrimitiveType,
    RefAliasType, 
    RefEnumType,
    RefObjectType, 
    ReferenceType,
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
    isUnionType, 
    isVoidType,
} from '@trapi/metadata';

import path from 'node:path';
import fs from 'node:fs';
import { isObject } from 'smob';
import YAML from 'yamljs';
import { buildOptions } from '../config';
import { SwaggerError, SwaggerErrorCode } from '../error';
import type { Options, OptionsInput } from '../config';
import type { DocumentFormat } from '../constants';
import { DataFormatName, DataTypeName } from '../schema';
import { transformValueTo } from '../utils';

import type { DocumentFormatData } from '../types';
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
            return {} as Record<`${DocumentFormat}`, DocumentFormatData>;
        }

        if (typeof this.spec === 'undefined') {
            throw new SwaggerError({
                message: 'The spec has not been built yet.',
                code: SwaggerErrorCode.SPEC_NOT_BUILT,
            });
        }

        try {
            await fs.promises.access(this.config.outputDirectory, fs.constants.R_OK | fs.constants.O_DIRECTORY);
        } catch {
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

        for (const datum of data) {
            promises.push(fs.promises.writeFile(datum.path, datum.content, { encoding: 'utf-8' }));
        }

        await Promise.all(promises);

        const output = {} as Record<`${DocumentFormat}`, DocumentFormatData>;
        for (const datum of data) {
            output[datum.name as `${DocumentFormat}`] = datum;
        }

        return output;
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

    protected getSchemaForEnumType(enumType: EnumType): Schema {
        const type = this.decideEnumType(enumType.members);
        const nullable = !!enumType.members.includes(null);

        const schema = {
            type,
            enum: enumType.members.map((member) => transformValueTo(type, member)),
        } as Schema;

        this.applyNullable(schema, nullable);

        return schema;
    }

    protected abstract applyNullable(schema: Schema, nullable: boolean): void;

    private getSchemaForPrimitiveType(type: PrimitiveType): BaseSchema<Schema> {
        const PrimitiveSwaggerTypeMap: Partial<Record<TypeName, BaseSchema<Schema>>> = {
            [TypeName.ANY]: { additionalProperties: true },
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

    protected getSchemaForReferenceType(referenceType: ReferenceType): Schema {
        return { $ref: `${this.getRefPrefix()}${referenceType.refName}` } as Schema;
    }

    protected abstract getRefPrefix(): string;

    protected abstract getSchemaForUnionType(type: UnionType) : Schema;

    // ----------------------------------------------------------------

    protected buildSchemaForRefAlias(referenceType: RefAliasType): Schema {
        const swaggerType = this.getSchemaForType(referenceType.type);
        const format = referenceType.format as DataFormatName;

        return {
            ...(swaggerType as Schema),
            default: referenceType.default ?? swaggerType.default,
            example: referenceType.example ?? swaggerType.example,
            format: format ?? swaggerType.format,
            description: referenceType.description ?? swaggerType.description,
            ...this.transformValidators(referenceType.validators),
        };
    }

    protected buildSchemaForRefEnum(referenceType: RefEnumType): Schema {
        const output = {
            ...this.getSchemaForEnumType({
                typeName: TypeName.ENUM,
                members: referenceType.members,
            }),
            description: referenceType.description,
        } as Schema;

        if (
            typeof referenceType.memberNames !== 'undefined' &&
            referenceType.members.length === referenceType.memberNames.length
        ) {
            (output as any)['x-enum-varnames'] = referenceType.memberNames;
        }

        return output;
    }

    protected buildSchemasForReferenceTypes(extendFn?: (output: Schema, input: ReferenceType) => void) : Record<string, Schema> {
        const output: Record<string, Schema> = {};

        const keys = Object.keys(this.metadata.referenceTypes);
        for (const key of keys) {
            const referenceType = this.metadata.referenceTypes[key];

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

    protected buildProperties(properties: ResolverProperty[]): Record<string, Schema> {
        const output: Record<string, Schema> = {};

        properties.forEach((property) => {
            const swaggerType = this.getSchemaForType(property.type) as Schema;

            if (swaggerType.$ref && this.shouldStripRefSiblings()) {
                output[property.name] = { $ref: swaggerType.$ref } as Schema;
                return;
            }

            swaggerType.description = property.description;
            swaggerType.example = property.example;
            swaggerType.format = property.format as DataFormatName || swaggerType.format;
            this.assignPropertyDefaults(swaggerType, property);

            if (property.deprecated) {
                this.markPropertyDeprecated(swaggerType);
            }

            const extensions = this.transformExtensions(property.extensions);
            const validators = this.transformValidators(property.validators);
            output[property.name] = {
                ...swaggerType,
                ...validators,
                ...extensions,
            };
        });

        return output;
    }

    protected abstract markPropertyDeprecated(schema: Schema): void;

    protected shouldStripRefSiblings(): boolean {
        // V2 (Swagger 2.0) and V3 (3.0): $ref must be the only key.
        // V3 (3.1+): $ref siblings are allowed. Override to return false.
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected assignPropertyDefaults(schema: Schema, property: ResolverProperty): void {
        // No-op by default. V3 overrides to set schema.default = property.default.
    }

    protected buildSchemaForRefObject(referenceType: RefObjectType): Schema {
        const required = referenceType.properties
            .filter((p) => p.required && !this.isUndefinedProperty(p))
            .map((p) => p.name);

        const output = {
            description: referenceType.description,
            properties: this.buildProperties(referenceType.properties),
            required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
            type: DataTypeName.OBJECT,
        } as unknown as Schema;

        if (referenceType.additionalProperties) {
            (output as any).additionalProperties = this.resolveAdditionalProperties(referenceType.additionalProperties);
        }

        if (referenceType.example !== undefined) {
            output.example = referenceType.example;
        }

        return output;
    }

    protected abstract resolveAdditionalProperties(type: BaseType): Schema | boolean;

    protected determineTypesUsedInEnum(anEnum: Array<string | number | boolean | null>) : VariableType[] {
        const set = new Set<VariableType>();
        for (const element of anEnum) {
            if (element === null) {
                continue;
            }

            set.add(typeof element);
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

            throw new SwaggerError({
                message: `Enum contains unsupported type '${types[0] || 'unknown'}'. Only string, number, and boolean values are allowed.`,
                code: SwaggerErrorCode.ENUM_UNSUPPORTED_TYPE,
            });
        }

        const unsupportedTypes = types.filter(
            (type) => type !== 'string' && type !== 'number' && type !== 'boolean',
        );
        if (unsupportedTypes.length > 0) {
            throw new SwaggerError({
                message: `Enum contains unsupported types: ${unsupportedTypes.join(', ')}. Only string, number, and boolean values are allowed.`,
                code: SwaggerErrorCode.ENUM_UNSUPPORTED_TYPE,
            });
        }

        return 'string';
    }

    protected getOperationId(name: string) {
        return name.charAt(0).toUpperCase() + name.substring(1);
    }

    protected groupParameters(items: Parameter[]) : Partial<Record<ParameterSource, Parameter[]>> {
        const output : Partial<Record<ParameterSource, Parameter[]>> = {};

        for (const item of items) {
            if (typeof output[item.in] === 'undefined') {
                output[item.in] = [];
            }

            output[item.in].push(item);
        }

        return output;
    }

    protected transformExtensions(input?: Extension[]) : Record<string, any> {
        if (!input) {
            return {};
        }

        const output : Record<string, any> = {};
        for (const extension of input) {
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
        for (const key of keys) {
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
