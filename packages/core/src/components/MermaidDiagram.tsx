import { Code2, Image } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { cssPixels } from '../lib/css-pixels'
import { CopyButton } from './CopyButton'
import { useWindowedPane, WindowedPane, WindowedPaneButton } from './WindowedPane'

let count = 0

/** A key that changes whenever the document's scheme, theme or inline token overrides change. */
function useLook(): string {
    const read = () => {
        const root = document.documentElement
        return `${root.className}|${root.getAttribute('data-theme') ?? ''}|${root.getAttribute('style') ?? ''}`
    }
    const [look, setLook] = useState(read)
    useEffect(() => {
        const observer = new MutationObserver(() => setLook(read()))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
        return () => observer.disconnect()
    }, [])
    return look
}

/** A token's color as hex, read back from a painted pixel, since mermaid takes no other form. */
function tokenHex(name: string, probe: HTMLElement, context: CanvasRenderingContext2D): string {
    probe.style.color = `var(--${name})`
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = getComputedStyle(probe).color
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Mermaid's theme variables from the tokens and typeface where the diagram sits, so a theme or face
 * scoped to an element around it reaches it too. Its text is small text, `--text-xs`, in pixels.
 */
function themeVariables(host: HTMLElement): Record<string, string> {
    const probe = document.createElement('span')
    probe.hidden = true
    host.append(probe)
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    try {
        if (context === null) return {}
        const hex = (name: string) => tokenHex(name, probe, context)
        probe.style.fontFamily = 'var(--font-sans)'
        probe.style.fontSize = 'var(--text-xs)'
        const face = getComputedStyle(probe)
        return {
            fontFamily: face.fontFamily,
            fontSize: face.fontSize,
            background: hex('card'),
            primaryColor: hex('secondary'),
            primaryTextColor: hex('foreground'),
            primaryBorderColor: hex('border-strong'),
            secondaryColor: hex('muted'),
            secondaryTextColor: hex('foreground'),
            secondaryBorderColor: hex('border-strong'),
            tertiaryColor: hex('card'),
            tertiaryTextColor: hex('foreground'),
            tertiaryBorderColor: hex('border'),
            lineColor: hex('muted-foreground'),
            textColor: hex('foreground'),
            mainBkg: hex('secondary'),
            nodeBorder: hex('border-strong'),
            clusterBkg: hex('muted'),
            clusterBorder: hex('border'),
            edgeLabelBackground: hex('card'),
            titleColor: hex('foreground'),
            noteBkgColor: hex('muted'),
            noteTextColor: hex('foreground'),
            noteBorderColor: hex('border-strong'),
            actorBkg: hex('secondary'),
            actorBorder: hex('border-strong'),
            actorTextColor: hex('foreground'),
            signalColor: hex('muted-foreground'),
            signalTextColor: hex('foreground'),
        }
    } finally {
        probe.remove()
    }
}

/** A drawn diagram: its SVG and the least width it is shown at, in pixels. */
interface Drawn {
    svg: string
    least: number
}

/**
 * Draws the diagram. Its labels are `--text-xs`; it may shrink to fit its box until they are
 * `--text-2xs`, the smallest text the tokens have, and no further, so `least` is its own width at
 * that scale.
 */
async function render(code: string, host: HTMLElement): Promise<Drawn> {
    const mermaid = (await import('mermaid')).default
    const radius = getComputedStyle(host).getPropertyValue('--radius').trim() || '4px'
    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: themeVariables(host),
        themeCSS: `.node rect, .node polygon, .node circle, .cluster rect { filter: none !important; } .node rect, .cluster rect { rx: ${radius}; ry: ${radius}; }`,
        securityLevel: 'strict',
        suppressErrorRendering: true,
    })
    // Parsing first refuses bad source before mermaid draws its own error graphic into the page.
    await mermaid.parse(code)
    count += 1
    const { svg } = await mermaid.render(`winterop-mermaid-${count}`, code)
    const width = Number(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/.exec(svg)?.[1] ?? 0)
    const scale = cssPixels('var(--text-2xs)', 11, host) / cssPixels('var(--text-xs)', 13, host)
    return { svg, least: Math.round(width * Math.min(1, scale)) }
}

export interface MermaidDiagramWords {
    source: string
    diagram: string
    failed: string
    /** The expand button's label. */
    expand: string
    /** The window's close button's label. */
    close: string
    /** Said in the diagram's place while it is open in the window. */
    away: string
}

export const MERMAID_DIAGRAM_WORDS: MermaidDiagramWords = {
    source: 'Source',
    diagram: 'Diagram',
    failed: 'This diagram does not parse; its source is shown.',
    expand: 'Expand',
    close: 'Close',
    away: 'Shown in a window.',
}

