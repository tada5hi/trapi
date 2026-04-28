/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import * as ts from 'typescript';
import {
    type ApplyHandlersOptions,
    ParamKind,
    type ParameterDraft,
    applyDecoratorHandlers,
    applyJsDocHandlers,
    newParameterDraft,
} from '../../../adapters/decorator';
import { getInitializerValue } from '../../../adapters/typescript/initializer';
import { getDeclarationValidators } from '../../../adapters/typescript/validator';
import {
    JSDocTagName,
    getJSDocTags,
    hasJSDocTag,
    transformJSDocComment,
} from '../../../adapters/typescript/js-doc';
import { TypeNodeResolver } from '../../../adapters/typescript/resolver';
import {
    isArrayType,
    isNestedObjectLiteralType,
    isRefEnumType,
    isRefObjectType,
    isUnionType,
} from '../../../core/types/type-guards';
import { TypeName } from '../../../core/types/type-name';
import {
    CollectionFormat,
    ParameterSource,
} from '../../../core/types/parameter-source';
import { ParameterError } from '../../../core/error/parameter';
import type { IGeneratorContext } from '../../../core/types/metadata';
import type {
    BaseType,
    NestedObjectLiteralType,
    RefObjectType,
    Type,
} from '../../../core/types/resolver';
import type { Extension } from '../../../core/types/extension';
import type { ArrayParameter, IParameterGenerator, Parameter } from '../../../core/types/parameter';

const BODY_SUPPORTED_METHODS = new Set(['delete', 'post', 'put', 'patch', 'get']);

const SUPPORTED_LEAF_TYPES = new Set<string>([
    TypeName.STRING,
    TypeName.INTEGER,
    TypeName.LONG,
    TypeName.FLOAT,
    TypeName.DOUBLE,
    TypeName.DATE,
    TypeName.DATETIME,
    TypeName.BUFFER,
    TypeName.BOOLEAN,
    TypeName.ENUM,
]);

export class ParameterGenerator implements IParameterGenerator {
    private readonly parameter: ts.ParameterDeclaration;

    private readonly method: string;

    private readonly paths: string[];

    private readonly current: IGeneratorContext;

    constructor(
        parameter: ts.ParameterDeclaration,
        method: string,
        paths: string[],
        current: IGeneratorContext,
    ) {
        this.parameter = parameter;
        this.method = method;
        this.paths = paths.length === 0 ? [''] : paths;
        this.current = current;
    }

    public generate(): Parameter[] {
        const parameterName = this.getParameterName();
        const draft = newParameterDraft({ parameterName });

        const options = this.applyOptions(parameterName);
        applyDecoratorHandlers(this.parameter, this.current.registry.parameters, draft, options);
        applyJsDocHandlers(this.parameter, this.current.registry.parameterJsDoc, draft, options);

        // TS-resolved type
        const type = this.resolveType();
        draft.type = type;

        // Description from TS symbol's documentation comment.
        const description = this.getDescription();
        if (description) {
            draft.description = description;
        }

        // Deprecation: handler may have set it; otherwise check JSDoc on parameter.
        if (draft.deprecated === undefined && hasJSDocTag(this.parameter, JSDocTagName.DEPRECATED)) {
            draft.deprecated = true;
        }

        // Default value from TS initializer.
        const defaultValue = getInitializerValue(this.parameter.initializer, this.current.typeChecker, type);
        if (defaultValue !== undefined) {
            draft.default = defaultValue;
        }

        // Required: TS optionality and presence of initializer.
        draft.required = !this.parameter.questionToken && !this.parameter.initializer;

        // Examples from method-level JSDoc @example tags scoped to this parameter.
        const { examples, exampleLabels } = this.getJsDocExamples(parameterName);
        if (examples) {
            draft.examples = examples.map((value) => ({ value }));
            draft.exampleLabels = (exampleLabels ?? []).filter((l): l is string => l !== undefined);
        }

        // Declaration-level validators (e.g., @MaxLength annotations on the parameter).
        Object.assign(draft.validators, getDeclarationValidators(this.parameter, parameterName));

        // Apply default `in` if no handler claimed.
        if (!draft.in) {
            if (!BODY_SUPPORTED_METHODS.has(this.method)) {
                throw ParameterError.methodUnsupported({
                    decoratorName: 'Body',
                    propertyName: parameterName,
                    method: this.method,
                    node: this.parameter,
                });
            }
            draft.in = ParamKind.Body;
        }

        // Body validation requires the method to support a body.
        if ((draft.in === ParamKind.Body || draft.in === ParamKind.BodyProp) &&
            !BODY_SUPPORTED_METHODS.has(this.method)) {
            throw ParameterError.methodUnsupported({
                decoratorName: 'Body',
                propertyName: draft.name,
                method: this.method,
                node: this.parameter,
            });
        }

        return this.finalize(draft, type, parameterName, examples, exampleLabels);
    }

