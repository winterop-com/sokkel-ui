import { getIndentUnit, syntaxTree } from '@codemirror/language'
import { Prec, RangeSetBuilder } from '@codemirror/state'
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view'

const OPEN = '([{'
const CLOSE = ')]}'
/** Tokens a bracket inside of is text, not structure. */
const TEXT = /string|comment|literal/i
/** How many depths the colors cycle through. */
export const BRACKET_DEPTHS = 3

const depthMarks = Array.from({ length: BRACKET_DEPTHS }, (_, depth) => Decoration.mark({ class: `cm-bracket-${String(depth)}` }))

/** Each bracket in view marked by its depth, counted from the start of the document over the brackets that are structure. */
function brackets(view: EditorView): DecorationSet {
    const { state } = view
    const tree = syntaxTree(state)
    const { from: shown, to: end } = view.viewport
    const text = state.sliceDoc(0, end)
    const builder = new RangeSetBuilder<Decoration>()
    let depth = 0
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index]
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
            constructor(view: EditorView) {
                this.decorations = brackets(view)
            }
            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state))
                    this.decorations = brackets(update.view)
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
