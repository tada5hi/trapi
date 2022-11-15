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
export interface MapperIDProperties {
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
    SERVER_PARAM: {
        DEFAULT: string
    };
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
    SERVER_HEADER: {
        // routup
        DEFAULT: string
    };
    SERVER_HEADERS: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_COOKIE: {
        // routup
        DEFAULT: string
    };
    SERVER_COOKIES: {
        // typescript-rest
        DEFAULT?: string
    };
    SERVER_PATH_PARAM: {
        // routup
        DEFAULT: string
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

export type MapperID = keyof MapperIDProperties;

export type MethodHttpVerbType = Extract<
MapperID,
'ALL' |
'GET' |
'POST' |
'PUT' |
'DELETE' |
'PATCH' |
'OPTIONS' |
'HEAD'
>;

export type ParameterType = Extract<
MapperID,
'SERVER_CONTEXT' |
'SERVER_PARAM' |
'SERVER_PARAMS' |
'SERVER_QUERY' |
'SERVER_FORM' |
'SERVER_BODY' |
'SERVER_HEADER' |
'SERVER_HEADERS' |
'SERVER_COOKIE' |
'SERVER_COOKIES' |
'SERVER_PATH_PARAM' |
'SERVER_PATH_PARAMS' |
'SERVER_FILE_PARAM' |
'SERVER_FILES_PARAM'
>;

// -------------------------------------------

export type MapperIDPropertyStrategy = 'merge' | 'none' | ((...items: unknown[] | unknown[][]) => unknown | unknown[]);

export type MapperIDPropertyConfig = {
    /**
     * Default: 'element'
     */
    type?: 'element' | 'array',

    /**
     * Default: false
     */
    isType?: boolean,

    /**
     * Default: 'argument'
     */
    srcArgumentType?: 'argument' | 'typeArgument',

    /**
     * Default: 0
     */
    srcPosition?: number,

    /**
     * Default: undefined
     */
    srcAmount?: number,

    /**
     * Default: 'none'
     */
    srcStrategy?: MapperIDPropertyStrategy
};

export type MapperIDPropertiesConfig<P> = {
    [K in keyof P]: MapperIDPropertyConfig
};

// -------------------------------------------

/**
 * This type maps a decorator ID to its representation config.
 */
export type MapperIDRepresentation = {
    [T in MapperID]: MapperIDRepresentationItem<T> | Array<MapperIDRepresentationItem<T>>;
};

/**
 * The id property is the name/text of the defined decorator.
 */
export type MapperIDRepresentationItem<T extends MapperID> = {
    id: string,
    properties?: MapperIDPropertiesConfig<MapperIDProperties[T]>
};

// -------------------------------------------

export type Config = {
    /**
     * Use a pre-defined third party configuration in full scope or
     * only use a partial amount of defined type representations.
     *
     * Default: []
     */
    preset?: PresetConfig,
    /**
     * Use all internal defined representations or only use a subset.
     *
     * Default: true
     */
    internal?: MapperIDs,
    /**
     * Set up self defined aka. custom representations.
     */
    custom?: Partial<MapperIDRepresentation>
};

// -------------------------------------------

/**
 * Activate/Deactivate specific type representations of a TypeRepresentationMap.
 */
export type MapperIDs = boolean | MapperID | MapperID[] | { [K in MapperID]?: boolean };

// -------------------------------------------

/**
 * These are the current by default supported third party presets.
 */
export type Preset = 'typescript-rest' | 'decorators-express' | 'routup';
export type PresetConfig = Preset | Preset[] | Record<string, MapperIDs>;
