import { memo } from 'react'

import { MarkdownView, type MarkdownProps } from './markdown-view'

export { loadHtml } from './markdown-view'

export type PlainMarkdownProps = Omit<MarkdownProps, 'math'>

/**
 * `Markdown` without its two engines: everything it draws (code, callouts, tables, parts, links,
 * tags, anchors), but math stays text and a `mermaid` fence is shown as code. It names neither
 * KaTeX nor Mermaid, so an app that renders only this carries none of them, nor cytoscape or elk,
 * in its build, not even as chunks it never fetches. Use `Markdown` where formulas or diagrams are
 * drawn.
 *
 * It suits text other people wrote, such as a description from a server: `images={false}` fetches
 * no image, `linkSchemes={['https', 'mailto']}` keeps only those links live, `headingOffset` sets
 * the text's headings under the page's own, and `inline` draws one line of help. Raw HTML is shown
 * as typed unless `allowHtml` is set, and what reads it loads only then.
 */
export const PlainMarkdown = memo(function PlainMarkdown(props: PlainMarkdownProps) {
    return <MarkdownView {...props} math={false} />
})
