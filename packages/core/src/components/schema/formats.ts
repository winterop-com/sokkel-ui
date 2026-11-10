/**
 * The string formats an app adds to the schema checks, beside the standard ones. It needs no schema
 * checker, so an app registers its formats at start without fetching ajv.
 */

/** How a format checks a string: a pattern, a test, or `true` to accept any string under that name. */
export type SchemaFormat = RegExp | ((value: string) => boolean) | true

/** Formats by name, as a schema's `format` keyword names them. */
export type SchemaFormats = Readonly<Record<string, SchemaFormat>>

let registered: Record<string, SchemaFormat> = {}
let version = 0

/**
 * Adds formats to every schema check, `SchemaForm`'s and `CodeEditor`'s alike; a name given again
 * replaces the earlier one, a standard one included. Schemas are compiled again on their next
 * check. A format no one has registered is not checked, and says nothing.
 */
export function registerSchemaFormats(formats: SchemaFormats): void {
    registered = { ...registered, ...formats }
    version += 1
}

/** The registered formats and a count that moves each time they change. */
export function schemaFormats(): { formats: SchemaFormats; version: number } {
    return { formats: registered, version }
}
