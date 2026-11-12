import type { ComponentType } from 'react'

import type { ChipTone } from '@winterop-com/sokkel-ui/Chip'

/** A kind of step a pipeline can be built from, as a palette or a picker offers it. */
export interface PipelineBlock {
    /** The block's key, drawn in the code face: the kind a step made from it carries. */
    kind: string
    /** A human title; without one, the kind is the title. */
    name?: string
    description?: string
    /** The id of the group it is listed under. */
    group: string
    icon?: ComponentType<{ className?: string }>
    /** A short word at the row's end, such as what sort of block it is: plain words in a neutral chip, or a label in a tone. */
    badge?: string | PipelineBlockBadge
    /** Other words a search finds the block by. */
    keywords?: readonly string[]
}

/** A block's badge in a tone of its own, as a chip wears it. */
export interface PipelineBlockBadge {
    label: string
    /** Neutral by default. */
    tone?: ChipTone
    /** What pointing at the badge says. */
    title?: string
}

/** A block's badge as a label, a tone and a title; null when it has none. */
export function blockBadge(block: PipelineBlock): PipelineBlockBadge | null {
    const badge = typeof block.badge === 'string' ? { label: block.badge } : block.badge
    return badge === undefined || badge.label === '' ? null : badge
}

/** A heading blocks are listed under, in the order given. */
export interface BlockGroup {
    id: string
    label: string
}

/** The type a dragged block's kind travels under, from a palette to a canvas. */
export const GRAPH_DRAG_TYPE = 'application/x-graph-item'

/** Whether a block matches what was typed: every word found in its kind, name, description, badge or keywords. */
export function blockMatches(block: PipelineBlock, query: string): boolean {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return true
    const text = [block.kind, block.name ?? '', block.description ?? '', blockBadge(block)?.label ?? '', ...(block.keywords ?? [])]
        .join(' ')
        .toLowerCase()
    return words.every((word) => text.includes(word))
}

/** The blocks that match a query, under their groups in the groups' order; a group with none is left out. */
export function groupBlocks(
    blocks: readonly PipelineBlock[],
    groups: readonly BlockGroup[],
    query = '',
): { group: BlockGroup; blocks: PipelineBlock[] }[] {
    return groups
        .map((group) => ({ group, blocks: blocks.filter((block) => block.group === group.id && blockMatches(block, query)) }))
        .filter((entry) => entry.blocks.length > 0)
}
