import { getIndentUnit, syntaxTree } from '@codemirror/language'
import { Prec, RangeSetBuilder, type EditorState } from '@codemirror/state'
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view'

const OPEN = '([{'
const CLOSE = ')]}'
/** Tokens a bracket inside of is text, not structure. */
const TEXT = /string|comment|literal/i
/** How many depths the colors cycle through. */
export const BRACKET_DEPTHS = 3

const depthMarks = Array.from({ length: BRACKET_DEPTHS }, (_, depth) => Decoration.mark({ class: `cm-bracket-${String(depth)}` }))

/** How far apart the depths kept along the document are, in characters. */
const STEP = 4096

/** The bracket depth before a place in the document, kept so a scroll counts on from the nearest one rather than from the start. */
export interface DepthAt {
    at: number
    depth: number
}

/**
 * Each bracket between `shown` and `end` marked by its depth, counted over the brackets that are
 * structure. The count starts at the last of `kept` at or before `shown`, and `kept` gains a depth
 * every `STEP` characters past its last, so the next scroll starts near where it lands.
 */
export function bracketMarks(state: EditorState, shown: number, end: number, kept: DepthAt[]): DecorationSet {
    const tree = syntaxTree(state)
    let start: DepthAt = { at: 0, depth: 0 }
    for (const one of kept) {
        if (one.at > shown) break
        start = one
    }
    const text = state.sliceDoc(start.at, end)
    const builder = new RangeSetBuilder<Decoration>()
    let depth = start.depth
    let next = (kept[kept.length - 1]?.at ?? 0) + STEP
    for (let offset = 0; offset < text.length; offset += 1) {
        const index = start.at + offset
        if (index === next) {
            kept.push({ at: index, depth })
            next += STEP
        }
        const char = text[offset]
        const opens = OPEN.includes(char)
        if (!opens && !CLOSE.includes(char)) continue
        if (TEXT.test(tree.resolveInner(index, 1).name)) continue
        if (!opens) depth = Math.max(0, depth - 1)
        if (index >= shown) builder.add(index, index + 1, depthMarks[depth % BRACKET_DEPTHS])
        if (opens) depth += 1
    }
    return builder.finish()
}

/** Colors brackets by how deep they sit, so a pair reads at a glance; drawn innermost, so its color wins over the highlighting's. */
export const bracketColors = Prec.highest(
    ViewPlugin.fromClass(
        class {
            decorations: DecorationSet
            // Depths along the document as it is now; an edit or a new parse starts them over.
            kept: DepthAt[] = []
            constructor(view: EditorView) {
                this.decorations = bracketMarks(view.state, view.viewport.from, view.viewport.to, this.kept)
            }
            update(update: ViewUpdate) {
                const reparsed = update.docChanged || syntaxTree(update.startState) !== syntaxTree(update.state)
                if (reparsed) this.kept = []
                if (reparsed || update.viewportChanged)
                    this.decorations = bracketMarks(update.state, update.view.viewport.from, update.view.viewport.to, this.kept)
            }
        },
        { decorations: (plugin) => plugin.decorations },
    ),
)

/** A rule at each indent step of every line in view, drawn over its leading whitespace. */
function guides(view: EditorView): DecorationSet {
    const { state } = view
    const unit = getIndentUnit(state)
    const builder = new RangeSetBuilder<Decoration>()
    let done = -1
    for (const { from, to } of view.visibleRanges) {
        for (let pos = Math.max(from, done + 1); pos <= to;) {
            const line = state.doc.lineAt(pos)
            done = line.to
            const lead = /^[ \t]*/.exec(line.text)?.[0] ?? ''
            if (lead.length >= unit && lead.length < line.length)
                builder.add(
                    line.from,
                    line.from + lead.length,
                    Decoration.mark({ class: 'cm-indent-guides', attributes: { style: `background-size: ${String(unit)}ch 100%` } }),
                )
            pos = line.to + 1
        }
    }
    return builder.finish()
}

/** Faint rules at each indent step, so a deep structure's levels line up. */
export const indentGuides = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet
        constructor(view: EditorView) {
            this.decorations = guides(view)
        }
        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) this.decorations = guides(update.view)
        }
    },
    { decorations: (plugin) => plugin.decorations },
)
