/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClassDeclaration, MethodDeclaration } from 'typescript';
import { SyntaxKind } from 'typescript';
import { AnnotationKey } from '../../annotation';
import { AbstractGenerator } from '../abstract';
import type { Method } from '../method';
import { MethodGenerator } from '../method';
import type { MetadataGenerator } from '../metadata';
import type { Controller } from './type';

export class ControllerGenerator extends AbstractGenerator<ClassDeclaration> {
    private genMethods: Set<string> = new Set<string>();

    // --------------------------------------------------------------------

    constructor(node: ClassDeclaration, current: MetadataGenerator) {
        super(node, current);

        this.generatePath(AnnotationKey.CLASS_PATH);
    }

    public isValid() {
        return !!this.path || this.path === '';
    }

    public generate(): Controller {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const sourceFile = this.node.parent.getSourceFile();

        return {
            consumes: this.getConsumes(),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.getCurrentLocation(),
            path: this.path || '',
            produces: this.getProduces(),
            responses: this.getResponses(),
            security: this.getSecurity(),
            tags: this.getTags(),
        };
    }

    protected getCurrentLocation(): string {
        return (this.node as ClassDeclaration).name.text;
    }

    private buildMethods() : Method[] {
        return this.node.members
            .filter((method: { kind: unknown; }) => (method.kind === SyntaxKind.MethodDeclaration))
            .filter((method: MethodDeclaration) => !this.isHidden(method))
            .map((method: MethodDeclaration) => new MethodGenerator(method, this.current, this.path || ''))
            .filter((generator: MethodGenerator) => {
                if (generator.isValid() && !this.genMethods.has(generator.getMethodName())) {
                    this.genMethods.add(generator.getMethodName());
                    return true;
                }
                return false;
            })
            .map((generator: MethodGenerator) => generator.generate());
    }
}
