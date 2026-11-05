import type { Meta, StoryObj } from '@storybook/react-vite'
import { type RefObject, useRef, useState } from 'react'

import { Segmented } from '../../components/Segmented'

/**
 * Typefaces, to pick from. Plex Sans and Plex Mono are the default; each option lays its pair over
 * the kitchen sink through `--typeface-sans` and `--typeface-mono`, in the scheme the toolbar sets.
 * Nothing here changes the library until one is picked, and a pick changes the default only, since a
 * theme can already set its own faces.
 *
 * Measured x-heights: Plex Sans and Plex Mono 0.516, Geist and Geist Mono 0.530, Inter 0.546,
 * JetBrains Mono 0.550. `font-size-adjust` sets mono's x-height whichever face is chosen, and the
 * default's 0.45 (0.49 in small text) is tuned to Plex Sans, so each option sets its own: the same
 * share of its sans's x-height as the default gives Plex.
 */
const meta: Meta = { title: 'Research/Typography', tags: ['no-screenshot'] }
export default meta

const PLEX_SANS = "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
const PLEX_MONO = "'IBM Plex Mono', ui-monospace, monospace"
const JETBRAINS_MONO = "'JetBrains Mono Variable', ui-monospace, monospace"

/** The default's mono x-heights over Plex Sans's 0.516: about 87 percent at body size, 95 in small text. */
const MONO_SHARE = 0.45 / 0.516
const MONO_SHARE_SMALL = 0.49 / 0.516

interface Option {
    id: string
    label: string
    /** The label in the pair menu, where four must fit in half the width. */
    short: string
    what: string
    sans: string
    mono: string
    /** The sans's x-height, which mono's is set from. */
    sansX: number
}

/** The custom properties an option sets: its faces and mono's x-height beside its sans. */
function propsOf(option: Option): Record<string, string> {
    return {
        '--typeface-sans': option.sans,
        '--typeface-mono': option.mono,
        '--mono-x-height': (option.sansX * MONO_SHARE).toFixed(3),
        '--mono-x-height-small': (option.sansX * MONO_SHARE_SMALL).toFixed(3),
    }
}

const OPTIONS: Option[] = [
    {
        id: 'plex',
        label: 'Plex Sans and Plex Mono',
        short: 'Plex',
        what: 'The default today: one family, x-height 0.516 for both.',
        sans: PLEX_SANS,
        mono: PLEX_MONO,
        sansX: 0.516,
    },
    {
        id: 'geist',
        label: 'Geist and Geist Mono',
        short: 'Geist',
        what: 'A family matched like Plex, x-height 0.530 for both; tighter and rounder.',
        sans: "'Geist Variable', system-ui, sans-serif",
        mono: "'Geist Mono Variable', ui-monospace, monospace",
        sansX: 0.53,
    },
    {
        id: 'inter',
        label: 'Inter and JetBrains Mono',
        short: 'Inter + JetBrains',
        what: 'x-heights 0.546 and 0.550, so mono needs almost no correction; the largest-looking pair.',
        sans: "'Inter Variable', system-ui, sans-serif",
        mono: JETBRAINS_MONO,
        sansX: 0.546,
    },
    {
        id: 'plex-jetbrains',
        label: 'Plex Sans and JetBrains Mono',
        short: 'Plex + JetBrains',
        what: 'Today’s sans with a taller, narrower mono: 0.516 beside 0.550.',
        sans: PLEX_SANS,
        mono: JETBRAINS_MONO,
        sansX: 0.516,
    },
]

type Scheme = 'dark' | 'light'

const schemeOf = (globals: Record<string, unknown>): Scheme => (globals.theme === 'light' ? 'light' : 'dark')

const SINK = 'iframe.html?id=themes-kitchen-sink--kitchen-sink&viewMode=story&globals=motion:off'