    private finalize(
        draft: ParameterDraft,
        type: Type,
        parameterName: string,
        examples: unknown[] | undefined,
        exampleLabels: Array<string | undefined> | undefined,
    ): Parameter[] {
        const kind = draft.in!;
        const wrappedExamples = examples ? examples.map((value) => ({ value })) : undefined;
        const filteredLabels = exampleLabels?.filter((l): l is string => l !== undefined);

        // Object decomposition for kinds that can carry an object payload.
        if ((kind === ParameterSource.QUERY || kind === ParameterSource.PATH) &&
            (isNestedObjectLiteralType(type) || isRefObjectType(type))) {
            const decomposed = this.decomposeObject(type, {
                in: kind === ParameterSource.QUERY ? ParameterSource.QUERY_PROP : ParameterSource.PATH,
                examples: wrappedExamples,
                exampleLabels: filteredLabels,
                extensions: draft.extensions,
            });
            if (kind === ParameterSource.PATH) {
                this.validatePathDecomposition(decomposed);
            }
            return decomposed;
        }

        if ((kind === ParameterSource.QUERY || kind === ParameterSource.QUERY_PROP) &&
            isArrayType(type)) {
            if (!this.isLeafTypeSupported(type.elementType)) {
                throw ParameterError.typeUnsupported({
                    decoratorName: kind === ParameterSource.QUERY ? 'Query' : 'QueryProp',
                    propertyName: draft.name,
                    type: type.elementType,
                    node: this.parameter,
                });
            }
            const arrayParameter: ArrayParameter = {
                ...this.draftToParameter(draft),
                collectionFormat: draft.collectionFormat ?? CollectionFormat.MULTI,
                type,
            };
            return [arrayParameter];
        }

        if ((kind === ParameterSource.QUERY || kind === ParameterSource.QUERY_PROP) &&
            !this.isLeafOrEnumOrUnion(type)) {
            throw ParameterError.typeUnsupported({
                decoratorName: kind === ParameterSource.QUERY ? 'Query' : 'QueryProp',
                propertyName: draft.name,
                type,
                node: this.parameter,
            });
        }

        if (kind === ParameterSource.PATH) {
            this.validatePathName(draft.name, parameterName);
        }

        return [this.draftToParameter(draft)];
    }

    private draftToParameter(draft: ParameterDraft): Parameter {
        return {
            allowEmptyValue: draft.allowEmptyValue,
            collectionFormat: draft.collectionFormat,
            default: draft.default,
            description: draft.description,
            examples: draft.examples.length > 0 ? draft.examples : undefined,
            exampleLabels: draft.exampleLabels.length > 0 ? draft.exampleLabels : undefined,
            extensions: draft.extensions,
            in: draft.in!,
            maxItems: draft.maxItems,
            minItems: draft.minItems,
            name: draft.name,
            parameterName: draft.parameterName,
            required: draft.required,
            type: draft.type!,
            deprecated: draft.deprecated,
            validators: draft.validators,
        };
    }

    private decomposeObject(
        type: NestedObjectLiteralType | RefObjectType,
        details: {
            in: `${ParameterSource}`;
            examples: { value: unknown }[] | undefined;
            exampleLabels: string[] | undefined;
            extensions: Extension[];
        },
    ): Parameter[] {
        if (type.properties.length === 0) {
            return [];
        }

        const parameterName = this.getParameterName();
        const initializerValue = getInitializerValue(this.parameter.initializer, this.current.typeChecker, type);
        const description = this.getDescription();
        const isParamOptional = !!this.parameter.questionToken;
        const isParamDeprecated = hasJSDocTag(this.parameter, JSDocTagName.DEPRECATED);

        const output: Parameter[] = [];
        for (const property of type.properties) {
            let propertyDefaultValue = property.default;
            if (typeof propertyDefaultValue === 'undefined' && isObject(initializerValue)) {
                propertyDefaultValue = (initializerValue as Record<string, unknown>)[property.name];
            }

            const required = isParamOptional ? false : property.required;

            output.push({
                extensions: [...details.extensions],
                in: details.in,
                examples: details.examples,
                exampleLabels: details.exampleLabels,
                default: propertyDefaultValue,
                description: property.description || description,
                name: property.name,
                parameterName,
                required,
                type: property.type,
                deprecated: property.deprecated || isParamDeprecated,
                validators: {},
            });
        }
        return output;
    }

