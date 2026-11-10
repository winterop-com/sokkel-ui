/*
 * The JSON Schema 2020-12 meta-schema, from json-schema.org, flattened into one object.
 * Copyright (c) 2022 JSON Schema Specification Authors, under the BSD 3-Clause License (see
 * THIRD_PARTY_NOTICES.md). Modified: the seven vocabulary meta-schemas the dialect's schema joins
 * by `allOf` are merged into it, their properties and `$defs` side by side, and every reference
 * points inside this one object; a `true` schema is written `{}`, which means the same.
 */
import type { JsonSchema } from './schema/read'

/**
 * The JSON Schema 2020-12 meta-schema as one self-contained schema: every vocabulary's keywords in
 * its `properties`, each subschema reached by `$dynamicRef: '#meta'` back at the root, and the
 * shared parts in `$defs`. Passed as `schema` to `CodeEditor`, a JSON Schema being written
 * completes its keywords at the top, inside `properties`, `items` and every other subschema, and is
 * checked by the same rules `validate` applies.
 */
export const JSON_SCHEMA_2020_12: JsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $dynamicAnchor: 'meta',
    title: 'Core and Validation specifications meta-schema',
    type: ['object', 'boolean'],
    properties: {
        $id: { $ref: '#/$defs/uriReferenceString', $comment: 'Non-empty fragments not allowed.', pattern: '^[^#]*#?$' },
        $schema: { $ref: '#/$defs/uriString' },
        $ref: { $ref: '#/$defs/uriReferenceString' },
        $anchor: { $ref: '#/$defs/anchorString' },
        $dynamicRef: { $ref: '#/$defs/uriReferenceString' },
        $dynamicAnchor: { $ref: '#/$defs/anchorString' },
        $vocabulary: { type: 'object', propertyNames: { $ref: '#/$defs/uriString' }, additionalProperties: { type: 'boolean' } },
        $comment: { type: 'string' },
        $defs: { type: 'object', additionalProperties: { $dynamicRef: '#meta' } },
        prefixItems: { $ref: '#/$defs/schemaArray' },
        items: { $dynamicRef: '#meta' },
        contains: { $dynamicRef: '#meta' },
        additionalProperties: { $dynamicRef: '#meta' },
        properties: { type: 'object', additionalProperties: { $dynamicRef: '#meta' }, default: {} },
        patternProperties: {
            type: 'object',
            additionalProperties: { $dynamicRef: '#meta' },
            propertyNames: { format: 'regex' },
            default: {},
        },
        dependentSchemas: { type: 'object', additionalProperties: { $dynamicRef: '#meta' }, default: {} },
        propertyNames: { $dynamicRef: '#meta' },
        if: { $dynamicRef: '#meta' },
        // oxlint-disable-next-line unicorn/no-thenable -- `then` is the schema keyword
        then: { $dynamicRef: '#meta' },
        else: { $dynamicRef: '#meta' },
        allOf: { $ref: '#/$defs/schemaArray' },
        anyOf: { $ref: '#/$defs/schemaArray' },
        oneOf: { $ref: '#/$defs/schemaArray' },
        not: { $dynamicRef: '#meta' },
        unevaluatedItems: { $dynamicRef: '#meta' },
        unevaluatedProperties: { $dynamicRef: '#meta' },
        type: {
            anyOf: [
                { $ref: '#/$defs/simpleTypes' },
                { type: 'array', items: { $ref: '#/$defs/simpleTypes' }, minItems: 1, uniqueItems: true },
            ],
        },
        const: {},
        enum: { type: 'array', items: {} },
        multipleOf: { type: 'number', exclusiveMinimum: 0 },
        maximum: { type: 'number' },
        exclusiveMaximum: { type: 'number' },
        minimum: { type: 'number' },
        exclusiveMinimum: { type: 'number' },
        maxLength: { $ref: '#/$defs/nonNegativeInteger' },
        minLength: { $ref: '#/$defs/nonNegativeIntegerDefault0' },
        pattern: { type: 'string', format: 'regex' },
        maxItems: { $ref: '#/$defs/nonNegativeInteger' },
        minItems: { $ref: '#/$defs/nonNegativeIntegerDefault0' },
        uniqueItems: { type: 'boolean', default: false },
        maxContains: { $ref: '#/$defs/nonNegativeInteger' },
        minContains: { $ref: '#/$defs/nonNegativeInteger', default: 1 },
        maxProperties: { $ref: '#/$defs/nonNegativeInteger' },
        minProperties: { $ref: '#/$defs/nonNegativeIntegerDefault0' },
        required: { $ref: '#/$defs/stringArray' },
        dependentRequired: { type: 'object', additionalProperties: { $ref: '#/$defs/stringArray' } },
        title: { type: 'string' },
        description: { type: 'string' },
        default: {},
        deprecated: { type: 'boolean', default: false },
        readOnly: { type: 'boolean', default: false },
        writeOnly: { type: 'boolean', default: false },
        examples: { type: 'array', items: {} },
        format: { type: 'string' },
        contentEncoding: { type: 'string' },
        contentMediaType: { type: 'string' },
        contentSchema: { $dynamicRef: '#meta' },
        definitions: {
            $comment: '"definitions" has been replaced by "$defs".',
            type: 'object',
            additionalProperties: { $dynamicRef: '#meta' },
            deprecated: true,
            default: {},
        },
        dependencies: {
            $comment:
                '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
            type: 'object',
            additionalProperties: { anyOf: [{ $dynamicRef: '#meta' }, { $ref: '#/$defs/stringArray' }] },
            deprecated: true,
            default: {},
        },
        $recursiveAnchor: {
            $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
            $ref: '#/$defs/anchorString',
            deprecated: true,
        },
        $recursiveRef: {
            $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
            $ref: '#/$defs/uriReferenceString',
            deprecated: true,
        },
    },
    $defs: {
        anchorString: { type: 'string', pattern: '^[A-Za-z_][-A-Za-z0-9._]*$' },
        uriString: { type: 'string', format: 'uri' },
        uriReferenceString: { type: 'string', format: 'uri-reference' },
        schemaArray: { type: 'array', minItems: 1, items: { $dynamicRef: '#meta' } },
        nonNegativeInteger: { type: 'integer', minimum: 0 },
        nonNegativeIntegerDefault0: { $ref: '#/$defs/nonNegativeInteger', default: 0 },
        simpleTypes: { enum: ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'] },
        stringArray: { type: 'array', items: { type: 'string' }, uniqueItems: true, default: [] },
    },
}
