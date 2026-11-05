import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

/**
 * Marks for the library, to pick from. "Sokkel" is a plinth: the base something stands on. Each mark
 * is drawn in `currentColor` on a 32-unit grid, so a theme recolors it; it is shown as plain ink and
 * on the primary tile, at favicon, sidebar and large sizes, and in a sidebar head. Nothing here is
 * used by the library until one is picked.
 */
const meta: Meta = { title: 'Research/Logo', tags: ['no-screenshot'] }
export default meta

interface Mark {
    id: string
    name: string
    idea: string
    paths: ReactNode
}

const MARKS: Mark[] = [
    {
        id: 'layered-plinth',
        name: 'Layered plinth',
        idea: 'Three widening layers, tokens, primitives and patterns, stacked into a base.',
        paths: <path d="M10 6h12v4H10zM6 14h20v4H6zM2 22h28v4H2z" />,
    },
    {
        id: 'block-s',
        name: 'Block S',
        idea: 'A squared S joined from blocks into one compact shape.',
        paths: <path d="M6 4h22v6H12v4h14v14H4v-6h16v-4H6z" />,
    },
    {
        id: 'raised-form',
        name: 'Raised form',
        idea: 'A round form resting on a stepped pedestal: what apps build, on what the library gives.',
        paths: (
            <>
                <circle cx="16" cy="8" r="5" />
                <path d="M6 16h20v4h-6v4h10v4H2v-4h10v-4H6z" />
            </>
        ),
    },
    {
        id: 'token-foundation',
        name: 'Token base',
        idea: 'Four square tokens above one continuous base.',
        paths: <path d="M6 4h8v8H6zM18 4h8v8h-8zM6 16h8v8H6zM18 16h8v8h-8zM2 26h28v4H2z" />,
    },
]

function Glyph({ mark, className }: { mark: Mark; className: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
            {mark.paths}
        </svg>
    )
}

/** The mark white on the primary color, as an app's brand tile draws it. */
function Tile({ mark, size, glyph }: { mark: Mark; size: string; glyph: string }) {
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground ${size}`}>
            <Glyph mark={mark} className={glyph} />
        </span>
    )
}

function Sizes({ mark }: { mark: Mark }) {
    return (
        <div className="flex flex-wrap items-end gap-6">
            <div className="flex items-end gap-4 text-foreground">
                <Glyph mark={mark} className="size-4" />
                <Glyph mark={mark} className="size-8" />
                <Glyph mark={mark} className="size-16" />
            </div>
            <div className="flex items-end gap-4">
                <Tile mark={mark} size="size-5 rounded-sm" glyph="size-3.5" />
                <Tile mark={mark} size="size-8" glyph="size-5" />
                <Tile mark={mark} size="size-16 rounded-lg" glyph="size-10" />
            </div>
        </div>
    )
}

/** The head of a sidebar, where the mark sits beside the library's name. */
function SidebarHead({ mark }: { mark: Mark }) {
    return (
        <div className="flex h-12 w-60 items-center gap-2.5 rounded-md border border-border bg-sidebar px-3 text-sidebar-foreground">
            <Tile mark={mark} size="size-7" glyph="size-4.5" />
            <span className="text-sm font-semibold">sokkel-ui</span>
        </div>
    )
}

function MarkCard({ mark, index }: { mark: Mark; index: number }) {
    return (
        <figure className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
            <figcaption className="flex items-start gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-medium">
                    {index + 1}
                </span>
                <span className="min-w-0 text-sm">
                    <span className="font-medium">{mark.name}</span>
                    <span className="block text-xs text-muted-foreground">{mark.idea}</span>
                </span>
            </figcaption>
            <Sizes mark={mark} />
            <SidebarHead mark={mark} />
        </figure>
    )
}

/** Every mark side by side, plain and on the tile, at 16, 32 and 64 pixels, and in a sidebar head. */
export const Marks: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="grid gap-6 md:grid-cols-2">
                {MARKS.map((mark, index) => (
                    <MarkCard key={mark.id} mark={mark} index={index} />
                ))}
            </div>
        </div>
    ),
}
