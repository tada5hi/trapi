/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'validup';
import { createValidator } from '@validup/adapter-zod';
import { z } from 'zod';
import type { Preset } from '../types';

const decoratorTargetSchema = z.enum([
    'class',
    'method',
    'parameter',
    'property',
]);

const replacesPolicySchema = z.union([z.literal(true), z.string().min(1)]);

export const matchSchema = z.object({
    name: z.string().min(1),
    on: decoratorTargetSchema.optional(),
});

export const jsDocMatchSchema = z.object({
    tag: z.string().min(1),
    on: decoratorTargetSchema.optional(),
});

const numericMarkerSchema = z.object({ numeric: z.enum(['int', 'long', 'float', 'double']) });

const resolverMarkerSchema = z.union([
    z.literal('hidden'),
    z.literal('deprecated'),
    z.literal('extension'),
    numericMarkerSchema,
]);

const handlerBaseShape = {
    replaces: replacesPolicySchema.optional(),
    marker: resolverMarkerSchema.optional(),
    apply: z.custom<(...args: unknown[]) => unknown>(
        (value) => typeof value === 'function',
        { message: 'apply must be a function' },
    ),
};

export const controllerHandlerSchema = z.object({
    match: matchSchema,
    ...handlerBaseShape,
});

export const methodHandlerSchema = z.object({
    match: matchSchema,
    ...handlerBaseShape,
});

export const parameterHandlerSchema = z.object({
    match: matchSchema,
    ...handlerBaseShape,
});

export const controllerJsDocHandlerSchema = z.object({
    match: jsDocMatchSchema,
    ...handlerBaseShape,
});

export const methodJsDocHandlerSchema = z.object({
    match: jsDocMatchSchema,
    ...handlerBaseShape,
});

export const parameterJsDocHandlerSchema = z.object({
    match: jsDocMatchSchema,
    ...handlerBaseShape,
});

export const presetSchema = z.object({
    name: z.string().min(1),
    extends: z.array(z.string().min(1)).optional(),
    controllers: z.array(controllerHandlerSchema).optional(),
    methods: z.array(methodHandlerSchema).optional(),
    parameters: z.array(parameterHandlerSchema).optional(),
    controllerJsDoc: z.array(controllerJsDocHandlerSchema).optional(),
    methodJsDoc: z.array(methodJsDocHandlerSchema).optional(),
    parameterJsDoc: z.array(parameterJsDocHandlerSchema).optional(),
});

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
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError('preset input must be an object');
    }
    return sharedContainer.run(input as Record<string, unknown>) as Promise<Preset>;
}
