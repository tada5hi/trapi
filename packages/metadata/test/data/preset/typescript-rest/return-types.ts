/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line max-classes-per-file
export abstract class ReferencedResource<T> {
    /**
     * the body to be sent
     */
    public body: T;

    /**
     * Constructor. Receives the location of the resource.
     * @param location To be added to the Location header on response
     * @param statusCode the response status code to be sent
     */
    // eslint-disable-next-line no-useless-constructor
    protected constructor(public location: string, public statusCode: number) {

    }
}

export class NewResource<T> extends ReferencedResource<T> {
    /**
     * Constructor. Receives the location of the new resource created.
     * @param location To be added to the Location header on response
     * @param body To be added to the response body
     */
    constructor(location: string, body?: T) {
        super(location, 201);
        this.body = body;
    }
}

/**
 * Inform that the request was accepted but is not completed.
 * A Location header should inform the location where the user
 * can monitor his request processing status.
 */
export class RequestAccepted<T> extends ReferencedResource<T> {
    /**
     * Constructor. Receives the location where information about the
     * request processing can be found.
     * @param location To be added to the Location header on response
     * @param body To be added to the response body
     */
    constructor(location: string, body?: T) {
        super(location, 202);
        this.body = body;
    }
}

/**
 * Inform that the resource has permanently
 * moved to a new location, and that future references should use a
 * new URI with their requests.
 */
export class MovedPermanently<T> extends ReferencedResource<T> {
    /**
     * Constructor. Receives the location where the resource can be found.
     * @param location To be added to the Location header on response
     * @param body To be added to the response body
     */
    constructor(location: string, body?: T) {
        super(location, 301);
        this.body = body;
    }
}

/**
 * Inform that the resource has temporarily
 * moved to another location, but that future references should
 * still use the original URI to access the resource.
 */
export class MovedTemporarily<T> extends ReferencedResource<T> {
    /**
     * Constructor. Receives the location where the resource can be found.
     * @param location To be added to the Location header on response
     * @param body To be added to the response body
     */
    constructor(location: string, body?: T) {
        super(location, 302);
        this.body = body;
    }
}

export class DownloadResource {
    // eslint-disable-next-line no-useless-constructor
    constructor(public filePath: string, public fileName: string) { }
}

export class DownloadBinaryData {
    // eslint-disable-next-line no-useless-constructor
    constructor(public content: Buffer, public mimeType: string, public fileName?: string) { }
}

export const NoResponse = {};
