import { MoreHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Code } from '../Code'
import { Segmented } from '../Segmented'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import type { JsonSchema } from './read'
import { SchemaView } from './SchemaView'

/** One side of an input/output card: what it takes or gives, and an example of it. */
export interface IOSide {
    schema: JsonSchema
    /** A value that fits the schema, shown on the side's Example view. */
    example?: unknown
}

export interface IOCardWords {
    input: string
    output: string
    schema: string
    example: string
    menu: string
    none: string
}

const WORDS: IOCardWords = {
    input: 'Input',
    output: 'Output',
    schema: 'Schema',
    example: 'Example',
    menu: 'More actions',
    none: 'Nothing.',
}

function Side({ label, side, words }: { label: string; side?: IOSide; words: IOCardWords }) {
    const [view, setView] = useState<'schema' | 'example'>('schema')
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <header className="flex h-7 items-center gap-2">
                <h4 className="flex-1 text-xs leading-4 font-semibold">{label}</h4>
                {side?.example !== undefined && (
                    <Segmented
                        label={`${label}: ${words.schema} or ${words.example}`}
                        value={view}
                        onChoose={setView}
                        options={[
                            { value: 'schema', label: words.schema },
                            { value: 'example', label: words.example },
                        ]}
                    />
                )}
            </header>
            {side === undefined ? (
                <p className="text-sm text-muted-foreground">{words.none}</p>
            ) : view === 'example' && side.example !== undefined ? (
                <Code value={JSON.stringify(side.example, null, 2)} language="json" size="sm" />
            ) : (
                <SchemaView schema={side.schema} />
            )}
        </section>
    )
}

/**
 * A thing that takes something in and gives something back, as a card: a job step, an endpoint,
 * a tool. Its head names it (name, or code when it has none, the code always in the code face),
 * with a description, a status and a menu; under it the input and the output, each a JSON Schema
 * read as fields, with a filled-in example a press away. The two sides stand side by side on a
 * wide card and stack on a narrow one.
 */
export function IOCard({
    title,
    code,
    description,
    status,
    menu,
    input,
    output,
    className,
    words = WORDS,
}: {
    title?: ReactNode
    code?: string
    description?: ReactNode
    status?: ReactNode
    menu?: ReactNode
    input?: IOSide
    output?: IOSide
    className?: string
    words?: IOCardWords
}) {
    const heading = title ?? code
    return (
        <article
            className={cn(
                '@container flex min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card text-sm',
                className,
            )}
        >
            <header className="flex items-start gap-2 border-b border-border p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className={cn('truncate text-base leading-6 font-semibold', title === undefined && 'font-mono')}>{heading}</h3>
                    {title !== undefined && code !== undefined && (
                        <span className="truncate font-mono text-xs text-muted-foreground">{code}</span>
                    )}
                    {status !== undefined && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">{status}</div>
                    )}
                    {description !== undefined && <p className="pt-1 text-muted-foreground">{description}</p>}
                </div>
                {menu !== undefined && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            aria-label={words.menu}
                            title={words.menu}
                            className="-mt-1 -mr-1 flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
                        >
                            <MoreHorizontal className="size-4" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {menu}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </header>
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 p-4 @2xl:grid-cols-2">
                <Side label={words.input} side={input} words={words} />
                <Side label={words.output} side={output} words={words} />
            </div>
        </article>
    )
}
