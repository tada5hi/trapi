/*
 * No-op runtime stubs for every decorator name referenced by the fixture
 * controllers in this directory. The metadata generator reads decorators from
 * the AST (decorator name + arguments) — these stubs exist purely so the
 * fixtures type-check without depending on any specific framework or preset
 * package at install time.
 */


// All stubs return `any` so a single decorator name can be applied at any
// position (class / method / parameter / property) without TS complaining.
function noopFactory(..._args: any[]): any {
    return () => { /* no-op */ };
}

// Direct (non-factory) decorator — used when the fixture writes `@IsInt`
// without parentheses.
function noopDirect(..._args: any[]): any { /* no-op */ }

// --- Controller / Mount ----------------------------------------------------

export const Controller: any = noopFactory;
export const Mount: any = noopFactory;

// --- Method verbs ----------------------------------------------------------

export const Get: any = noopFactory;
export const Post: any = noopFactory;
export const Put: any = noopFactory;
export const Delete: any = noopFactory;
export const Patch: any = noopFactory;
export const Options: any = noopFactory;
export const Head: any = noopFactory;
export const All: any = noopFactory;

// --- Parameter binders -----------------------------------------------------

export const Body: any = noopFactory;
export const BodyProp: any = noopFactory;
export const Query: any = noopFactory;
export const QueryProp: any = noopFactory;
export const Path: any = noopFactory;
export const PathParam: any = noopFactory;
export const Header: any = noopFactory;
export const Headers: any = noopFactory;
export const Cookie: any = noopFactory;
export const Cookies: any = noopFactory;
export const Form: any = noopFactory;
export const FormProp: any = noopFactory;
export const File: any = noopFactory;
export const Files: any = noopFactory;
export const Param: any = noopFactory;
export const Params: any = noopFactory;
export const Context: any = noopFactory;

// --- Doc / metadata-only ---------------------------------------------------

export const Hidden: any = noopFactory;
export const Deprecated: any = noopFactory;
export const Tags: any = noopFactory;
export const Produces: any = noopFactory;
export const Consumes: any = noopFactory;
export const Accept: any = noopFactory;
export const Security: any = noopFactory;
export function Description<_T = unknown>(..._args: any[]): any {
    return () => { /* no-op */ };
}
export function Example<_T = unknown>(..._args: any[]): any {
    return () => { /* no-op */ };
}
export const Extension: any = noopFactory;

// --- Numeric markers (parameter + property) --------------------------------
// Used as `@IsInt` (no parens), so they are direct decorators rather than
// factories.

export const IsInt: any = noopDirect;
export const IsLong: any = noopDirect;
export const IsFloat: any = noopDirect;
export const IsDouble: any = noopDirect;
