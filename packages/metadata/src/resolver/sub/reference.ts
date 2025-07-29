/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EnumDeclaration, EnumMember, TypeChecker } from 'typescript';
import { JSDocTagName, hasJSDocTag } from '../../utils';
import { TypeName } from '../constants';
import { ResolverError } from '../error';
import type {
    RefEnumType, RefObjectType, ReferenceType, Type,
} from '../type';
import { getNodeDescription } from '../utils';
import { ResolverBase } from './base';

export class ReferenceResolver extends ResolverBase {
    protected typeChecker : TypeChecker;

    constructor(typeChecker: TypeChecker) {
        super();

        this.typeChecker = typeChecker;
    }

    public merge(referenceTypes: ReferenceType[]): ReferenceType {
        if (referenceTypes.length === 1) {
            return referenceTypes[0];
        }

        if (referenceTypes.every((refType) => refType.refName === TypeName.REF_ENUM)) {
            return this.mergeManyRefEnums(referenceTypes as RefEnumType[]);
        }

        if (referenceTypes.every((refType) => refType.refName === TypeName.REF_OBJECT)) {
            return this.mergeManyRefObjects(referenceTypes as RefObjectType[]);
        }

        throw new ResolverError(
            `These resolved type merge rules are not defined: ${JSON.stringify(referenceTypes)}`,
        );
    }

    public mergeManyRefEnums(many: RefEnumType[]): RefEnumType {
        let merged = this.mergeRefEnums(many[0], many[1]);
        for (let i = 2; i < many.length; ++i) {
            merged = this.mergeRefEnums(merged, many[i]);
        }

        return merged;
    }

    public mergeRefEnums(first: RefEnumType, second: RefEnumType): RefEnumType {
        let description : string | undefined;
        if (first.description || second.description) {
            if (!first.description) {
                description = second.description;
            } else if (!second.description) {
                description = first.description;
            } else {
                description = `${first.description}\n${second.description}`;
            }
        }

        return {
            typeName: TypeName.REF_ENUM,
            example: first.example || second.example,
            description,
            members: [
                ...(first.members || []),
                ...(second.members || []),
            ],
            memberNames: [
                ...(first.memberNames || []),
                ...(second.memberNames || []),
            ],
            refName: first.refName,
            deprecated: first.deprecated || second.deprecated,
        };
    }

    public mergeManyRefObjects(many: RefObjectType[]) {
        let merged = this.mergeRefObject(many[0], many[1]);
        for (let i = 2; i < many.length; ++i) {
            merged = this.mergeRefObject(merged, many[i]);
        }
        return merged;
    }

    public mergeRefObject(first: RefObjectType, second: RefObjectType) : RefObjectType {
        let description : string | undefined;
        if (first.description || second.description) {
            if (!first.description) {
                description = second.description;
            } else if (!second.description) {
                description = first.description;
            } else {
                description = `${first.description}\n${second.description}`;
            }
        }

        const properties = [
            ...first.properties,
            ...second.properties.filter((prop) => first.properties.every((firstProp) => firstProp.name !== prop.name)),
        ];

        let additionalProperties : Type | undefined;
        if (first.additionalProperties || second.additionalProperties) {
            if (!first.additionalProperties) {
                additionalProperties = second.additionalProperties;
            } else if (!second.additionalProperties) {
                additionalProperties = first.additionalProperties;
            } else {
                additionalProperties = {
                    typeName: TypeName.UNION,
                    members: [first.additionalProperties, second.additionalProperties],
                };
            }
        }

        return {
            typeName: TypeName.REF_OBJECT,
            description,
            properties,
            additionalProperties,
            refName: first.refName,
            deprecated: first.deprecated || second.deprecated,
            example: first.example || second.example,
        };
    }

    transformEnum(declaration: EnumDeclaration, enumName: string) : RefEnumType {
        const isNotUndefined = <T>(item: T): item is Exclude<T, undefined> => item !== undefined;

        const enums = declaration.members.map(this.typeChecker.getConstantValue.bind(this.typeChecker)).filter(isNotUndefined);
        const enumNames = declaration.members.map((e) => e.name.getText()).filter(isNotUndefined);

        return {
            typeName: TypeName.REF_ENUM,
            description: getNodeDescription(declaration, this.typeChecker),
            members: enums as string[],
            memberNames: enumNames,
            refName: enumName,
            deprecated: hasJSDocTag(declaration, JSDocTagName.DEPRECATED),
        };
    }

    transformEnumMember(declaration: EnumMember, enumName: string) : RefEnumType {
        return {
            typeName: TypeName.REF_ENUM,
            refName: enumName,
            members: [this.typeChecker.getConstantValue(declaration)!],
            memberNames: [declaration.name.getText()],
            deprecated: hasJSDocTag(declaration, JSDocTagName.DEPRECATED),
        };
    }
}
