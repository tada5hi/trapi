/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { z } from 'zod';

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

const handlerBaseShape = {
    replaces: replacesPolicySchema.optional(),
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
