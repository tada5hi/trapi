/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'validup';
import { createValidator } from '@validup/adapter-zod';
import type { Preset } from '../preset';
import { presetSchema } from './schemas';

export function createPresetContainer(): Container<Preset> {
    const container = new Container<Preset>();
    container.mount('name', createValidator(presetSchema.shape.name));
    container.mount('extends', { optional: true }, createValidator(presetSchema.shape.extends));
    container.mount('controllers', { optional: true }, createValidator(presetSchema.shape.controllers));
    container.mount('methods', { optional: true }, createValidator(presetSchema.shape.methods));
    container.mount('parameters', { optional: true }, createValidator(presetSchema.shape.parameters));
    container.mount('controllerJsDoc', { optional: true }, createValidator(presetSchema.shape.controllerJsDoc));
    container.mount('methodJsDoc', { optional: true }, createValidator(presetSchema.shape.methodJsDoc));
    container.mount('parameterJsDoc', { optional: true }, createValidator(presetSchema.shape.parameterJsDoc));
    return container;
}

const sharedContainer = createPresetContainer();

export async function validatePreset(input: unknown): Promise<Preset> {
    if (input === null || typeof input !== 'object') {
        throw new TypeError('preset input must be an object');
    }
    return sharedContainer.run(input as Record<string, unknown>) as Promise<Preset>;
}
