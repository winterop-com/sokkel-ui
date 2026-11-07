import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Progress, ProgressLabel, ProgressValue } from '@winterop-com/sokkel-ui/primitives/progress'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Skeleton } from '@winterop-com/sokkel-ui/primitives/skeleton'

import type { ThemeOption, ThemeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { fromGlobals, THEMES, toGlobals } from './themes'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * Every theme the toolbar offers, side by side: each tile is the same small sample of Tidevann in
 * that theme, dark and light. A theme answers on the whole document, so each half of a tile is its
 * own frame of the Gallery tile story with the theme in its globals; the density, corners and typeface
 * follow the toolbar. Pressing a half opens the kitchen sink in that theme and scheme. Each half
 * shows a placeholder until its theme has drawn, and a bar under the title counts them.
 */
// Drawing every theme in its frames takes a while; the screenshot suite gives a story tagged slow more time.
const meta: Meta = { title: 'Themes/All themes', tags: ['slow'] }
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
    const [ready, setReady] = useState(false)
    useEffect(() => {
        let done = false
        const timer = window.setInterval(() => {
            if (done || frame.current === null || !drawn(frame.current)) return
            done = true
            window.clearInterval(timer)
            // Two frames more, so the chart's first paint has landed.
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    setReady(true)
                    onDrawn()
                }),
            )
        }, 100)
        return () => window.clearInterval(timer)
    }, [onDrawn])
    const globals = toGlobals(settings)
    return (
        <a
            href={`./?path=/story/themes-kitchen-sink--kitchen-sink&globals=${globals}`}
            target="_top"
            aria-label={label}
            className="group relative block h-[33rem] overflow-hidden rounded-surface border border-border-strong outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
        >
            <iframe
                ref={frame}
                title={label}
                tabIndex={-1}
                src={`iframe.html?id=themes-gallery-tile--gallery-tile&viewMode=story&globals=${globals}`}
                className={cn('pointer-events-none size-full border-0', !ready && 'invisible')}
            />
            {!ready && (
                <Stack aria-hidden className="absolute inset-0 bg-card p-4">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-8 w-3/5" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-24 w-full" />
                </Stack>
            )}
        </a>
    )
}

function Tile({ theme, base, onDrawn }: { theme: ThemeOption; base: ThemeSettings; onDrawn: () => void }) {
    return (
        <Stack as="section" gap="sm">
            <Row as="header" align="baseline">
                <h2 className="text-sm font-medium">{theme.label}</h2>
                <span className="font-mono text-xs text-muted-foreground">{theme.value}</span>
                {theme.note !== undefined && <span className="ml-auto truncate text-xs text-muted-foreground">{theme.note}</span>}
            </Row>
            <Columns gap="sm">
                {SCHEMES.map((scheme) => (
                    <Frame
                        key={scheme}
                        settings={{ ...base, theme: theme.value, scheme }}
                        label={`Open the kitchen sink in ${theme.label} (${theme.value}), ${scheme}`}
                        onDrawn={onDrawn}
                    />
                ))}
            </Columns>
        </Stack>
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
    const done = count >= total || patience
    return (
        // Settling while frames draw; the screenshot suite waits for it to end.
        <div className="relative min-h-svh bg-background p-4 text-foreground md:p-6" data-settling={done ? undefined : ''}>
            <Stack gap="xl" className="mx-auto max-w-[1800px]">
                <Stack gap="2xs">
                    <PageHeader
                        title="Themes"
                        description={`${String(THEMES.length)} themes, dark and light. Press a sample to open the kitchen sink in it.`}
                    />
                    {!done && (
                        <Progress value={Math.round((count / total) * 100)} className="mt-2 max-w-md">
                            <ProgressLabel className="font-normal text-muted-foreground">Drawing the themes</ProgressLabel>
                            <ProgressValue className="text-xs">{() => `${String(count)} of ${String(total)} drawn`}</ProgressValue>
                        </Progress>
                    )}
                </Stack>
                <Columns count={2} min="xl" gap="xl" rowGap="2xl">
                    {THEMES.map((theme) => (
                        <Tile key={theme.value} theme={theme} base={base} onDrawn={onDrawn} />
                    ))}
                </Columns>
            </Stack>
        </div>
    )
}

function Gallery({ globals }: { globals: Record<string, unknown> }) {
    const base = fromGlobals(globals)
    const { density, corners, typeface } = base
    // The frames load again when the toolbar's density, corners or typeface change.
    return <Grid key={`${density}|${corners}|${typeface}`} base={base} />
}

/** Every theme in both schemes. */
export const AllThemes: StoryObj = {
    name: 'All themes',
    render: (_args, context) => <Gallery globals={context.globals} />,
}
