import { Box } from 'lucide-react'
import { useState, type DragEvent } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { GRAPH_DRAG_TYPE, groupBlocks, type BlockGroup, type PipelineBlock } from './blocks'
import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'

/** The words a palette says. */
export interface BlockPaletteWords {
    /** The palette's accessible name. */
    label: string
    search: string
    /** What it says when no block matches the search. */
    none: string
    /** The line under the list that says how a block is used. */
    hint: string
    clear: string
}

export const BLOCK_PALETTE_WORDS: BlockPaletteWords = {
    label: 'Blocks',
    search: 'Search blocks',
    none: 'No block matches',
    hint: 'Drag a block onto the canvas, or click it to add it after the chosen step.',
    clear: 'Clear the search',
}

export interface BlockRowProps {
    block: PipelineBlock
    active?: boolean
    /** Draws the description as a line of its own under the title, in place of the kind. */
    showDescription?: boolean
}

/**
 * One block as a row: its glyph, the title (the name, or else the kind in the code face), the kind
 * under a name, or the description given `showDescription`, and its badge at the end.
 */
export function BlockRow({ block, active = false, showDescription = false }: BlockRowProps) {
    const Icon = block.icon ?? Box
    const named = block.name !== undefined && block.name !== ''
    const described = showDescription && block.description !== undefined && block.description !== ''
    return (
        <span className="flex min-w-0 items-center gap-2.5">
            <span
                className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-control border border-border bg-background text-muted-foreground',
                    active && 'border-border-strong text-foreground',
                )}
                aria-hidden
            >
                <Icon className="size-3.5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('truncate text-sm leading-5', !named && 'font-mono')}>{named ? block.name : block.kind}</span>
                {described ? (
                    <span className="line-clamp-2 text-xs leading-4 text-muted-foreground">{block.description}</span>
                ) : (
                    named && <span className="truncate font-mono text-xs leading-4 text-muted-foreground">{block.kind}</span>
                )}
            </span>
            {block.badge !== undefined && block.badge !== '' && <Chip className="self-start">{block.badge}</Chip>}
        </span>
    )
}

export interface BlockPaletteProps {
    blocks: readonly PipelineBlock[]
    groups: readonly BlockGroup[]
    /** A block was clicked. */
    onPick?: (block: PipelineBlock) => void
    /** The search, when held from outside. */
    query?: string
    onQueryChange?: (query: string) => void
    words?: Partial<BlockPaletteWords>
    className?: string
}

/**
 * The blocks a pipeline is built from, listed under their groups with a search over them. A block
 * drags onto a canvas whose `editing` takes `onDropItem`, carrying its kind under
 * `GRAPH_DRAG_TYPE`; a click picks it. The palette fills its column and its list scrolls.
 */
export function BlockPalette({ blocks, groups, onPick, query: held, onQueryChange, words: given, className }: BlockPaletteProps) {
    const words = { ...BLOCK_PALETTE_WORDS, ...given }
    const [own, setOwn] = useState('')
    const query = held ?? own
    const setQuery = (next: string) => {
        if (held === undefined) setOwn(next)
        onQueryChange?.(next)
    }
    const listed = groupBlocks(blocks, groups, query)

    const onDragStart = (block: PipelineBlock) => (event: DragEvent<HTMLButtonElement>) => {
        event.dataTransfer.setData(GRAPH_DRAG_TYPE, block.kind)
        event.dataTransfer.setData('text/plain', block.kind)
        event.dataTransfer.effectAllowed = 'copy'
    }

    return (
        <nav
            aria-label={words.label}
            data-slot="block-palette"
            className={cn('flex min-h-0 flex-col overflow-hidden rounded-surface border border-border bg-card', className)}
        >
            <div className="shrink-0 border-b border-border p-2">
                <SearchField value={query} onChange={setQuery} placeholder={words.search} shortcut={false} words={{ clear: words.clear }} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {listed.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">{words.none}</p>}
                {listed.map(({ group, blocks: inGroup }) => (
                    <section key={group.id} aria-label={group.label} className="pb-1.5">
                        <GroupLabel as="h3" className="px-2 pt-2 pb-1">
                            {group.label}
                        </GroupLabel>
                        <ul className="flex flex-col">
                            {inGroup.map((block) => (
                                <li key={block.kind}>
                                    <button
                                        type="button"
                                        draggable
                                        onDragStart={onDragStart(block)}
                                        onClick={() => onPick?.(block)}
                                        title={block.description}
                                        className="flex w-full cursor-grab items-center rounded-control px-1.5 py-1 text-left outline-none hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
                                    >
                                        <BlockRow block={block} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
            <p className="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">{words.hint}</p>
        </nav>
    )
}
