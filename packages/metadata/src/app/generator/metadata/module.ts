/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { minimatch } from 'minimatch';
import type {
    Node,
    Program,
    SourceFile,
    TypeChecker,
} from 'typescript';
import {
    NodeFlags,
    createProgram,
    forEachChild,
    isClassDeclaration,
    isModuleBlock,
    isModuleDeclaration,
} from 'typescript';
import { CacheClient } from '../../../adapters/cache';
import type { MetadataGeneratorOptions } from '../../../core/config';
import { DecoratorResolver } from '../../../adapters/decorator';
import type { Registry } from '../../../adapters/decorator/v2';
import { createRegistry, loadRegistryByName } from '../../../adapters/decorator/v2';
import type { DependencyResolver, ReferenceType, ReferenceTypes } from '../../../core/types/resolver';
import { ResolverCache } from '../../../adapters/typescript/resolver/cache';
import type { Controller } from '../../../core/types/controller';
import { ControllerGenerator } from '../controller';
import type {
    IGeneratorContext,
    IMetadataGenerator,
    Metadata,
    MetadataGeneratorContext,
} from '../../../core/types/metadata';

export class MetadataGenerator implements IGeneratorContext, IMetadataGenerator {
    public readonly nodes : Node[];

    public readonly typeChecker: TypeChecker;

    public readonly decoratorResolver: DecoratorResolver;

    public registry: Registry;

    public readonly resolverCache: ResolverCache;

    public readonly config: MetadataGeneratorOptions;

    private readonly program: Program;

    private cache : CacheClient;

    private controllers: Controller[];

    private referenceTypes: ReferenceTypes = {};

    private circularDependencyResolvers = new Array<DependencyResolver>();

    // -------------------------------------------------------------------------

    constructor(context: MetadataGeneratorContext) {
        this.nodes = [];
        this.config = context.options;

        this.cache = new CacheClient(context.options.cache);
        this.decoratorResolver = new DecoratorResolver();
        this.registry = createRegistry();
        this.resolverCache = new ResolverCache();

        this.program = createProgram(
            context.sourceFiles,
            context.compilerOptions || {},
        );
        this.typeChecker = this.program.getTypeChecker();
    }

    // -------------------------------------------------------------------------

    async generate(): Promise<Metadata> {
        const sourceFileSize : number = this.buildNodesFromSourceFiles();

        let cache = await this.cache.get(sourceFileSize);

        if (!cache) {
            if (this.config.decorators) {
                this.decoratorResolver.apply(this.config.decorators);
            }

            if (this.config.preset) {
                // v1 path (kept until type resolver is migrated; populates the
                // decorator-name → DecoratorID mapping used by TypeNodeResolver).
                await this.decoratorResolver.applyPreset(this.config.preset);
                // v2 path (drives the new generator pipeline via registry handlers).
                this.registry = await loadRegistryByName(this.config.preset);
            }

            this.buildControllers();

            this.circularDependencyResolvers.forEach((resolve) => resolve(this.referenceTypes));

            cache = {
                controllers: this.controllers,
                referenceTypes: this.referenceTypes,
                sourceFilesSize: sourceFileSize,
            };

            await this.cache.save(cache);
        }

        return {
            controllers: cache.controllers,
            referenceTypes: cache.referenceTypes,
        };
    }

    protected buildNodesFromSourceFiles() : number {
        let endSize = 0;

        this.program.getSourceFiles().forEach((sf: SourceFile) => {
            if (
                this.isIgnoredPath(sf.fileName) &&
                !this.isAllowedPath(sf.fileName)
            ) {
                return;
            }

            endSize += sf.end;

            forEachChild(sf, (node: any) => {
                if (isModuleDeclaration(node)) {
                    /**
                     * For some reason unknown to me, TS resolves both `declare module` and `namespace` to
                     * the same kind (`ModuleDeclaration`). In order to figure out whether it's one or the other,
                     * we check the node flags. They tell us whether it is a namespace or not.
                     */

                    // tslint:disable-next-line:no-bitwise
                    if ((node.flags & NodeFlags.Namespace) === 0 && node.body && isModuleBlock(node.body)) {
                        node.body.statements.forEach((statement) => {
                            this.nodes.push(statement);
                        });
                        return;
                    }
                }

                this.nodes.push(node);
            });
        });

        return endSize;
    }

    // -------------------------------------------------------------------------

    /**
     * Check if the source file path is in the ignored path list.
     *
     * @param filePath
     * @protected
     */
    protected isIgnoredPath(filePath: string) : boolean {
        if (typeof this.config.ignore === 'undefined') {
            return false;
        }

        return this.config.ignore.some((item) => minimatch(filePath, item));
    }

    /**
     * Check if the source file path is in the ignored path list.
     *
     * @param filePath
     * @protected
     */
    protected isAllowedPath(filePath: string) {
        if (typeof this.config.allow === 'undefined') {
            return false;
        }

        return this.config.allow.some((item) => minimatch(filePath, item));
    }

    // -------------------------------------------------------------------------

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public isExportedNode(_node: Node) {
        return true;
    }

    // -------------------------------------------------------------------------

    public addReferenceType(referenceType: ReferenceType) {
        if (!referenceType.refName) {
            return;
        }

        this.referenceTypes[referenceType.refName] = referenceType;
    }

    public getReferenceType(refName: string) {
        return this.referenceTypes[refName];
    }

    public registerDependencyResolver(callback: DependencyResolver) {
        this.circularDependencyResolvers.push(callback);
    }

    private buildControllers() : void {
        this.controllers = [];

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (!isClassDeclaration(node)) {
                continue;
            }

            const generator = new ControllerGenerator(node, this);
            if (!generator.isValid()) {
                continue;
            }

            const controller = generator.generate();
            if (controller) {
                this.controllers.push(controller);
            }
        }
    }
}
