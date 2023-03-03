/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildLoaderFilePath, locateManySync } from 'locter';
import minimatch from 'minimatch';
import type {
    ClassDeclaration,
    CompilerOptions,
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
import type { EntryPoint, Options } from '../../config';
import { Mapper } from '../../mapper';
import { TypeNodeResolver } from '../../resolver';
import type { DependencyResolver, ReferenceType, ReferenceTypes } from '../../types';
import type { Controller } from '../controller';
import { ControllerGenerator } from '../controller';
import { CacheDriver } from '../../cache';
import type { MetadataGeneratorOutput } from './type';

export class MetadataGenerator {
    public readonly nodes : Node[];

    public readonly typeChecker: TypeChecker;

    public readonly decoratorMapper: Mapper;

    public readonly config: Options;

    private readonly program: Program;

    private cache : CacheDriver;

    private controllers: Controller[];

    private referenceTypes: ReferenceTypes = {};

    private circularDependencyResolvers = new Array<DependencyResolver>();

    // -------------------------------------------------------------------------

    constructor(
        config: Options,
        compilerOptions: CompilerOptions,
    ) {
        this.nodes = [];
        this.config = config;

        this.cache = new CacheDriver(config.cache);
        this.decoratorMapper = new Mapper(config.annotation);

        TypeNodeResolver.clearCache();

        const sourceFiles = this.scanSourceFiles(config.entryPoint);
        this.program = createProgram(sourceFiles, compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
    }

    // -------------------------------------------------------------------------

    public generate(): MetadataGeneratorOutput {
        const sourceFileSize : number = this.buildNodesFromSourceFiles();

        let cache = this.cache.get(sourceFileSize);

        if (!cache) {
            this.buildControllers();

            this.circularDependencyResolvers.forEach((resolve) => resolve(this.referenceTypes));

            cache = {
                controllers: this.controllers,
                referenceTypes: this.referenceTypes,
                sourceFilesSize: sourceFileSize,
            };

            this.cache.save(cache);
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

    private scanSourceFiles(input: EntryPoint) : string[] {
        const sources = Array.isArray(input) ? input : [input];
        const result: Set<string> = new Set<string>();

        for (let i = 0; i < sources.length; i++) {
            const source = sources[i];

            let matches : string[];

            if (typeof source === 'string') {
                matches = locateManySync(source)
                    .map((info) => buildLoaderFilePath(info, true));
            } else {
                matches = locateManySync(source.pattern)
                    .map((info) => buildLoaderFilePath(info, true));
            }

            for (let j = 0; j < matches.length; j++) {
                result.add(matches[j]);
            }
        }

        return Array.from(result);
    }

    private buildControllers() : void {
        this.controllers = this.nodes
            .filter((node) => node.kind === SyntaxKind.ClassDeclaration)
            .filter((node) => {
                const isHidden = this.decoratorMapper.match('HIDDEN', node);

                return typeof isHidden === 'undefined';
            })
            .filter((node) => typeof this.decoratorMapper.match('CLASS_PATH', node) !== 'undefined')
            .map((classDeclaration: ClassDeclaration) => new ControllerGenerator(classDeclaration, this))
            .filter((generator) => generator.isValid())
            .map((generator) => generator.generate());
    }
}
