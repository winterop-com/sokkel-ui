import { Fragment } from 'react'

/**
 * A sentence whose machine parts are marked with backticks, drawn with those parts in the code
 * face: "Set `base_url` in the service" shows `base_url` in mono. A server's own diagnostics
 * arrive written that way.
 */
export function ProseText({ text, className }: { text: string; className?: string }) {
    const parts = text.split('`')
    // An odd count of backticks leaves the last one unmatched; it is drawn as written.
    const closed = parts.length % 2 === 1
    return (
        <span className={className ?? 'break-words'}>
            {parts.map((part, index) => {
                const code = index % 2 === 1 && (closed || index < parts.length - 1)
                if (code) {
                    return (
                        <code key={index} className="rounded-sm bg-muted px-1 font-mono">
                            {part}
                        </code>
                    )
                }
                const unmatched = !closed && index === parts.length - 1 && index % 2 === 1
                return <Fragment key={index}>{unmatched ? `\`${part}` : part}</Fragment>
            })}
        </span>
    )
}
