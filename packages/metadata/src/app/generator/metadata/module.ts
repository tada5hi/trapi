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
import type { Registry, UnmatchedDecoratorReport } from '../../../adapters/decorator';
import { createRegistry, loadRegistryByName } from '../../../adapters/decorator';
import { ConfigError } from '../../../core/error/config';
import { ConfigErrorCode } from '../../../core/error/config-codes';
import { GeneratorError } from '../../../core/error/generator';
import { GeneratorErrorCode } from '../../../core/error/generator-codes';
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

    public registry: Registry;

    public readonly resolverCache: ResolverCache;

    public readonly config: MetadataGeneratorOptions;

    private readonly program: Program;

    private cache : CacheClient;

    private controllers: Controller[];

    private referenceTypes: ReferenceTypes = {};

    private circularDependencyResolvers = new Array<DependencyResolver>();

    private unmatchedDecorators: Map<string, UnmatchedDecoratorReport[]> = new Map();

    // -------------------------------------------------------------------------

    constructor(context: MetadataGeneratorContext) {
        this.nodes = [];
        this.config = context.options;

        this.cache = new CacheClient(context.options.cache);
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

        // Strict reporting requires handler dispatch to actually run. A cache hit
        // would skip it and silently swallow unmatched-decorator reports.
        const bypassCache = !!(this.config.strict || this.config.onUnmatchedDecorator);

        let cache = bypassCache ?
            undefined :
            await this.cache.get(sourceFileSize, this.config.preset);

        if (!cache) {
            if (this.config.preset) {
                this.registry = await loadRegistryByName(this.config.preset);
            }

            this.buildControllers();

            this.assertPresetProducedControllers();

            this.circularDependencyResolvers.forEach((resolve) => resolve(this.referenceTypes));

            cache = {
                controllers: this.controllers,
                referenceTypes: this.referenceTypes,
                sourceFilesSize: sourceFileSize,
                preset: this.config.preset,
            };

            if (!bypassCache) {
                await this.cache.save(cache);
            }
        }

        if (this.config.strict || this.config.onUnmatchedDecorator) {
            this.dispatchUnmatchedDecoratorReports();
        }

        return {
            controllers: cache.controllers,
            referenceTypes: cache.referenceTypes,
        };
    }

    private assertPresetProducedControllers(): void {
        if (this.config.preset || this.controllers.length > 0) {
            return;
        }
        // Only fault a missing preset when we actually scanned source files —
        // an empty entry point is a different misconfiguration that shouldn't
        // surface as a preset error.
        if (this.nodes.length === 0) {
            return;
        }
        throw new ConfigError({
            message: 'No preset configured and no controllers detected. Provide `preset: \'@trapi/decorators\'` (or another preset) so handlers can match your decorators.',
            code: ConfigErrorCode.PRESET_MISSING,
        });
    }

    public reportUnmatchedDecorator(report: UnmatchedDecoratorReport): void {
        const key = `${report.target}:${report.name}`;
        const existing = this.unmatchedDecorators.get(key);
        if (existing) {
            existing.push(report);
            return;
        }
        this.unmatchedDecorators.set(key, [report]);
    }

    private dispatchUnmatchedDecoratorReports(): void {
        if (this.unmatchedDecorators.size === 0) {
            return;
        }

        const flat: UnmatchedDecoratorReport[] = [];
        for (const reports of this.unmatchedDecorators.values()) {
            flat.push(...reports);
        }

        // User-supplied callback short-circuits the default warn/throw path.
        if (this.config.onUnmatchedDecorator) {
            this.config.onUnmatchedDecorator(flat);
            return;
        }

        const summary = this.formatUnmatchedSummary();

        if (this.config.strict === 'throw') {
            throw new GeneratorError({
                message: summary,
                code: GeneratorErrorCode.STRICT_UNMATCHED_DECORATORS,
            });
        }

        // eslint-disable-next-line no-console
        console.warn(summary);
    }

    private formatUnmatchedSummary(): string {
        const lines: string[] = ['[trapi] strict mode: decorators with no matching handler:'];
        for (const reports of this.unmatchedDecorators.values()) {
            const first = reports[0];
            const occurrences = reports.length;
            const location = `${first.file}:${first.line}`;
            const suffix = occurrences > 1 ?
                ` (${occurrences} occurrences; first at ${location})` :
                ` (${location})`;
            lines.push(`  - @${first.name} on ${first.target} '${first.host.name}'${suffix}`);
        }
        return lines.join('\n');
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
