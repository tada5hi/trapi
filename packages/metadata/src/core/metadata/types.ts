/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { CompilerOptions, Node, TypeChecker } from 'typescript';
import type { MetadataGeneratorOptions } from '../config';
import type { IDecoratorResolver } from '../../adapters/decorator';
import type { Registry } from '../../adapters/decorator/v2';
import type {
    DependencyResolver,
    IResolverCache,
    ReferenceType,
    ReferenceTypes,
} from '../resolver/types';
import type { Controller } from '../controller/types';

export type MetadataGeneratorContext = {
    options: MetadataGeneratorOptions,
    sourceFiles: string[],
    compilerOptions?: CompilerOptions
};

export interface IMetadataGenerator {
    generate(): Promise<Metadata>;
}

/**
 * The output specification for metadata generation.
 */
export interface Metadata {
    /**
     * A Controller is a collection of grouped methods (GET, POST, ...)
     * for a common URL path (i.e /users) or an more explicit URL path (i.e. /users/:id).
     */
    controllers: Controller[];
    /**
     * ReferenceTypes is an object of found types (interfaces, type, ...),
     * and classes which were detected during code analysis.
     */
    referenceTypes: ReferenceTypes;
}

/**
 * Narrow context interface for the type resolver.
 * Contains only what TypeNodeResolver needs — no generator methods.
 */
export interface IResolverContext {
    readonly typeChecker: TypeChecker;
    readonly nodes: Node[];
    readonly decoratorResolver: IDecoratorResolver;
    readonly resolverCache: IResolverCache;
    isExportedNode(node: Node): boolean;
}

/**
 * Callback interface for resolver → generator communication.
 * Allows the resolver to register discovered reference types
 * without importing the MetadataGenerator class.
 */
export interface IReferenceTypeRegistry {
    addReferenceType(type: ReferenceType): void;
    getReferenceType(refName: string): ReferenceType | undefined;
    registerDependencyResolver(callback: DependencyResolver): void;
}

/**
 * Context interface for generators.
 * Extends IResolverContext and IReferenceTypeRegistry so generators
 * can pass `this.current` directly to TypeNodeResolver.
 */
export interface IGeneratorContext extends IResolverContext, IReferenceTypeRegistry {
    readonly config: MetadataGeneratorOptions;
    readonly registry: Registry;
}