    private pathContainsParam(name: string): boolean {
        for (const p of this.paths) {
            if (p.includes(`{${name}}`) || p.includes(`:${name}`)) {
                return true;
            }
        }
        return false;
    }

    private validatePathDecomposition(decomposed: Parameter[]): void {
        for (const element of decomposed) {
            if (!this.pathContainsParam(element.name)) {
                throw ParameterError.invalidPathMatch({
                    decoratorName: 'Path',
                    propertyName: element.name,
                    path: this.paths.join(' | '),
                    node: this.parameter,
                });
            }
        }
    }

    private validatePathName(name: string, parameterName: string): void {
        const candidate = name || parameterName;
        if (!this.pathContainsParam(candidate)) {
            throw ParameterError.invalidPathMatch({
                decoratorName: 'Path',
                propertyName: candidate,
                path: this.paths.join(' | '),
                node: this.parameter,
            });
        }
    }

    private isLeafTypeSupported(type: BaseType): boolean {
        return SUPPORTED_LEAF_TYPES.has(type.typeName);
    }

    private isLeafOrEnumOrUnion(type: Type): boolean {
        return SUPPORTED_LEAF_TYPES.has(type.typeName) ||
            isRefEnumType(type) ||
            isUnionType(type);
    }

    private resolveType(): Type {
        let typeNode = this.parameter.type;
        if (!typeNode) {
            const t = this.current.typeChecker.getTypeAtLocation(this.parameter);
            typeNode = this.current.typeChecker.typeToTypeNode(
                t,
                undefined,
                ts.NodeBuilderFlags.NoTruncation,
            );
        }
        if (!typeNode) {
            throw new ParameterError({ message: `Could not resolve type for parameter '${this.getParameterName()}'.` });
        }
        return new TypeNodeResolver(typeNode, this.current, this.parameter).resolve();
    }

    private getParameterName(): string {
        if (!ts.isIdentifier(this.parameter.name)) {
            throw new ParameterError({ message: 'Destructured parameters are not supported. Use a simple identifier name.' });
        }
        return this.parameter.name.text;
    }

    private getDescription(): string {
        const symbol = this.current.typeChecker.getSymbolAtLocation(this.parameter.name);
        if (symbol) {
            const comments = symbol.getDocumentationComment(this.current.typeChecker);
            if (comments.length > 0) {
                return ts.displayPartsToString(comments);
            }
        }
        return '';
    }

    private getJsDocExamples(parameterName: string): {
        examples: unknown[] | undefined;
        exampleLabels: Array<string | undefined> | undefined;
    } {
        const exampleLabels: Array<string | undefined> = [];
        const tags = getJSDocTags(this.parameter.parent, (tag) => {
            const comment = transformJSDocComment(tag.comment);
            const isExample = (tag.tagName.text === JSDocTagName.EXAMPLE ||
                    tag.tagName.escapedText === JSDocTagName.EXAMPLE) &&
                !!comment && comment.startsWith(parameterName);

            if (isExample && comment) {
                const hasExampleLabel = (comment.split(' ')[0].indexOf('.') || -1) > 0;
                exampleLabels.push(hasExampleLabel ?
                    comment.split(' ')[0].split('.').slice(1).join('.') :
                    undefined);
            }
            return isExample ?? false;
        });

        const examples = tags.map((tag) => (
            transformJSDocComment(tag.comment) || '')
            .replace(`${transformJSDocComment(tag.comment)?.split(' ')[0] || ''}`, '')
            .replace(/\r/g, ''));

        if (examples.length === 0) {
            return { examples: undefined, exampleLabels: undefined };
        }

        try {
            return {
                examples: examples.map((example) => JSON.parse(example)),
                exampleLabels,
            };
        } catch {
            throw ParameterError.invalidExampleSchema();
        }
    }

    private applyOptions(parameterName: string): ApplyHandlersOptions {
        return {
            target: 'parameter',
            host: { name: parameterName, parentName: this.method },
            resolveTypeNode: (n) => new TypeNodeResolver(n, this.current).resolve(),
            typeChecker: this.current.typeChecker,
            parameterType: () => this.parameter.type ?
                new TypeNodeResolver(this.parameter.type, this.current).resolve() :
                undefined,
            onUnmatchedDecorator: (this.current.config.strict || this.current.config.onUnmatchedDecorator) ?
                (report) => this.current.reportUnmatchedDecorator?.(report) :
                undefined,
        };
    }
}
