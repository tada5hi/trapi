/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { CompilerOptions } from 'typescript';
import type { Options } from '../../config';
import type { ReferenceTypes } from '../../resolver';
import type { Controller } from '../controller';

export type MetadataGeneratorContext = {
    options: Options,
    sourceFiles: string[],
    compilerOptions?: CompilerOptions
};

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
