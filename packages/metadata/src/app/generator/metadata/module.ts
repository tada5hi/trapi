/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import crypto from 'node:crypto';
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
import {
    CACHE_SCHEMA_VERSION,
    CacheClient,
    composeCacheKey,
    hashCompilerOptions,
    hashRegistry,
} from '../../../adapters/cache';
import type { MetadataGeneratorOptions } from '../../../core/config';
import type {
    Controller,
    DependencyResolver,
    Metadata,
    ReferenceType,
    ReferenceTypes,
    Registry, 
    UnmatchedDecoratorReport, 
} from '@trapi/core';
import {
    createRegistry,
    loadRegistry,
    loadRegistryByName,
    mergeRegistries,
    resolvePresetByName,
} from '@trapi/core';
import { ConfigError } from '../../../core/error/config';
import { ConfigErrorCode } from '../../../core/error/config-codes';
import { GeneratorError } from '../../../core/error/generator';
import { GeneratorErrorCode } from '../../../core/error/generator-codes';
import { ResolverCache } from '../../../adapters/typescript/resolver/cache';
import { ControllerGenerator } from '../controller';
import type {
    IGeneratorContext,
    IMetadataGenerator,
    MetadataGeneratorContext,
} from '../../../core/metadata/types';

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
        const sourceFilesHash : string = this.buildNodesFromSourceFiles();

        // Load the preset upfront so its resolved registry can contribute to
        // the cache key. Otherwise edits to a local preset (or upgrades that
        // share a name) would silently serve stale metadata.
        let presetRegistry: Registry | undefined;
        let presetName: string | undefined;
        if (typeof this.config.preset === 'string') {
            presetName = this.config.preset;
            presetRegistry = await loadRegistryByName(this.config.preset);
        } else if (this.config.preset) {
            presetName = this.config.preset.name;
            presetRegistry = await loadRegistry(this.config.preset, { resolver: resolvePresetByName });
        }

        if (presetRegistry && this.config.registry) {
            this.registry = mergeRegistries(presetRegistry, this.config.registry);
        } else if (presetRegistry) {
            this.registry = presetRegistry;
        } else if (this.config.registry) {
            this.registry = this.config.registry;
        }

        const cacheKey = composeCacheKey({
            schemaVersion: CACHE_SCHEMA_VERSION,
            sourceFilesHash,
            compilerOptionsHash: hashCompilerOptions(this.program.getCompilerOptions()),
            registryHash: hashRegistry(this.registry),
            presetName,
        });

        // Strict reporting requires handler dispatch to actually run. A cache hit
        // would skip it and silently swallow unmatched-decorator reports.
        const bypassCache = !!(this.config.strict || this.config.onUnmatchedDecorator);

        let cache = bypassCache ?
            undefined :
            await this.cache.get(cacheKey);

        if (!cache) {
            this.buildControllers();

            this.assertPresetProducedControllers();

            this.circularDependencyResolvers.forEach((resolve) => resolve(this.referenceTypes));

            cache = {
                controllers: this.controllers,
                referenceTypes: this.referenceTypes,
                cacheKey,
                schemaVersion: CACHE_SCHEMA_VERSION,
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
        if (this.config.preset || this.config.registry || this.controllers.length > 0) {
            return;
        }
        // Only fault a missing preset when we actually scanned source files —
        // an empty entry point is a different misconfiguration that shouldn't
        // surface as a preset error.
        if (this.nodes.length === 0) {
            return;
        }
        throw new ConfigError({
            message: 'No preset or registry configured and no controllers detected. Provide `preset: \'@trapi/preset-decorators-express\'` (or another preset), or pass an inline `registry`, so handlers can match your decorators.',
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

    protected buildNodesFromSourceFiles() : string {
        const hash = crypto.createHash('sha256');

        this.program.getSourceFiles().forEach((sf: SourceFile) => {
            if (
                this.isIgnoredPath(sf.fileName) &&
                !this.isAllowedPath(sf.fileName)
            ) {
                return;
            }

            // Hash the file path alongside its contents so that renames or
            // reordered identical files invalidate the cache. The null byte is
            // a safe separator since it cannot appear in a path or source.
            hash.update(sf.fileName);
            hash.update('\0');
            hash.update(sf.text);
            hash.update('\0');

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

        return hash.digest('hex');
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
