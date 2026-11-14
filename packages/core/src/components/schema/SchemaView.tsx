import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../../lib/cn'
import { childSchema, constraints, literal, resolve, typeLabel, type JsonSchema } from './read'

export interface SchemaViewWords {
    required: string
    optional: string
    default: string
    values: string
    constant: string
    readOnly: string
    deprecated: string
    empty: string
}

const WORDS: SchemaViewWords = {
    required: 'required',
    optional: 'optional',
    default: 'default',
    values: 'values',
    constant: 'always',
    readOnly: 'read only',
    deprecated: 'deprecated',
    empty: 'No fields.',
}

function Field({
    name,
    schema,
    root,
    required,
    depth,
    open,
    words,
}: {
    name: string
    schema: JsonSchema
    root: JsonSchema
    required: boolean
    depth: number
    open: number
    words: SchemaViewWords
}) {
    const resolved = resolve(schema, root)
    const child = childSchema(schema, root)
    const [expanded, setExpanded] = useState(depth < open)
    const rules = constraints(resolved)
    const choices = resolved.enum ?? (resolved.const !== undefined ? [resolved.const] : undefined)
    return (
        <li className="flex flex-col">
            <div className="flex items-start gap-2 py-2">
                {child !== undefined ? (
                    <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={name}
                        onClick={() => setExpanded(!expanded)}
                        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-focus focus-visible:outline-ring focus-visible:outline-solid"
                    >
                        <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} aria-hidden />
                    </button>
                ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <code className={cn('font-mono text-sm', resolved.deprecated === true && 'line-through opacity-70')}>{name}</code>
                        {required && (
                            <span className="text-xs text-critical" title={words.required}>
                                *<span className="sr-only">{words.required}</span>
                            </span>
                        )}
                        <span className="font-mono text-xs text-muted-foreground">{typeLabel(schema, root)}</span>
                        {resolved.readOnly === true && <span className="text-xs text-faint">{words.readOnly}</span>}
                        {resolved.deprecated === true && <span className="text-xs text-warning">{words.deprecated}</span>}
                    </div>
                    {(resolved.description ?? resolved.title) !== undefined && (
                        <p className="text-sm text-muted-foreground">{resolved.description ?? resolved.title}</p>
                    )}
                    {(choices !== undefined || resolved.default !== undefined || rules.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {choices !== undefined && (
                                <>
                                    <span className="text-faint">{resolved.const !== undefined ? words.constant : words.values}</span>
                                    {choices.map((choice) => (
                                        <code key={literal(choice)} className="rounded-mini bg-muted px-1 font-mono text-foreground">
                                            {literal(choice)}
                                        </code>
                                    ))}
                                </>
                            )}
                            {resolved.default !== undefined && (
                                <>
                                    <span className="text-faint">{words.default}</span>
                                    <code className="rounded-mini bg-muted px-1 font-mono text-foreground">
                                        {literal(resolved.default)}
                                    </code>
                                </>
                            )}
                            {rules.map((rule) => (
                                <span key={rule} className="rounded-mini border border-border px-1 text-muted-foreground">
                                    {rule}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {child !== undefined && expanded && (
                <Fields
                    schema={child}
                    root={root}
                    depth={depth + 1}
                    open={open}
                    words={words}
                    className="ml-2 border-l border-border pl-3"
                />
            )}
        </li>
    )
}

function Fields({
    schema,
    root,
    depth,
    open,
    words,
    className,
}: {
    schema: JsonSchema
    root: JsonSchema
    depth: number
    open: number
    words: SchemaViewWords
    className?: string
}) {
    const resolved = resolve(schema, root)
    const entries = Object.entries(resolved.properties ?? {})
    const required = new Set(resolved.required ?? [])
    if (entries.length === 0) return <p className="py-2 text-sm text-muted-foreground">{words.empty}</p>
    return (
        <ul className={cn('flex flex-col divide-y divide-border', className)}>
            {entries.map(([name, field]) => (
                <Field
                    key={name}
                    name={name}
                    schema={field}
                    root={root}
                    required={required.has(name)}
                    depth={depth}
                    open={open}
                    words={words}
                />
            ))}
        </ul>
    )
}

export interface SchemaViewProps {
    schema: JsonSchema
    /** How many levels of nested fields start open. */
    open?: number
    words?: Partial<SchemaViewWords>
    className?: string
}

/**
 * A JSON Schema as a person reads it: each field's name in the code face, `*` when required, its
 * type in words, its description, then its allowed values, default and rules. Objects and arrays
 * of objects fold open, to `open` levels at first; local `$ref`s and `allOf` are followed.
 */
export function SchemaView({ schema, open = 1, words: given, className }: SchemaViewProps) {
    const words = { ...WORDS, ...given }
    return (
        <div className={cn('text-sm', className)}>
            <Fields schema={schema} root={schema} depth={0} open={open} words={words} />
        </div>
    )
}
