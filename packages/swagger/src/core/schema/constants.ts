/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const TransferProtocol = {
    HTTP: 'http',
    HTTPS: 'https',
    WS: 'ws',
    WSS: 'wss',
} as const;
export type TransferProtocol = typeof TransferProtocol[keyof typeof TransferProtocol];

export const DataFormatName = {
    INT_32: 'int32',
    INT_64: 'int64',
    FLOAT: 'float',
    DOUBLE: 'double',
    BYTE: 'byte',
    BINARY: 'binary',
    DATE: 'date',
    DATE_TIME: 'date-time',
    PASSWORD: 'password',
} as const;
export type DataFormatName = typeof DataFormatName[keyof typeof DataFormatName];

export const DataTypeName = {
    VOID: 'void',
    INTEGER: 'integer',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    STRING: 'string',
    ARRAY: 'array',
    OBJECT: 'object',
    FILE: 'file',
} as const;
export type DataTypeName = typeof DataTypeName[keyof typeof DataTypeName];
