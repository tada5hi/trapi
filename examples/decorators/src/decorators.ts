/*
 * Runtime decorator stubs. These are no-ops at runtime; the preset extracts
 * metadata purely from the AST shape (decorator name + arguments). In a real
 * project these would either be your own routing library OR you would replace
 * them with a runtime that wires routes into a server (see README).
 */

// --- Controller ------------------------------------------------------------

export function Controller(_path?: string | string[]): ClassDecorator {
    return () => { /* no-op */ };
}

export function Mount(_path: string | string[]): any {
    return () => { /* no-op */ };
}

// --- Method verbs ----------------------------------------------------------

export function Get(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function Post(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function Put(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function Delete(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function Patch(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function Options(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function Head(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

export function All(_path?: string): MethodDecorator {
    return () => { /* no-op */ };
}

// --- Parameter binders -----------------------------------------------------

export function Body(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function Query(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function Path(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function Header(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function Cookie(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function Form(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function File(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

export function Param(_name?: string): ParameterDecorator {
    return () => { /* no-op */ };
}

// --- TRAPI-specific markers ------------------------------------------------
//
// These decorators only carry metadata for the OpenAPI emitter. They have no
// runtime effect.

export function Hidden(): any {
    return () => { /* no-op */ };
}

export function Deprecated(): any {
    return () => { /* no-op */ };
}

export function Tags(..._tags: string[]): any {
    return () => { /* no-op */ };
}

export function Produces(..._mediaTypes: string[]): any {
    return () => { /* no-op */ };
}

export function Consumes(..._mediaTypes: string[]): any {
    return () => { /* no-op */ };
}

export function Accept(..._mediaTypes: string[]): any {
    return () => { /* no-op */ };
}

export function Security(_scopesOrObject: string[] | Record<string, string[]>, _name?: string): any {
    return () => { /* no-op */ };
}

export function Extension(_key: string, _value: unknown): any {
    return () => { /* no-op */ };
}

export function Description<_T = unknown>(
    _statusOrName: string | number,
    _description?: string,
    _example?: unknown,
): any {
    return () => { /* no-op */ };
}

export function Example<_T = unknown>(_payload: unknown, _label?: string): MethodDecorator {
    return () => { /* no-op */ };
}

// Direct (non-factory) numeric markers — applied as `@IsInt` without parens.
export function IsInt(_target: any, _propertyKey?: string | symbol, _parameterIndex?: number) { /* no-op */ }
export function IsLong(_target: any, _propertyKey?: string | symbol, _parameterIndex?: number) { /* no-op */ }
export function IsFloat(_target: any, _propertyKey?: string | symbol, _parameterIndex?: number) { /* no-op */ }
export function IsDouble(_target: any, _propertyKey?: string | symbol, _parameterIndex?: number) { /* no-op */ }
