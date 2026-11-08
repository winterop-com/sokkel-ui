import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { Compartment, EditorState, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state'
import {
    Decoration,
    drawSelection,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
    placeholder as placeholderText,
    type DecorationSet,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

import { cn } from '../lib/cn'

export type CodeLanguage = 'json' | 'yaml' | 'text'

/** A line to mark: an error a check found, a warning, the line a run stopped on. */
export interface CodeMark {
    line: number
    tone: 'error' | 'warning' | 'info'
}

const LANGUAGES: Record<CodeLanguage, () => Extension> = {
    json: () => json(),
    yaml: () => yaml(),
    text: () => [],
}

/** Code in the `code-*` tokens, the same colors Shiki draws highlighted code in. */
const HIGHLIGHT = HighlightStyle.define([
    { tag: [tags.keyword, tags.definitionKeyword, tags.modifier, tags.controlKeyword, tags.moduleKeyword], color: 'var(--code-keyword)' },
    { tag: [tags.operator, tags.operatorKeyword, tags.derefOperator], color: 'var(--code-operator)' },
    { tag: [tags.punctuation, tags.separator, tags.bracket], color: 'var(--code-punctuation)' },
    { tag: [tags.string, tags.special(tags.string), tags.character], color: 'var(--code-string)' },
    { tag: [tags.regexp, tags.escape], color: 'var(--code-regexp)' },
    { tag: tags.number, color: 'var(--code-number)' },
    { tag: [tags.bool, tags.null, tags.atom, tags.constant(tags.name)], color: 'var(--code-constant)' },
    { tag: tags.comment, color: 'var(--code-comment)', fontStyle: 'italic' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.macroName], color: 'var(--code-function)' },
    { tag: [tags.special(tags.variableName), tags.self], color: 'var(--code-variable)' },
    { tag: [tags.typeName, tags.className, tags.namespace], color: 'var(--code-type)' },
    { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: 'var(--code-property)' },
    { tag: tags.tagName, color: 'var(--code-tag)' },
    { tag: tags.attributeName, color: 'var(--code-attribute)' },
    { tag: tags.heading, color: 'var(--code-heading)', fontWeight: '600' },
    { tag: [tags.link, tags.url], color: 'var(--code-link)' },
    { tag: tags.inserted, color: 'var(--code-inserted)' },
    { tag: tags.deleted, color: 'var(--code-deleted)' },
    { tag: tags.invalid, color: 'var(--code-invalid)' },
])

/**
 * The chrome in the theme's tokens, so a change of theme or scheme repaints it without a rebuild. The
 * text and its line numbers are mono at body size, adjusted to the sans beside them as all mono is.
 */
const THEME = EditorView.theme({
    '&': { backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: 'var(--text-sm)', height: '100%' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: 'var(--leading-code)',
        fontSizeAdjust: 'var(--mono-x-height)',
    },
    '.cm-content': { padding: '0.5rem 0', caretColor: 'var(--foreground)' },
    '.cm-line': { padding: '0 0.75rem' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--faint)', border: 'none', fontSizeAdjust: 'var(--mono-x-height)' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 0.5rem 0 0.75rem', minWidth: '2.5rem' },
    '.cm-cursor': { borderLeftColor: 'var(--foreground)' },
    '.cm-placeholder': { color: 'var(--muted-foreground)' },
    '&.cm-focused .cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--foreground) 5%, transparent)' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '&.cm-focused .cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--foreground)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'color-mix(in oklab, var(--primary) 28%, transparent) !important',
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'color-mix(in oklab, var(--primary) 22%, transparent)',
        outline: '1px solid color-mix(in oklab, var(--primary) 50%, transparent)',
    },
    '.cm-mark-error': { backgroundColor: 'color-mix(in oklab, var(--critical) 14%, transparent)' },
    '.cm-mark-warning': { backgroundColor: 'color-mix(in oklab, var(--warning) 14%, transparent)' },
    '.cm-mark-info': { backgroundColor: 'color-mix(in oklab, var(--info) 12%, transparent)' },
})

const setMarks = StateEffect.define<readonly CodeMark[]>()

function decorate(state: EditorState, marks: readonly CodeMark[]): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const sorted = [...marks].filter((mark) => mark.line >= 1 && mark.line <= state.doc.lines).sort((a, b) => a.line - b.line)
    for (const mark of sorted) {
        const line = state.doc.line(mark.line)
        builder.add(line.from, line.from, Decoration.line({ class: `cm-mark-${mark.tone}` }))
    }
    return builder.finish()
}

