import { Search } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { BlockRow } from './BlockPalette'
import { groupBlocks, type BlockGroup, type PipelineBlock } from './blocks'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'

/** The words a block picker says. */
export interface BlockPickerWords {
    /** The search field's name. */
    search: string
    /** What the empty search field shows; the search field's name when left out. */
    placeholder?: string
    /** The list's name. */
    list: string
    /** What it says when no block matches the search. */
    none: string
    /** What it says when no block fits where the step would go. */
    nothing: string
    /** What it says while the blocks are still being read. */
    loading: string
}

export const BLOCK_PICKER_WORDS: BlockPickerWords = {
    search: 'Find a block',
    list: 'Blocks',
    none: 'No block matches',
    nothing: 'No block fits here',
    loading: 'Reading the blocks',
}

const WIDTH = { md: 'w-64', lg: 'w-80', xl: 'w-96' } as const

export interface BlockPickerProps {
    blocks: readonly PipelineBlock[]
    groups: readonly BlockGroup[]
    onPick: (block: PipelineBlock) => void
    onClose?: () => void
    /** Where the step would go, said over the search: "After validate". */
    title?: string
    /** The blocks are still being read: it says so, and Enter picks nothing. */
    loading?: boolean
    /** Draws each block's description as a line of its own under its title. */
    showDescription?: boolean
    /**
     * How wide the picker is drawn: `md` (16rem) by default, `lg` (20rem) or `xl` (24rem) for a longer
     * placeholder or descriptions. Over a canvas it never grows past the canvas's own width.
     */
    width?: 'md' | 'lg' | 'xl'
    words?: Partial<BlockPickerWords>
    className?: string
}

/**
 * A searchable list of blocks to choose one from, for a step about to be added: after a step,
 * between two, or at the end of a connection. The search takes the focus; the arrow keys move
 * through the list, Enter picks, and Escape clears the search, or closes once it is empty. Hand it only the blocks that fit where the
 * step would go. Place it with `GraphOverlay` to open it on a canvas.
 */
export function BlockPicker({
    blocks,
    groups,
    onPick,
    onClose,
    title,
    loading = false,
    showDescription = false,
    width = 'md',
    words: given,
    className,
}: BlockPickerProps) {
    const words = { ...BLOCK_PICKER_WORDS, ...given }
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const listed = loading ? [] : groupBlocks(blocks, groups, query)
    const flat = listed.flatMap((entry) => entry.blocks)
    const at = Math.min(active, Math.max(0, flat.length - 1))
    const base = useId()
    const optionId = (index: number) => `${base}-o${String(index)}`

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (flat.length === 0) return
            const step = event.key === 'ArrowDown' ? 1 : -1
            setActive((at + step + flat.length) % flat.length)
        } else if (event.key === 'Enter') {
            event.preventDefault()
            const block = flat[at]
            if (block !== undefined) onPick(block)
        } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            if (query !== '') {
                setQuery('')
                setActive(0)
            } else onClose?.()
        }
    }

    let index = -1
    return (
        <div
            data-slot="block-picker"
            className={cn(
                'flex max-h-[min(20rem,var(--graph-overlay-room,20rem))] max-w-[var(--graph-overlay-width,none)] flex-col overflow-hidden rounded-control border border-border bg-popover text-popover-foreground shadow-pop',
                WIDTH[width],
                className,
            )}
        >
            {title !== undefined && <p className="shrink-0 truncate px-3 pt-2.5 text-xs font-medium text-muted-foreground">{title}</p>}
            <label className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
                <Search className="size-4 shrink-0 text-faint" aria-hidden />
                <Input
                    bare
                    autoFocus
                    role="combobox"
                    aria-expanded
                    aria-controls={`${base}-list`}
                    aria-activedescendant={flat.length > 0 ? optionId(at) : undefined}
                    aria-label={words.search}
                    placeholder={words.placeholder ?? words.search}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value)
                        setActive(0)
                    }}
                    onKeyDown={onKeyDown}
                    className="min-w-0 flex-1 text-sm placeholder:text-faint"
                />
            </label>
            <div id={`${base}-list`} role="listbox" aria-label={words.list} className="min-h-0 flex-1 overflow-y-auto p-1">
                {flat.length === 0 && (
                    <p role={loading ? 'status' : undefined} className="px-2 py-5 text-center text-sm text-muted-foreground">
                        {loading ? words.loading : blocks.length === 0 ? words.nothing : words.none}
                    </p>
                )}
                {listed.map(({ group, blocks: inGroup }) => (
                    <div key={group.id} role="group" aria-label={group.label}>
                        <GroupLabel className="px-2 pt-1.5 pb-0.5">{group.label}</GroupLabel>
                        {inGroup.map((block) => {
                            index += 1
                            const mine = index
                            return (
                                <div
                                    key={block.kind}
                                    id={optionId(mine)}
                                    role="option"
                                    aria-selected={mine === at}
                                    title={showDescription ? undefined : block.description}
                                    onPointerMove={() => setActive(mine)}
                                    onClick={() => onPick(block)}
                                    className={cn('cursor-pointer rounded-chip px-1.5 py-1', mine === at && 'bg-muted')}
                                >
                                    <BlockRow block={block} active={mine === at} showDescription={showDescription} />
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
