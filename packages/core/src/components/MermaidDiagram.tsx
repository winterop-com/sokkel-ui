import { Code2, Image } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CopyButton } from './CopyButton'

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

/** Mermaid's theme variables from the current theme's tokens and typeface. */
function themeVariables(): Record<string, string> {
    const probe = document.createElement('span')
    document.body.append(probe)
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    try {
        if (context === null) return {}
        const hex = (name: string) => tokenHex(name, probe, context)
        const root = getComputedStyle(document.documentElement)
        return {
            fontFamily: root.getPropertyValue('--typeface-sans').trim(),
            fontSize: '13px',
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

async function render(code: string): Promise<string> {
    const mermaid = (await import('mermaid')).default
    const radius = getComputedStyle(document.documentElement).getPropertyValue('--radius').trim() || '4px'
    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: themeVariables(),
        themeCSS: `.node rect, .node polygon, .node circle, .cluster rect { filter: none !important; } .node rect, .cluster rect { rx: ${radius}; ry: ${radius}; }`,
        securityLevel: 'strict',
        suppressErrorRendering: true,
    })
    // Parsing first refuses bad source before mermaid draws its own error graphic into the page.
    await mermaid.parse(code)
    count += 1
    const { svg } = await mermaid.render(`winterop-mermaid-${count}`, code)
    return svg
}

/** The words a diagram says: its toggle's two sides, and the note when its source does not parse. */
export interface MermaidDiagramWords {
    source: string
    diagram: string
    failed: string
}

const WORDS: MermaidDiagramWords = { source: 'Source', diagram: 'Diagram', failed: 'This diagram does not parse; its source is shown.' }

/**
 * A mermaid diagram, drawn in the current theme's colors and typeface and redrawn when the scheme,
 * the theme or a token override changes. Its source shows
 * while the diagram loads, while it is still streaming, and when it does not parse; a toggle flips
 * between the two. Mermaid loads the first time a diagram is drawn.
 */
export function MermaidDiagram({
    code,
    streaming = false,
    words: given,
}: {
    code: string
    streaming?: boolean
    words?: Partial<MermaidDiagramWords>
}) {
    const words = { ...WORDS, ...given }
    const look = useLook()
    const [svg, setSvg] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)
    const [source, setSource] = useState(false)

    useEffect(() => {
        if (streaming) return
        let cancelled = false
        render(code).then(
            (out) => {
                if (cancelled) return
                setFailed(false)
                setSvg(out)
            },
            () => {
                if (cancelled) return
                setFailed(true)
                setSvg(null)
            },
        )
        return () => {
            cancelled = true
        }
    }, [code, look, streaming])

    const asSource = streaming || failed || source || svg === null
    return (
        <div className="group/mermaid relative overflow-hidden rounded-lg border border-input dark:bg-input/30">
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-focus-within/mermaid:opacity-100 group-hover/mermaid:opacity-100 pointer-coarse:opacity-100">
                {!failed && !streaming && svg !== null && (
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
            </div>
            {failed && <p className="px-3 pt-3 text-xs text-muted-foreground">{words.failed}</p>}
            {asSource ? (
                <pre className="overflow-x-auto p-3 font-mono text-sm leading-relaxed">
                    <code>{code}</code>
                </pre>
            ) : (
                <div
                    className="flex justify-center overflow-x-auto p-4 [&_svg]:max-w-full"
                    // The SVG comes from mermaid run with `securityLevel: 'strict'`.
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            )}
        </div>
    )
}