/**
 * A mermaid diagram, drawn in the current theme's colors and typeface and redrawn when the scheme,
 * the theme or a token override changes. Its source shows
 * while the diagram loads, while it is still streaming, and when it does not parse; a toggle flips
 * between the two. Mermaid loads the first time a diagram is drawn.
 *
 * A diagram shrinks to fit its box only until its labels reach the smallest text size, then keeps
 * that size and scrolls sideways, so a wide diagram in a narrow box stays readable. An expand
 * button beside the toggle opens the diagram near full screen through `WindowedPane`, drawn as
 * large as the window allows; Escape or the close button brings it back.
 */
export function MermaidDiagram({
    code,
    streaming = false,
    title,
    defaultExpanded = false,
    words: given,
}: {
    code: string
    streaming?: boolean
    /** The window's title when the diagram is expanded; `Diagram` by default. */
    title?: ReactNode
    /** Opens the diagram in the window at first. */
    defaultExpanded?: boolean
    words?: Partial<MermaidDiagramWords>
}) {
    const words = { ...MERMAID_DIAGRAM_WORDS, ...given }
    const look = useLook()
    const host = useRef<HTMLDivElement>(null)
    const [drawn, setDrawn] = useState<Drawn | null>(null)
    const [failed, setFailed] = useState(false)
    const [source, setSource] = useState(false)

    useEffect(() => {
        if (streaming || host.current === null) return
        let cancelled = false
        render(code, host.current).then(
            (out) => {
                if (cancelled) return
                setFailed(false)
                setDrawn(out)
            },
            () => {
                if (cancelled) return
                setFailed(true)
                setDrawn(null)
            },
        )
        return () => {
            cancelled = true
        }
    }, [code, look, streaming])

    return (
        <div ref={host} className="min-w-0">
            <WindowedPane
                title={title ?? words.diagram}
                button="none"
                defaultOpen={defaultExpanded}
                words={{ expand: words.expand, close: words.close, away: words.away }}
            >
                <Diagram
                    code={code}
                    drawn={drawn}
                    failed={failed}
                    streaming={streaming}
                    source={source}
                    setSource={setSource}
                    words={words}
                />
            </WindowedPane>
        </div>
    )
}

/** The diagram's box, in its place or filling the window. */
function Diagram({
    code,
    drawn,
    failed,
    streaming,
    source,
    setSource,
    words,
}: {
    code: string
    drawn: Drawn | null
    failed: boolean
    streaming: boolean
    source: boolean
    setSource: (source: boolean) => void
    words: MermaidDiagramWords
}) {
    const windowed = useWindowedPane()?.windowed === true
    const asSource = streaming || failed || source || drawn === null
    return (
        <div
            className={cn(
                'group/mermaid relative overflow-hidden rounded-lg border border-input dark:bg-input/30',
                windowed && 'flex min-h-0 flex-1 flex-col',
            )}
        >
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-focus-within/mermaid:opacity-100 group-hover/mermaid:opacity-100 pointer-coarse:opacity-100">
                {!failed && !streaming && drawn !== null && (
                    <button
                        type="button"
                        onClick={() => setSource(!source)}
                        className="inline-flex h-6 items-center gap-1 rounded-md bg-background px-2 text-xs text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground"
                    >
                        {source ? <Image className="size-3.5" aria-hidden /> : <Code2 className="size-3.5" aria-hidden />}
                        {source ? words.diagram : words.source}
                    </button>
                )}
                <CopyButton value={code} size="icon-xs" className="bg-background ring-1 ring-foreground/10" />
                {!streaming && <WindowedPaneButton className="bg-background ring-1 ring-foreground/10" />}
            </div>
            {failed && <p className="px-3 pt-3 text-xs text-muted-foreground">{words.failed}</p>}
            {asSource ? (
                <pre className={cn('overflow-x-auto p-3 font-mono text-sm leading-relaxed', windowed && 'flex-1')}>
                    <code>{code}</code>
                </pre>
            ) : (
                <div
                    className={cn(
                        'flex justify-center-safe overflow-x-auto p-4 [&_svg]:max-w-full [&_svg]:min-w-(--diagram-least)',
                        windowed && 'min-h-0 flex-1 items-center [&_svg]:size-full [&_svg]:max-w-none!',
                    )}
                    style={{ '--diagram-least': `${String(drawn.least)}px` } as CSSProperties}
                    // The SVG comes from mermaid run with `securityLevel: 'strict'`.
                    dangerouslySetInnerHTML={{ __html: drawn.svg }}
                />
            )}
        </div>
    )
}
