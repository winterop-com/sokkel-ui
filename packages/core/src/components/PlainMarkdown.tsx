import { memo } from 'react'

import { MarkdownView, type MarkdownProps } from './markdown-view'

export type PlainMarkdownProps = Omit<MarkdownProps, 'math'>

/**
 * `Markdown` without its two engines: everything it draws (code, callouts, tables, parts, links,
 * tags, anchors), but math stays text and a `mermaid` fence is shown as code. It names neither
 * KaTeX nor Mermaid, so an app that renders only this carries none of them, nor cytoscape or elk,
 * in its build, not even as chunks it never fetches. Use `Markdown` where formulas or diagrams are
 * drawn.
 */
export const PlainMarkdown = memo(function PlainMarkdown(props: PlainMarkdownProps) {
    return <MarkdownView {...props} math={false} />
})
