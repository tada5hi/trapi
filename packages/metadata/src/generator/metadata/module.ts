/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import minimatch from 'minimatch';
import type {
    ClassDeclaration,
    InterfaceDeclaration,
    Node,
    Program,
    SourceFile,
    TypeChecker,
} from 'typescript';
import {
    NodeFlags,
    SyntaxKind,
    createProgram,
    forEachChild,
    isModuleBlock,
    isModuleDeclaration,
} from 'typescript';
import type { Options } from '../../config';
import { DecoratorID, DecoratorResolver } from '../../decorator';
import { TypeNodeResolver } from '../../resolver';
import type { DependencyResolver, ReferenceType, ReferenceTypes } from '../../resolver';
import { getNodeDecorators } from '../../utils';
import type { Controller } from '../controller';
import { ControllerGenerator } from '../controller';
import { CacheDriver } from '../../cache';
import type { Metadata, MetadataGeneratorContext } from './type';

export class MetadataGenerator {
    public readonly nodes : Node[];

    public readonly typeChecker: TypeChecker;

    public readonly decoratorResolver: DecoratorResolver;

    public readonly config: Options;

    private readonly program: Program;

    private cache : CacheDriver;

    private controllers: Controller[];

    private referenceTypes: ReferenceTypes = {};

    private circularDependencyResolvers = new Array<DependencyResolver>();

    // -------------------------------------------------------------------------

    constructor(context: MetadataGeneratorContext) {
        this.nodes = [];
        this.config = context.options;

        this.cache = new CacheDriver(context.options.cache);
        this.decoratorResolver = new DecoratorResolver();

        this.program = createProgram(
            context.sourceFiles,
            context.compilerOptions || {},
        );
        this.typeChecker = this.program.getTypeChecker();

        TypeNodeResolver.clearCache();
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
                await this.decoratorResolver.applyPreset(this.config.preset);
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

    public isExportedNode(node: Node) {
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

    public getClassDeclaration(className: string) {
        const found = this.nodes
            .filter((node) => {
                const classDeclaration = (node as ClassDeclaration);
                return (node.kind === SyntaxKind.ClassDeclaration && classDeclaration.name && classDeclaration.name.text === className);
            });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    }

    public getInterfaceDeclaration(className: string) {
        const found = this.nodes
            .filter((node) => {
                const interfaceDeclaration = (node as InterfaceDeclaration);
                return (node.kind === SyntaxKind.InterfaceDeclaration && interfaceDeclaration.name && interfaceDeclaration.name.text === className);
            });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    }

    private buildControllers() : void {
        this.controllers = this.nodes
            .filter((node) => node.kind === SyntaxKind.ClassDeclaration)
            .filter((node) => {
                const isHidden = this.decoratorResolver.match(DecoratorID.HIDDEN, node);
                if (isHidden) {
                    return false;
                }

                const isController = this.decoratorResolver.match(DecoratorID.CLASS_PATH, node);

                return !!isController;
            })
            .map((classDeclaration: ClassDeclaration) => new ControllerGenerator(classDeclaration, this))
            .filter((generator) => generator.isValid())
            .map((generator) => generator.generate());
    }
}
