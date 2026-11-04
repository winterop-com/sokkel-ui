import { Code2, Image } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useDark } from '../hooks/use-dark'
import { CopyButton } from './CopyButton'

let count = 0

async function render(code: string, dark: boolean): Promise<string> {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict', suppressErrorRendering: true })
    // Parsing first refuses bad source before mermaid draws its own error graphic into the page.
    await mermaid.parse(code)
    count += 1
    const { svg } = await mermaid.render(`winterop-mermaid-${count}`, code)
    return svg
}

/**
 * A mermaid diagram, drawn in the current scheme and redrawn when it changes. Its source shows
 * while the diagram loads, while it is still streaming, and when it does not parse; a toggle flips
 * between the two. Mermaid loads the first time a diagram is drawn.
 */
export function MermaidDiagram({
    code,
    streaming = false,
    words = { source: 'Source', diagram: 'Diagram', failed: 'This diagram does not parse; its source is shown.' },
}: {
    code: string
    streaming?: boolean
    words?: { source: string; diagram: string; failed: string }
}) {
    const dark = useDark()
    const [svg, setSvg] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)
    const [source, setSource] = useState(false)

    useEffect(() => {
        if (streaming) return
        let cancelled = false
        render(code, dark).then(
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
    }, [code, dark, streaming])

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
