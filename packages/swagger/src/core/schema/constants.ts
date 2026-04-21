/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum TransferProtocol {
    HTTP = 'http',
    HTTPS = 'https',
    WS = 'ws',
    WSS = 'wss',
}

export enum DataFormatName {
    INT_32 = 'int32',
    INT_64 = 'int64',
    FLOAT = 'float',
    DOUBLE = 'double',
    BYTE = 'byte',
    BINARY = 'binary',
    DATE = 'date',
    DATE_TIME = 'date-time',
    PASSWORD = 'password',
}

export enum DataTypeName {
    VOID = 'void',
    INTEGER = 'integer',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    STRING = 'string',
    ARRAY = 'array',
    OBJECT = 'object',
    FILE = 'file',
}
