/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { CompilerOptions, Node, TypeChecker } from 'typescript';
import type { MetadataGeneratorOptions } from '../config';
import type {
    DependencyResolver,
    IResolverCache,
    Metadata,
    ReferenceType,
    Registry,
    UnmatchedDecoratorReport,
} from '@trapi/core';

export type MetadataGeneratorContext = {
    options: MetadataGeneratorOptions,
    sourceFiles: string[],
    compilerOptions?: CompilerOptions
};

export interface IMetadataGenerator {
    generate(): Promise<Metadata>;
}

/**
 * Narrow context interface for the type resolver.
 * Contains only what TypeNodeResolver needs — no generator methods.
 */
export interface IResolverContext {
    readonly typeChecker: TypeChecker;
    readonly nodes: Node[];
    readonly registry: Registry;
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
    /**
     * Optional sink for unmatched-decorator reports. Generators forward to
     * this when `config.strict` is enabled. The metadata generator drains the
     * sink after the controller walk and emits a single warning summary.
     */
    reportUnmatchedDecorator?(report: UnmatchedDecoratorReport): void;
}
