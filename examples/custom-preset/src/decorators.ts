/*
 * Runtime decorator stubs for the example. These are no-ops at runtime; the
 * preset extracts metadata purely from the AST shape (decorator name + arguments).
 * In a real project these would be your existing decorator library.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export function Route(_path: string): ClassDecorator {
    return () => { /* no-op */ };
}

export function Tags(..._tags: string[]): ClassDecorator {
    return () => { /* no-op */ };
}

export function Skip(): ClassDecorator {
    return () => { /* no-op */ };
}

export function HttpGet(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function HttpPost(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function FromBody(): ParameterDecorator {
    return () => { /* no-op */ };
}

export function FromQuery(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function FromRoute(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}
