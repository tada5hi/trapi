/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClassDeclaration } from 'typescript';
import { isMethodDeclaration } from 'typescript';
import { DecoratorID } from '../../decorator';
import { AbstractGenerator } from '../abstract';
import type { Method } from '../method';
import { MethodGenerator } from '../method';
import type { MetadataGenerator } from '../metadata';
import type { Controller } from './type';

export class ControllerGenerator extends AbstractGenerator<ClassDeclaration> {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(node: ClassDeclaration, current: MetadataGenerator) {
        super(node, current);
    }

    public isValid() : boolean {
        const isController = this.current.decoratorResolver.match(
            DecoratorID.CONTROLLER,
            this.node,
        );

        return !!isController;
    }

    public generate(): Controller {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const sourceFile = this.node.parent.getSourceFile();

        const path = this.buildPath();

        return {
            consumes: this.getConsumes(),
            hidden: this.isHidden(this.node),
            location: sourceFile.fileName,
            name: this.getCurrentLocation(),
            path,
            produces: this.getProduces(),
            responses: this.buildResponses(),
            security: this.getSecurity(),
            tags: this.getTags(),
            methods: this.buildMethods(path),
        };
    }

    protected getCurrentLocation(): string {
        return (this.node as ClassDeclaration).name.text;
    }

    protected buildMethods(controllerPath: string) : Method[] {
        const set = new Set<string>();
        const output : Method[] = [];

        for (let i = 0; i < this.node.members.length; i++) {
            const node = this.node.members[i];

            if (!isMethodDeclaration(node) || this.isHidden(node)) {
                continue;
            }

            const generator = new MethodGenerator(node, this.current);
            const methodName = generator.getMethodName();
            if (set.has(methodName) || !generator.isValid()) {
                continue;
            }

            set.add(methodName);

            output.push(generator.generate(controllerPath));
        }

        return output;
    }
}
