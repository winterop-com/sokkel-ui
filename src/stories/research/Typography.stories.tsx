import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Segmented } from '../../components/Segmented'
import { cn } from '../../lib/cn'

/**
 * Typography and contrast, to pick from. Each option is the kitchen sink in dark, with the option's
 * token values laid over the current ones; nothing here changes the library until one is picked.
 *
 * What the review measured in the token sources and the font files: IBM Plex Sans and Plex Mono
 * share an x-height (0.516 em), so mono is no taller than sans; it reads larger because each glyph
 * is 0.600 em wide against the sans's 0.533 average. The dark theme's main text is fine; secondary
 * and faint text, borders, and the card's step off the background are dim, and the table headers
 * are small, uppercase and muted.
 */
const meta: Meta = { title: 'Research/Typography', tags: ['no-screenshot'] }
export default meta

const LIFT = `
html.dark {
    --muted-foreground: oklch(0.72 0.015 255);
    --faint: oklch(0.65 0.015 255);
    --border: oklch(0.34 0.015 255);
    --sidebar-border: oklch(0.34 0.015 255);
    --border-strong: oklch(0.40 0.018 255);
    --input: oklch(0.42 0.02 255);
    --card: oklch(0.21 0.015 255);
    --popover: oklch(0.235 0.017 255);
}`

const HEADS = `
:root, html.dark {
    --table-head-size: 0.8125rem;
    --table-head-transform: none;
    --table-head-tracking: 0em;
}`

const SMALLER_MONO = `.font-mono, code, pre { font-size: 0.9333em !important; } pre code { font-size: 1em !important; }`

interface Option {
    id: string
    label: string
    what: string
    css: string
    /** The typeface, as the Storybook toolbar names it, so the frame loads its fonts as the toolbar does. */
    typeface?: 'geist' | 'inter'
}

const OPTIONS: Option[] = [
    { id: 'current', label: 'Today', what: 'IBM Plex Sans and Plex Mono, the current dark colors, uppercase 11px table heads.', css: '' },
    {
        id: 'lift',
        label: 'Lifted contrast',
        what: 'Secondary text 0.62 to 0.72 lightness, faint 0.55 to 0.65, borders and inputs a step lighter, cards 0.195 to 0.21, popovers above cards.',
        css: LIFT,
    },
    {
        id: 'lift-heads',
        label: 'Lifted, plain table heads',
        what: 'Lifted contrast, and table heads at 13px in normal case without tracking.',
        css: LIFT + HEADS,
    },
    {
        id: 'geist',
        label: 'Geist and Geist Mono',
        what: 'Lifted contrast and plain heads, in Geist with Geist Mono: a matched pair, x-height 0.530 for both.',
        css: LIFT + HEADS,
        typeface: 'geist',
    },
    {
        id: 'inter',
        label: 'Inter and JetBrains Mono',
        what: 'Lifted contrast and plain heads, in Inter with JetBrains Mono: x-heights 0.546 and 0.550, close enough to need no size correction.',
        css: LIFT + HEADS,
        typeface: 'inter',
    },
    {
        id: 'smaller-mono',
        label: 'Plex, mono one step smaller',
        what: 'Lifted contrast and plain heads, with mono at 14px beside 15px sans, to judge by eye against the measured advice to keep them equal.',
        css: LIFT + HEADS + SMALLER_MONO,
    },
]

const SINK = 'iframe.html?id=themes-kitchen-sink--kitchen-sink&viewMode=story&globals=theme:dark;motion:off'

/** The kitchen sink in a frame, with the option's tokens laid on once it has loaded. */
function Frame({ option, scale = 1, height = 900 }: { option: Option; scale?: number; height?: number }) {
    return (
        <div className="overflow-hidden rounded-lg border border-border-strong" style={{ width: 1440 * scale, height: height * scale }}>
            <iframe
                title={option.label}
                src={option.typeface === undefined ? SINK : `${SINK};typeface:${option.typeface}`}
                className="origin-top-left border-0"
                style={{ width: 1440, height, transform: `scale(${String(scale)})` }}
                onLoad={(event) => {
                    const doc = event.currentTarget.contentDocument
                    if (doc === null || option.css === '') return
                    const style = doc.createElement('style')
                    style.setAttribute('data-research', option.id)
                    style.textContent = option.css
                    doc.head.append(style)
                }}
            />
        </div>
    )
}

function Caption({ option, index }: { option: Option; index: number }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-medium text-primary-foreground">
                {index + 1}
            </span>
            <span className="min-w-0 text-sm">
                <span className="font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.what}</span>
            </span>
        </div>
    )
}

/** Every option at a glance, two to a row. */
function SideBySide() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(41rem,1fr))] gap-x-8 gap-y-8">
                {OPTIONS.map((option, index) => (
                    <figure key={option.id} className="flex flex-col gap-2.5">
                        <Caption option={option} index={index} />
                        <Frame option={option} scale={0.45} />
                    </figure>
                ))}
            </div>
        </div>
    )
}

/** One option at full size, with a switch to flip between them in place. */
function OneAtATime({ start = 'current' }: { start?: string }) {
    const [chosen, setChosen] = useState(start)
    const option = OPTIONS.find((one) => one.id === chosen) ?? OPTIONS[0]
    const index = OPTIONS.indexOf(option)
    return (
        <div className="flex min-h-svh flex-col gap-3 bg-background p-4 text-foreground">
            <div className="flex flex-wrap items-center gap-3">
                <Segmented
                    label="Option"
                    value={chosen}
                    onChoose={setChosen}
                    options={OPTIONS.map((one, at) => ({ value: one.id, label: `${String(at + 1)}. ${one.label}` }))}
                />
            </div>
            <Caption option={option} index={index} />
            <div className={cn('min-w-0 overflow-auto')}>
                <Frame key={option.id} option={option} />
            </div>
        </div>
    )
}

export const Compare: StoryObj = { name: 'All options side by side', render: () => <SideBySide /> }

export const Flip: StoryObj = { name: 'One at a time', render: () => <OneAtATime /> }
