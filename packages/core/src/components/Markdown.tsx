import { memo, useEffect, useState } from 'react'

import { MarkdownView, type MarkdownProps, type MathEngine } from './markdown-view'
import { MermaidDiagram } from './MermaidDiagram'

export { headingId, loadHtml, MARKDOWN_WORDS, markdownHeadings, markdownSection, splitFrontmatter } from './markdown-view'
export type {
    CalloutKind,
    MarkdownFrontmatter,
    MarkdownInlineCode,
    MarkdownHeading,
    MarkdownLinks,
    MarkdownParts,
    MarkdownProps,
    MarkdownTree,
    MarkdownNode,
    MarkdownUrlResolver,
    MarkdownUrlUse,
    MarkdownWords,
} from './markdown-view'

let engine: Promise<MathEngine> | undefined
let ready: MathEngine | undefined

/**
 * Loads the math engine `Markdown` draws formulas with, once, and resolves when it is ready. Markdown
 * calls it itself the first time a message holds math; an app that knows formulas are coming can call
 * it ahead, so the first one draws at once.
 */
export function loadMath(): Promise<void> {
    engine ??= import('../lib/katex').then(
        (module) => {
            ready = module
            return module
        },
        (error: unknown) => {
            engine = undefined
            throw error
        },
    )
    return engine.then(() => undefined)
}

/** The math engine once a message has needed it, loaded on the first such message and shared by the rest. */
function useMathEngine(needed: boolean): MathEngine | undefined {
    const [loaded, setLoaded] = useState<MathEngine | undefined>(ready)
    useEffect(() => {
        if (!needed || loaded !== undefined) return
        let live = true
        loadMath().then(
            () => {
                if (live) setLoaded(ready)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [needed, loaded])
    return loaded
}

/**
 * GitHub-flavored markdown, as an assistant or a description writes it: fenced code highlighted
 * with a copy button, mermaid fences drawn as diagrams, links opening in a new tab, and a quote
 * whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` drawn as
 * a callout. Raw HTML is escaped and shown as typed unless `allowHtml` is set; then it is read and
 * sanitized, with rehype-raw and rehype-sanitize loaded the first time a text allows it. While
 * `streaming`, a mermaid fence shows its source until the message completes.
 *
 * `math` (on by default) draws LaTeX with KaTeX: `$…$` and `\(…\)` inline, `$$…$$`, `\[…\]` and a
 * `math` fence on a line of their own. KaTeX loads the first time a message holds math, its
 * stylesheet with it. A single `$` is math only as Pandoc reads it (a non-space after the opening
 * one, a non-space before the closing one and no digit after it, on one line), so "costs $5 and
 * $10" stays prices; turn `math` off where every `$` is a dollar. A formula KaTeX cannot read shows
 * its source in the error color.
 *
 * `anchors` gives each heading the id `headingId` makes of its text, for a table of contents to
 * link to; `markdownHeadings` lists the same ids from the source.
 *
 * `parts` embeds an app's own parts in the text without splitting it, so headings, anchors and
 * the flow stay one document's. The text marks where each goes with an HTML comment,
 * `<!-- part:ID -->` (letters, digits, `-`, `_`, `.` and `:` in the ID), and `parts[ID]`, or
 * `parts(ID)` when it is a function, is drawn there. `partMarker` changes the word before the
 * colon, for texts written with another, such as `<!-- snippet:ID -->`. A part is drawn as a block when the marker stands on a line of its own between blank lines, inline when it
 * sits in a sentence. The marker works with `allowHtml` off, and a reader of the raw text sees
 * nothing; a marker whose ID `parts` lacks draws nothing.
 *
 * Fences are highlighted by Shiki in the `code-*` tokens: the common languages, `jq`, `ansi` output,
 * and any an app adds with `registerLanguage` from `lib/highlighter`.
 *
 * `inlineCode` picks how code inside a sentence is drawn, and `caret` marks where a streaming
 * answer's next words will land.
 *
 * `links` draws the links of linked notes: `[[Note]]` as a link to the note of that name,
 * `[[Note|words]]` showing the words, `[[Note#Heading]]` naming the heading too, each followed by
 * `onOpen`, and a link to a note `exists` says is not there drawn faint. With `onTag` each `#tag` is
 * a chip that follows the tag. Neither is read in code. `wikiLinksIn` and `tagsIn` in
 * `lib/wiki-links` read the same links and tags from the text, for backlinks and a list of tags.
 *
 * `onLink` keeps the links the app answers for in the page, such as the times in a podcast's show
 * notes, which seek the player; a press with a modifier key, or on a link it declines, opens a new tab.
 * `live={false}` draws every link as its words, a `[[link]]` as the words it shows, for a text set
 * inside something pressed as a whole, and `highlight` marks where some words stand, as a search's
 * matches are marked: a backlink's line drawn in the row that opens its note.
 *
 * For text other people wrote, `images={false}` draws each image as its alt text and address, so
 * nothing is fetched, and `linkSchemes` lists the schemes a link may have to be live, `relative`
 * standing for a path, a query or a fragment: any other link is drawn as its words, with no anchor.
 * An address starting with `//` leaves the app on the page's scheme, so it is live only without a
 * list, and a `javascript:`, `vbscript:` or `data:` link never is. `headingOffset` moves headings
 * down, so `#` in a text set under the page's own headings is no second h1, and `inline` draws only
 * the content of paragraphs, for one line of help, laying out any block as its text. A table whose
 * header cells are all empty, as a key/value table written `| | |` has, is drawn without the header.
 *
 * Linked notes are read as their vaults write them. A YAML frontmatter block at the top is left out
 * (`frontmatter="show"` draws it as YAML code above the text, and `splitFrontmatter` hands it to the
 * app to read), and an HTML comment is never drawn, HTML allowed or not. A callout's marker may be
 * followed by its title (`> [!warning] Before a rerun`) and by `-` or `+`, which folds it closed or
 * open under its title; the further markers notes use (`info`, `todo`, `success`, `question`,
 * `danger`, `bug` and the like) draw as the nearest of the five kinds, titled with the marker's own
 * word, and any other marker leaves a quote. `==words==` is drawn highlighted. With `links`,
 * `![[Note]]` embeds a note, drawn by `links.embed` or as a link in a frame, `![[chart.png|300]]`
 * draws an image 300 wide, and `![[file.pdf]]` links to the file. `resolveUrl` rewrites each image's
 * and link's address first, such as a relative path to the app's own server. A `%% comment %%` is
 * hidden, as an HTML comment is. Not read, and so shown as typed: inline footnotes `^[...]` and block
 * ids `^id`; a single line break stays a space, as CommonMark has it.
 *
 * `measure` holds the prose to a reading measure in a wide pane, tables and code keeping the full width.
 */
export const Markdown = memo(function Markdown(props: MarkdownProps) {
    return <MarkdownView {...props} useMath={useMathEngine} Diagram={MermaidDiagram} />
})