/** The kitchen sink in a frame, with the option's typefaces laid on once it has loaded. */
function Frame({
    option,
    scheme,
    scale = 1,
    height = 900,
    bare = false,
}: {
    option: Option
    scheme: Scheme
    scale?: number
    height?: number
    /** Without its own border, inside a pane that has one. */
    bare?: boolean
}) {
    return (
        <div
            className={bare ? 'overflow-hidden' : 'overflow-hidden rounded-lg border border-border-strong'}
            style={{ width: 1440 * scale, height: height * scale }}
        >
            <iframe
                title={option.label}
                src={`${SINK};theme:${scheme}`}
                className="origin-top-left border-0"
                style={{ width: 1440, height, transform: `scale(${String(scale)})` }}
                onLoad={(event) => {
                    // A stylesheet, since the toolbar's typeface decorator clears inline values on each render.
                    const doc = event.currentTarget.contentDocument
                    if (doc === null) return
                    const style = doc.createElement('style')
                    style.setAttribute('data-research', option.id)
                    const props = Object.entries(propsOf(option)).map(([name, value]) => `${name}: ${value} !important;`)
                    style.textContent = `:root { ${props.join(' ')} }`
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

const RUNS = [
    { job: 'nightly-export', id: 'run_8f3a21', state: 'succeeded', took: '4m 12s' },
    { job: 'sync-inventory', id: 'run_8f3a1c', state: 'failed', took: '0m 48s' },
    { job: 'rebuild-index', id: 'run_8f3a07', state: 'running', took: '12m 03s' },
]

/** One pair set at the sizes the components use, at real size. */
function Specimen({ option, index }: { option: Option; index: number }) {
    return (
        <figure className="flex min-w-0 flex-col gap-2.5">
            <Caption option={option} index={index} />
            <div
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground"
                style={{ ...propsOf(option), fontFamily: 'var(--typeface-sans)' }}
            >
                <div className="flex flex-col gap-1">
                    <span className="text-2xl font-semibold tracking-tight">Runs in harbor</span>
                    <span className="text-sm text-muted-foreground">Every run of the last day, newest first. Owned by ada and grace.</span>
                </div>
                <p className="text-sm">
                    The job <code className="rounded bg-muted px-1 py-0.5">nightly-export</code> runs at 02:00 on the{' '}
                    <code className="rounded bg-muted px-1 py-0.5">worker</code> service, then the{' '}
                    <code className="rounded bg-muted px-1 py-0.5">notify</code> step posts to https://hooks.example.org.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border text-left text-[0.8125rem] font-semibold text-muted-foreground">
                                <th className="py-1.5 pr-3 font-semibold">Job</th>
                                <th className="py-1.5 pr-3 font-semibold">Run</th>
                                <th className="py-1.5 pr-3 font-semibold">State</th>
                                <th className="py-1.5 text-right font-semibold">Took</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RUNS.map((run) => (
                                <tr key={run.id} className="border-b border-border last:border-0">
                                    <td className="py-1.5 pr-3 font-medium">{run.job}</td>
                                    <td className="py-1.5 pr-3 font-mono text-muted-foreground">{run.id}</td>
                                    <td className="py-1.5 pr-3">{run.state}</td>
                                    <td className="py-1.5 text-right font-mono tabular-nums">{run.took}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-sm leading-relaxed">
                    {`steps:\n  - fetch:     { source: api }\n  - transform: { rows: 18_204 }\n  - upload:    { to: s3://example.org/larkspur }`}
                </pre>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Updated 2 minutes ago</span>
                    <span className="font-mono">scheduler@3.4.1</span>
                    <span className="font-mono">0O 1lI 5S 8B</span>
                </div>
            </div>
        </figure>
    )
}

/** Each pair set as text at real size, side by side, to judge the faces up close. */
function SpecimenGrid() {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="grid gap-6 md:grid-cols-2">
                {OPTIONS.map((option, index) => (
                    <Specimen key={option.id} option={option} index={index} />
                ))}
            </div>
        </div>
    )
}

/** The height the kitchen sink is drawn at in a pane, so its own page never scrolls and the pane does. */
const PANE_HEIGHT = 2000

/** One half of the comparison: a pair to choose, and the kitchen sink at real size in it. */
function Pane({
    chosen,
    onChoose,
    scheme,
    pane,
    onScroll,
}: {
    chosen: string
    onChoose: (id: string) => void
    scheme: Scheme
    pane: RefObject<HTMLDivElement | null>
    onScroll: () => void
}) {
    const option = OPTIONS.find((one) => one.id === chosen) ?? OPTIONS[0]
    return (
        <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
            <Segmented
                label="Typeface"
                value={chosen}
                onChoose={onChoose}
                options={OPTIONS.map((one) => ({ value: one.id, label: one.short }))}
            />
            <Caption option={option} index={OPTIONS.indexOf(option)} />
            <div ref={pane} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto rounded-lg border border-border-strong">
                <Frame key={`${option.id}-${scheme}`} option={option} scheme={scheme} height={PANE_HEIGHT} bare />
            </div>
        </div>
    )
}

/** Two pairs over the kitchen sink at real size, side by side; scrolling one pane scrolls the other to the same spot. */
function SideBySide({ scheme }: { scheme: Scheme }) {
    const [left, setLeft] = useState('plex')
    const [right, setRight] = useState('geist')
    const leftPane = useRef<HTMLDivElement>(null)
    const rightPane = useRef<HTMLDivElement>(null)
    const follow = (from: typeof leftPane, to: typeof leftPane) => () => {
        const source = from.current
        const target = to.current
        if (source === null || target === null) return
        // Only a change moves the other pane, so the two never echo each other.
        if (target.scrollTop !== source.scrollTop) target.scrollTop = source.scrollTop
        if (target.scrollLeft !== source.scrollLeft) target.scrollLeft = source.scrollLeft
    }
    return (
        <div className="grid h-svh grid-cols-2 gap-4 bg-background p-4 text-foreground">
            <Pane chosen={left} onChoose={setLeft} scheme={scheme} pane={leftPane} onScroll={follow(leftPane, rightPane)} />
            <Pane chosen={right} onChoose={setRight} scheme={scheme} pane={rightPane} onScroll={follow(rightPane, leftPane)} />
        </div>
    )
}

/** One pair over the kitchen sink at full size, with a switch to flip between them in place. */
function OneAtATime({ scheme }: { scheme: Scheme }) {
    const [chosen, setChosen] = useState(OPTIONS[0].id)
    const option = OPTIONS.find((one) => one.id === chosen) ?? OPTIONS[0]
    const index = OPTIONS.indexOf(option)
    return (
        <div className="flex min-h-svh flex-col gap-3 bg-background p-4 text-foreground">
            <Segmented
                label="Typeface"
                value={chosen}
                onChoose={setChosen}
                options={OPTIONS.map((one, at) => ({ value: one.id, label: `${String(at + 1)}. ${one.label}` }))}
            />
            <Caption option={option} index={index} />
            <div className="min-w-0 overflow-auto">
                <Frame key={`${option.id}-${scheme}`} option={option} scheme={scheme} />
            </div>
        </div>
    )
}

/** Each pair as text at real size: a heading, prose with inline code, a table, a block of code. */
export const Specimens: StoryObj = { name: 'Specimens', render: () => <SpecimenGrid /> }

/** Two pairs over the kitchen sink at real size, scrolled together, in the toolbar's scheme. */
export const Compare: StoryObj = { name: 'Side by side', render: (_, { globals }) => <SideBySide scheme={schemeOf(globals)} /> }

/** One pair over the kitchen sink at full size. */
export const Flip: StoryObj = { name: 'One at a time', render: (_, { globals }) => <OneAtATime scheme={schemeOf(globals)} /> }
