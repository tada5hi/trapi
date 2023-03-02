/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Node, TypeChecker } from 'typescript';
import type { Mapper } from '../mapper';
import type { DependencyResolver, ReferenceType } from '../types';

export interface MetadataGeneratorInterface {
    readonly nodes: Node[];

    readonly typeChecker: TypeChecker;

    readonly decoratorMapper: Mapper;

    addReferenceType(referenceType: ReferenceType): void;

    isExportedNode(node: Node): boolean;

    registerDependencyResolver(callback: DependencyResolver): void;
}
