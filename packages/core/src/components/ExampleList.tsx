import { useState } from 'react'

import { cn } from '../lib/cn'
import { GroupLabel } from './GroupLabel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

/** One example that fills an editor or a builder when chosen: a name, its source in the code face, or both. */
export interface Example {
    id: string
    /** Its name in words. */
    label?: string
    /** Its source or address in the code face, such as `GET /jobs?state=failed`; under the label when both are given. */
    code?: string
    /** What it shows, in a sentence. */
    description?: string
}

/** Examples under a heading, such as the reads or the writes. */
export interface ExampleGroup {
    title: string
    /** A sentence under the heading on what the group's examples have in common. */
    note?: string
    examples: readonly Example[]
}

/** One tab of examples, such as a language's. */
export interface ExampleTab {
    id: string
    label: string
    groups: readonly ExampleGroup[]
}

export interface ExampleListProps {
    /** The examples in one list, under their headings. */
    groups?: readonly ExampleGroup[]
    /** The examples in tabs, such as one per language; with more than one tab the list shows them above it. */
    tabs?: readonly ExampleTab[]
    /** The tab shown, held from outside with `onTabChange`. */
    tab?: string
    /** The tab shown at the start when `tab` is not given; the first when neither is. */
    defaultTab?: string
    onTabChange?: (tab: string) => void
    /** The example in use, marked in the list. */
    chosen?: string
    /** Fills the editor or builder with the example; the tab it was chosen from when the list has tabs. */
    onChoose: (example: Example, tab?: ExampleTab) => void
    className?: string
}

/**
 * Runnable examples grouped under headings, each a row to choose, as an editor's or a request
 * builder's starting points beside it: its name, its source in the code face and a sentence on what
 * it shows. With `tabs` the groups go in tabs, one per language or kind, the tab in view held
 * inside unless `tab` with `onTabChange` holds it from outside. `chosen` marks the example in use.
 * It fills the room it is given and draws no frame, so it sits in a `FoldingRail`, a panel or a page.
 */
export function ExampleList({ groups, tabs, tab, defaultTab, onTabChange, chosen, onChoose, className }: ExampleListProps) {
    const [own, setOwn] = useState(defaultTab ?? tabs?.[0]?.id)
    const shown = tab ?? own
    if (tabs === undefined || tabs.length === 0) {
        return <Groups groups={groups ?? []} chosen={chosen} onChoose={(example) => onChoose(example)} className={className} />
    }
    if (tabs.length === 1) {
        const only = tabs[0] as ExampleTab
        return <Groups groups={only.groups} chosen={chosen} onChoose={(example) => onChoose(example, only)} className={className} />
    }
    return (
        <Tabs
            value={shown}
            onValueChange={(next: string) => {
                if (tab === undefined) setOwn(next)
                onTabChange?.(next)
            }}
            className={cn('min-w-0 gap-0', className)}
        >
            <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b border-border px-2">
                {tabs.map((one) => (
                    <TabsTrigger key={one.id} value={one.id} className="flex-none">
                        {one.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map((one) => (
                <TabsContent key={one.id} value={one.id}>
                    <Groups groups={one.groups} chosen={chosen} onChoose={(example) => onChoose(example, one)} />
                </TabsContent>
            ))}
        </Tabs>
    )
}

function Groups({
    groups,
    chosen,
    onChoose,
    className,
}: {
    groups: readonly ExampleGroup[]
    chosen: string | undefined
    onChoose: (example: Example) => void
    className?: string
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-4 p-2', className)}>
            {groups.map((group) => (
                <div key={group.title} className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-col gap-0.5 px-2 pt-1">
                        <GroupLabel as="h3">{group.title}</GroupLabel>
                        {group.note !== undefined && <p className="text-help text-muted-foreground">{group.note}</p>}
                    </div>
                    <ul className="flex min-w-0 flex-col">
                        {group.examples.map((example) => (
                            <li key={example.id} className="min-w-0">
                                <button
                                    type="button"
                                    aria-current={example.id === chosen ? 'true' : undefined}
                                    onClick={() => onChoose(example)}
                                    className="flex w-full min-w-0 flex-col gap-0.5 rounded-control px-2 py-1.5 text-left outline-none hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-current:bg-accent aria-current:text-accent-foreground"
                                >
                                    {example.label !== undefined && <span className="truncate text-sm">{example.label}</span>}
                                    {example.code !== undefined && (
                                        <span
                                            className={cn(
                                                'truncate font-mono text-xs',
                                                example.label !== undefined && 'text-muted-foreground',
                                            )}
                                        >
                                            {example.code}
                                        </span>
                                    )}
                                    {example.description !== undefined && (
                                        <span className="text-help text-pretty text-muted-foreground">{example.description}</span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}
