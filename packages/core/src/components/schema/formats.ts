/**
 * The string formats an app adds to the schema checks, beside the standard ones. It needs no schema
 * checker, so an app registers its formats at start without fetching ajv.
 */

/** How a format checks a string: a pattern, a test, or `true` to accept any string under that name. */
export type SchemaFormatTest = RegExp | ((value: string) => boolean) | true

/**
 * A format: its check alone, or its check and `say`, the phrase an issue with it reads in place of
 * the format's name, such as `Expected a duration such as 30s or 5m`.
 */
export type SchemaFormat = SchemaFormatTest | { test: SchemaFormatTest; say?: string }

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

/** A format's check, without its phrase. */
export function formatTest(format: SchemaFormat): SchemaFormatTest {
    return typeof format === 'object' && !(format instanceof RegExp) ? format.test : format
}

/** The phrase a registered format's issue reads, when it was given one. */
export function formatPhrase(name: string): string | undefined {
    const format = registered[name] as SchemaFormat | undefined
    return typeof format === 'object' && !(format instanceof RegExp) ? format.say : undefined
}

/** The registered formats and a count that moves each time they change. */
export function schemaFormats(): { formats: SchemaFormats; version: number } {
    return { formats: registered, version }
}
