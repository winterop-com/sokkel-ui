import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { ThemeOption, ThemeSettings } from '../../components/ThemePicker'
import { fromGlobals, THEMES, toGlobals } from './themes'

/**
 * Every theme the toolbar offers, side by side: each tile is the same small sample of Tidevann in
 * that theme, dark and light. A theme answers on the whole document, so each half of a tile is its
 * own frame of the Sample story with the theme in its globals; the density, corners and typeface
 * follow the toolbar. Pressing a half opens the kitchen sink in that theme and scheme.
 */
const meta: Meta = { title: 'Themes/Gallery' }
export default meta

const SCHEMES = ['dark', 'light'] as const

/** Gives up waiting for the frames after this long, and shows what has drawn. */
const PATIENCE = 60_000

/** Whether a frame's sample has drawn: its story rendered, its chart painted and its fonts loaded. */
function drawn(frame: HTMLIFrameElement): boolean {
    const doc = frame.contentDocument
    return doc !== null && doc.fonts.status === 'loaded' && doc.querySelector('#storybook-root canvas') !== null
}

function Frame({ settings, label, onDrawn }: { settings: ThemeSettings; label: string; onDrawn: () => void }) {
    const frame = useRef<HTMLIFrameElement>(null)
    useEffect(() => {
        let done = false
        const timer = window.setInterval(() => {
            if (done || frame.current === null || !drawn(frame.current)) return
            done = true
            window.clearInterval(timer)
            // Two frames more, so the chart's first paint has landed.
            requestAnimationFrame(() => requestAnimationFrame(onDrawn))
        }, 100)
        return () => window.clearInterval(timer)
    }, [onDrawn])
    const globals = toGlobals(settings)
    return (
        <a
            href={`./?path=/story/themes-kitchen-sink--kitchen-sink&globals=${globals}`}
            target="_top"
            aria-label={label}
            className="group relative block h-[31rem] overflow-hidden rounded-surface border border-border-strong outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
        >
            <iframe
                ref={frame}
                title={label}
                tabIndex={-1}
                src={`iframe.html?id=themes-sample--sample&viewMode=story&globals=${globals}`}
                className="pointer-events-none size-full border-0"
            />
        </a>
    )
}

function Tile({ theme, base, onDrawn }: { theme: ThemeOption; base: ThemeSettings; onDrawn: () => void }) {
    return (
        <section className="flex min-w-0 flex-col gap-2">
            <header className="flex items-baseline gap-2">
                <h2 className="text-sm font-medium">{theme.label}</h2>
                <span className="font-mono text-xs text-muted-foreground">{theme.value}</span>
                {theme.note !== undefined && <span className="ml-auto truncate text-xs text-muted-foreground">{theme.note}</span>}
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
                {SCHEMES.map((scheme) => (
                    <Frame
                        key={scheme}
                        settings={{ ...base, theme: theme.value, scheme }}
                        label={`Open the kitchen sink in ${theme.label} (${theme.value}), ${scheme}`}
                        onDrawn={onDrawn}
                    />
                ))}
            </div>
        </section>
    )
}

function Grid({ base }: { base: ThemeSettings }) {
    const total = THEMES.length * SCHEMES.length
    const [count, setCount] = useState(0)
    const [patience, setPatience] = useState(false)
    const onDrawn = useMemo(() => () => setCount((n) => n + 1), [])
    useEffect(() => {
        const timer = window.setTimeout(() => setPatience(true), PATIENCE)
        return () => window.clearTimeout(timer)
    }, [])
    const shown = count >= total || patience
    return (
        // Hidden until every frame has drawn, so the gallery appears at once rather than tile by tile.
        <div className="relative min-h-svh bg-background p-4 text-foreground md:p-6" style={{ visibility: shown ? 'visible' : 'hidden' }}>
            {!shown && (
                <p className="absolute top-6 left-6 text-sm text-muted-foreground" style={{ visibility: 'visible' }}>
                    Drawing {total - count} of {total} samples
                </p>
            )}
            <div className="mx-auto flex max-w-[1800px] flex-col gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-page font-medium tracking-tight">Themes</h1>
                    <p className="text-sm text-muted-foreground">
                        {THEMES.length} themes, dark and light. Press a sample to open the kitchen sink in it.
                    </p>
                </div>
                <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
                    {THEMES.map((theme) => (
                        <Tile key={theme.value} theme={theme} base={base} onDrawn={onDrawn} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function AllThemes({ globals }: { globals: Record<string, unknown> }) {
    const base = fromGlobals(globals)
    const { density, corners, typeface } = base
    // The frames load again when the toolbar's density, corners or typeface change.
    return <Grid key={`${density}|${corners}|${typeface}`} base={base} />
}

/** Every theme in both schemes. */
export const Gallery: StoryObj = {
    name: 'Gallery',
    render: (_args, context) => <AllThemes globals={context.globals} />,
}
