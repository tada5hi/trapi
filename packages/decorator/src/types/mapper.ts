/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// -------------------------------------------

/**
 * A decorator id is an identifier which is associated
 * to specific decorator names.
 */
export interface MapperProperties {
    // Class Type
    SWAGGER_TAGS: {
        DEFAULT: string[]
    };
    CLASS_PATH: {
        DEFAULT: string
    };

    // Method and Class
    REQUEST_ACCEPT: undefined;
    RESPONSE_EXAMPLE: {
        TYPE: unknown,
        PAYLOAD: unknown | unknown[]
    };
    RESPONSE_DESCRIPTION: {
        TYPE: unknown;
        STATUS_CODE: number | string;
        DESCRIPTION: string;
        PAYLOAD: unknown | unknown[];
    };
    REQUEST_CONSUMES: {
        DEFAULT: string[]
    };
    RESPONSE_PRODUCES: {
        DEFAULT: string[]
    };
    HIDDEN: {};
    EXTENSION: {
        KEY: string,
        VALUE: unknown | unknown[]
    };

    // Method
    METHOD_PATH: {
        DEFAULT: string
    };
    DEPRECATED: undefined;

    // METHOD HTTP
    ALL: {
        DEFAULT?: string
    };
    GET: {
        DEFAULT?: string
    };
    POST: {
        DEFAULT?: string
    };
    PUT: {
        DEFAULT?: string
    };
    DELETE: {
        DEFAULT?: string
    };
    PATCH: {
        DEFAULT?: string
    };
    OPTIONS: {
        DEFAULT?: string
    };
    HEAD: {
        DEFAULT?: string
    };

    // Parameter
    IS_INT: undefined;
    IS_LONG: undefined;
    IS_FlOAT: undefined;
    IS_DOUBLE: undefined;

    // Parameter Server
    SERVER_CONTEXT: {};
    SERVER_PARAMS: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_QUERY: {
        // typescript-rest
        DEFAULT?: string,
        OPTIONS?: Record<string, any>
    } | undefined;
    SERVER_FORM: {
        // typescript-rest
        DEFAULT?: string
    } | undefined;
    SERVER_BODY: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_HEADERS: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_COOKIES: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_PATH_PARAMS: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_FILE_PARAM: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_FILES_PARAM: {
        // typescript-rest
        DEFAULT?: string
    };
}

export type MapperID = keyof MapperProperties;

export type MethodHttpVerbType = Extract<MapperID, 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' |
'PATCH' | 'OPTIONS' | 'HEAD'>;

export type ParameterServerType = Extract<MapperID, 'SERVER_CONTEXT' | 'SERVER_PARAMS' | 'SERVER_QUERY' | 'SERVER_FORM' |
'SERVER_BODY' | 'SERVER_HEADERS' | 'SERVER_COOKIES' | 'SERVER_PATH_PARAMS' |
'SERVER_FILE_PARAM' | 'SERVER_FILES_PARAM'>;

// -------------------------------------------

export type MapperPropertyStrategy = 'merge' | 'none' | ((...items: unknown[] | unknown[][]) => unknown | unknown[]);

export interface MapperPropertyConfig {
    /**
         * Default: 'element'
         */
    type?: 'element' | 'array';

    /**
         * Default: false
         */
    isType?: boolean;

    /**
         * Default: 'argument'
         */
    srcArgumentType?: 'argument' | 'typeArgument';

    /**
         * Default: 0
         */
    srcPosition?: number;

    /**
         * Default: undefined
         */
    srcAmount?: number;

    /**
         * Default: 'none'
         */
    srcStrategy?: MapperPropertyStrategy
}

export type MapperPropertiesConfig<P> = {
    [K in keyof P]: MapperPropertyConfig
};

// -------------------------------------------

/**
 * This type maps a decorator ID to its representation config.
 */
export type MapperRepresentationMap = {
    [T in MapperID]: MapperRepresentation<T> | Array<MapperRepresentation<T>>;
};

/**
 * The id property is the name/text of the defined decorator.
 */
export interface MapperRepresentation<T extends MapperID> {
    id: string;
    properties?: MapperPropertiesConfig<MapperProperties[T]>;
}

// -------------------------------------------

export interface Config {
    /**
     * Use a pre-defined third party TypeRepresentationMap in full scope or
     * only use a partial amount of defined type representations.
     *
     * Default: []
     */
    library?: LibraryConfig;
    /**
     * Use all internal defined type representations or only use a subset.
     * Default: true
     */
    internal?: IncludedIDs;
    /**
     * Set up self defined representations.
     */
    map?: Partial<MapperRepresentationMap>;
}

// -------------------------------------------

/**
 * Activate/Deactivate specific type representations of a TypeRepresentationMap.
 */
export type IncludedIDs = boolean | MapperID | MapperID[] | { [K in MapperID]?: boolean };

// -------------------------------------------

/**
 * These are the current by default supported third party libraries.
 */
export type Library = 'typescript-rest' | 'decorators-express';
export type LibraryConfig = Library | Library[] | Record<string, IncludedIDs>;