const marksField = StateField.define<{ marks: readonly CodeMark[]; set: DecorationSet }>({
    create: () => ({ marks: [], set: Decoration.none }),
    update(value, transaction) {
        let marks = value.marks
        for (const effect of transaction.effects) if (effect.is(setMarks)) marks = effect.value
        if (marks === value.marks && !transaction.docChanged) return value
        return { marks, set: decorate(transaction.state, marks) }
    },
    provide: (field) => EditorView.decorations.from(field, (value) => value.set),
})

/**
 * A code editor on CodeMirror for JSON, YAML or plain text: highlighted in the theme's colors, with
 * line numbers, bracket matching, undo, and Tab indenting (Escape then Tab leaves the editor).
 * `marks` washes whole lines by tone, as a check's findings. `wrap` folds long lines at the
 * editor's edge, for prose such as a prompt. The value is controlled: a new
 * `value` replaces the document, and an edit is reported through `onChange`.
 */
export function CodeEditor({
    value,
    onChange,
    language = 'text',
    readOnly = false,
    lineNumbers: numbered = true,
    wrap = false,
    marks = [],
    placeholder,
    label,
    className,
    invalid = false,
}: {
    value: string
    onChange?: (value: string) => void
    language?: CodeLanguage
    readOnly?: boolean
    lineNumbers?: boolean
    /** Folds long lines at the editor's edge instead of scrolling sideways. */
    wrap?: boolean
    marks?: readonly CodeMark[]
    placeholder?: string
    /** What the editor holds, for a screen reader. */
    label: string
    className?: string
    invalid?: boolean
}) {
    const host = useRef<HTMLDivElement>(null)
    const view = useRef<EditorView | null>(null)
    const report = useRef(onChange)
    report.current = onChange
    const compartments = useRef({
        language: new Compartment(),
        readOnly: new Compartment(),
        gutter: new Compartment(),
        wrap: new Compartment(),
    })

    useEffect(() => {
        if (host.current === null) return
        const { language: lang, readOnly: ro, gutter, wrap: folding } = compartments.current
        const editor = new EditorView({
            parent: host.current,
            state: EditorState.create({
                doc: value,
                extensions: [
                    gutter.of(numbered ? [lineNumbers(), highlightActiveLineGutter()] : []),
                    folding.of(wrap ? EditorView.lineWrapping : []),
                    history(),
                    drawSelection(),
                    indentOnInput(),
                    bracketMatching(),
                    highlightActiveLine(),
                    syntaxHighlighting(HIGHLIGHT),
                    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
                    lang.of(LANGUAGES[language]()),
                    ro.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
                    marksField,
                    THEME,
                    placeholder !== undefined ? placeholderText(placeholder) : [],
                    EditorView.contentAttributes.of({ 'aria-label': label }),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) report.current?.(update.state.doc.toString())
                    }),
                ],
            }),
        })
        view.current = editor
        editor.dispatch({ effects: setMarks.of(marks) })
        return () => {
            editor.destroy()
            view.current = null
        }
        // The editor is made once; later prop changes are dispatched by the effects below.
    }, [])

    useEffect(() => {
        const editor = view.current
        if (editor === null || editor.state.doc.toString() === value) return
        editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    }, [value])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.language.reconfigure(LANGUAGES[language]()) })
    }, [language])

    useEffect(() => {
        view.current?.dispatch({
            effects: compartments.current.readOnly.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        })
    }, [readOnly])

    useEffect(() => {
        view.current?.dispatch({
            effects: compartments.current.gutter.reconfigure(numbered ? [lineNumbers(), highlightActiveLineGutter()] : []),
        })
    }, [numbered])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.wrap.reconfigure(wrap ? EditorView.lineWrapping : []) })
    }, [wrap])

    useEffect(() => {
        view.current?.dispatch({ effects: setMarks.of(marks) })
    }, [marks])

    return (
        <div
            ref={host}
            data-slot="code-editor"
            aria-invalid={invalid || undefined}
            className={cn(
                'min-h-24 overflow-hidden rounded-control border border-input bg-field focus-within:border-ring/80 aria-invalid:border-destructive [&_.cm-editor]:h-full',
                readOnly && 'bg-muted/40',
                className,
            )}
        />
    )
}
