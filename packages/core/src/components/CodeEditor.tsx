import {
    autocompletion,
    completionKeymap,
    type Completion,
    type CompletionContext,
    type CompletionResult,
    type CompletionSource,
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import {
    bracketMatching,
    codeFolding,
    foldGutter,
    foldKeymap,
    HighlightStyle,
    indentOnInput,
    LanguageSupport,
    StreamLanguage,
    syntaxHighlighting,
    type StreamParser,
} from '@codemirror/language'
import { diagnosticCount, forEachDiagnostic, linter, lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { openSearchPanel, search as searchPanel, searchKeymap, SearchQuery, setSearchQuery } from '@codemirror/search'
import { Compartment, EditorState, Prec, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state'
import {
    Decoration,
    drawSelection,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    hoverTooltip,
    keymap,
    lineNumbers,
    placeholder as placeholderText,
    type DecorationSet,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { cn } from '../lib/cn'
import { bracketColors as colorBrackets, indentGuides as drawGuides } from './code/guides'
import { jq } from './code/jq'
import { markdown } from './code/markdown'
import {
    namedSchema,
    SCHEMA_WORDS,
    schemaCompletion,
    schemaDiagnostics,
    schemaHover,
    type CodeSchemaWords,
    type SchemaLanguage,
} from './code/schema'
import { sharedLink, type SharedDocument } from './code/shared'
import { loadedValidate, loadValidate } from './schema/checker'
import type { JsonSchema } from './schema/read'

export type { CodeSchemaWords } from './code/schema'
export { createSharedDocument, useSharedDocument, useSharedText, type SharedDocument } from './code/shared'

/** The languages the editor carries by name. */
export type CodeLanguageName = 'json' | 'yaml' | 'jq' | 'markdown' | 'sql' | 'shell' | 'jinja' | 'text'

/** A language described by its tokens: a CodeMirror stream parser with a name. */
export type CodeLanguageSpec = StreamParser<unknown> & { name: string }

/** A language by name, a CodeMirror `LanguageSupport`, or a stream parser to build one from. */
export type CodeLanguage = CodeLanguageName | LanguageSupport | CodeLanguageSpec

/**
 * A place in the code to mark: an error a check found, a warning, the line a run stopped on. With
 * only `line` the whole line is washed in its tone. With `from` (and `to`) a range is underlined:
 * columns on `line` counted from 1, `to` the column after the last; without `line`, offsets into the
 * document counted from 0. A `message` puts a dot in the gutter and says itself on hover.
 */
export interface CodeMark {
    line?: number
    from?: number
    to?: number
    tone: 'error' | 'warning' | 'info'
    message?: string
}

/**
 * One thing the editor's checks found, as a problems list shows it: the line and column it starts
 * at and ends before (counted from 1), the same as offsets into the document (from 0), how bad it is
 * and what it says. Pass `{ line, from: column, to: endColumn }` or `{ from, to }` back as `reveal`
 * to go to it.
 */
export interface CodeProblem {
    line: number
    column: number
    endLine: number
    endColumn: number
    from: number
    to: number
    tone: 'error' | 'warning' | 'info'
    message: string
}

/** The diagnostics a state holds (the schema's findings and the marks with a message) as problems, in the document's order. */
export function codeProblems(state: EditorState): CodeProblem[] {
    const found: CodeProblem[] = []
    forEachDiagnostic(state, (diagnostic, from, to) => {
        const start = state.doc.lineAt(from)
        const end = state.doc.lineAt(to)
        found.push({
            line: start.number,
            column: from - start.from + 1,
            endLine: end.number,
            endColumn: to - end.from + 1,
            from,
            to,
            tone: diagnostic.severity === 'error' || diagnostic.severity === 'warning' ? diagnostic.severity : 'info',
            message: diagnostic.message,
        })
    })
    return found.sort((a, b) => a.from - b.from || a.to - b.to)
}

/** A word the editor offers while typing. */
export interface CodeCompletion {
    label: string
    /** A few words beside the label, such as a signature or a type. */
    detail?: string
    /** What the word does, shown beside the list. */
    docs?: string
    /** The icon it is drawn with. */
    kind?: 'function' | 'keyword' | 'variable' | 'property' | 'constant' | 'type' | 'enum' | 'text'
    /** The text inserted, when it is not the label. */
    apply?: string
}

/**
 * A place to select and bring into view: a whole `line` counted from 1, columns `from` and `to` on
 * it, or, without `line`, offsets into the document counted from 0.
 */
export interface CodeRange {
    line?: number
    from?: number
    to?: number
}

/** A schema a document names by its `$schema` address, found by the app; nothing when it has none. */
export type CodeSchemaResolver = (address: string) => JsonSchema | undefined | Promise<JsonSchema | undefined>

/** The JSON Schema 2020-12 dialect, which a schema document names; the checker carries it, so a schema written in it is checked without a fetch. */
const DRAFT_2020 = 'https://json-schema.org/draft/2020-12/schema'

/** A key binding's handler, given the document. */
export type CodeKeyHandler = (value: string) => void

/** A language built from a stream parser, to pass as `language`. */
export function defineLanguage<State>(spec: StreamParser<State> & { name: string }): LanguageSupport {
    return new LanguageSupport(StreamLanguage.define(spec))
}

const NAMED: Record<Exclude<CodeLanguageName, LazyLanguage>, () => Extension> = {
    json: () => json(),
    yaml: () => yaml(),
    jq: () => jq(),
    markdown: () => markdown(),
    text: () => [],
}

type LazyLanguage = 'sql' | 'shell' | 'jinja'

/** The languages loaded the first time an editor shows one, so an app that never does carries none of them. */
const LAZY: Record<LazyLanguage, () => Promise<Extension>> = {
    sql: () => import('@codemirror/lang-sql').then((module) => module.sql()),
    shell: () => import('@codemirror/legacy-modes/mode/shell').then((module) => new LanguageSupport(StreamLanguage.define(module.shell))),
    jinja: () => import('@codemirror/legacy-modes/mode/jinja2').then((module) => new LanguageSupport(StreamLanguage.define(module.jinja2))),
}

const loaded = new Map<LazyLanguage, Extension>()

const isLazy = (language: CodeLanguage): language is LazyLanguage => typeof language === 'string' && language in LAZY

/** Loads a language the editor carries by name but not at start; the others are there already. */
export async function loadCodeLanguage(language: CodeLanguageName): Promise<void> {
    if (!isLazy(language) || loaded.has(language)) return
    loaded.set(language, await LAZY[language]())
}

const MEDIA_TYPES: [RegExp, CodeLanguageName][] = [
    [/^application\/(?:[\w.-]+\+)?json$/, 'json'],
    [/^(?:application|text)\/(?:x-)?(?:[\w.-]+\+)?yaml$/, 'yaml'],
    [/^application\/jq$/, 'jq'],
    [/^text\/(?:x-)?markdown$/, 'markdown'],
    [/^(?:application|text)\/(?:x-)?sql$/, 'sql'],
    [/^(?:text\/x-shellscript|application\/x-sh|text\/x-sh)$/, 'shell'],
    [/^text\/(?:x-)?jinja2?$/, 'jinja'],
]

/**
 * The language a media type is written in, such as a JSON Schema's `contentMediaType`: JSON and
 * YAML with any `+json` or `+yaml` suffix, jq, markdown, SQL, shell and Jinja; anything else is text.
 */
export function languageForMediaType(mediaType: string | null | undefined): CodeLanguageName {
    const type = mediaType?.split(';')[0].trim().toLowerCase() ?? ''
    return MEDIA_TYPES.find(([pattern]) => pattern.test(type))?.[1] ?? 'text'
}

const built = new WeakMap<CodeLanguageSpec, LanguageSupport>()

function languageExtension(language: CodeLanguage): Extension {
    if (isLazy(language)) return loaded.get(language) ?? []
    if (typeof language === 'string') return NAMED[language]()
    if (language instanceof LanguageSupport) return language
    let support = built.get(language)
    if (support === undefined) {
        support = defineLanguage(language)
        built.set(language, support)
    }
    return support
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
    { tag: tags.strong, fontWeight: '600' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.monospace, color: 'var(--code-string)' },
    { tag: tags.quote, color: 'var(--code-comment)' },
    { tag: [tags.list, tags.contentSeparator, tags.processingInstruction], color: 'var(--code-punctuation)' },
    { tag: tags.labelName, color: 'var(--code-attribute)' },
    { tag: tags.inserted, color: 'var(--code-inserted)' },
    { tag: tags.deleted, color: 'var(--code-deleted)' },
    { tag: tags.invalid, color: 'var(--code-invalid)' },
])

const TONES = { error: 'var(--critical)', warning: 'var(--warning)', info: 'var(--info)', hint: 'var(--info)' } as const

const underline = (tone: keyof typeof TONES) => ({
    backgroundImage: 'none',
    textDecoration: `underline wavy ${TONES[tone]}`,
    textDecorationSkipInk: 'none',
    textUnderlineOffset: '0.2em',
})

const dot = (tone: keyof typeof TONES) => ({
    content: 'normal',
    width: '0.5rem',
    height: '0.5rem',
    margin: '0 auto',
    borderRadius: '50%',
    backgroundColor: TONES[tone],
})

/**
 * The chrome in the theme's tokens, so a change of theme or scheme repaints it without a rebuild. The
 * text and its line numbers are mono, not adjusted to the sans: in an editor the code is the
 * content, not a word set in a sentence. The size comes from `SIZES`. The editor's ground and its
 * gutter's are washes over the field's or the pane's own, transparent unless a theme sets them.
 */
const THEME = EditorView.theme({
    '&': { backgroundColor: 'var(--editor-ground)', color: 'var(--foreground)', height: '100%' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSizeAdjust: 'none' },
    '.cm-content': { padding: '0.5rem 0', caretColor: 'var(--foreground)' },
    '.cm-line': { padding: '0 0.75rem' },
    // Opaque, so text scrolled sideways under the line numbers never shows through: the gutter's wash
    // over the editor's wash over the box's own ground.
    '.cm-gutters': {
        background:
            'linear-gradient(var(--editor-gutter), var(--editor-gutter)), linear-gradient(var(--editor-ground), var(--editor-ground)), var(--editor-paper, var(--background))',
        color: 'var(--editor-gutter-ink)',
        border: 'none',
        fontSizeAdjust: 'none',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 0.5rem 0 0.75rem', minWidth: '2.5rem' },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 0.25rem', cursor: 'pointer' },
    '.cm-foldGutter .cm-gutterElement:hover': { color: 'var(--foreground)' },
    '.cm-foldPlaceholder': {
        backgroundColor: 'var(--muted)',
        border: 'none',
        borderRadius: 'var(--control-radius)',
        color: 'var(--muted-foreground)',
        padding: '0 0.375rem',
    },
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
    '.cm-lintRange-error': underline('error'),
    '.cm-lintRange-warning': underline('warning'),
    '.cm-lintRange-info': underline('info'),
    '.cm-lintRange-hint': underline('hint'),
    '.cm-lintRange-active': { backgroundColor: 'color-mix(in oklab, var(--warning) 18%, transparent)' },
    '.cm-gutter-lint': { width: '1rem' },
    '.cm-gutter-lint .cm-gutterElement': { padding: '0', display: 'flex', alignItems: 'center' },
    '.cm-lint-marker-error': dot('error'),
    '.cm-lint-marker-warning': dot('warning'),
    '.cm-lint-marker-info': dot('info'),
    '.cm-tooltip': {
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--control-radius)',
        boxShadow: 'var(--shadow-pop)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--text-xs--line-height)',
        overflow: 'hidden',
    },
    '.cm-tooltip-hover .cm-hover': { padding: '0.375rem 0.625rem', maxWidth: 'min(28rem, 80vw)' },
    '.cm-hover-detail': { color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' },
    '.cm-diagnostic': { padding: '0.375rem 0.625rem', borderLeft: '3px solid transparent', marginLeft: '0' },
    '.cm-diagnostic-error': { borderLeftColor: 'var(--critical)' },
    '.cm-diagnostic-warning': { borderLeftColor: 'var(--warning)' },
    '.cm-diagnostic-info, .cm-diagnostic-hint': { borderLeftColor: 'var(--info)' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--font-mono)', maxHeight: '16rem' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': { padding: '0.125rem 0.5rem' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
    '.cm-completionDetail': { color: 'var(--muted-foreground)', fontStyle: 'normal', marginLeft: '0.75rem' },
    '.cm-completionMatchedText': { textDecoration: 'none', fontWeight: '600' },
    '.cm-completionIcon': { color: 'var(--muted-foreground)', opacity: '1' },
    '.cm-tooltip.cm-completionInfo': { padding: '0.375rem 0.625rem', maxWidth: 'min(24rem, 60vw)' },
    '.cm-panels': {
        backgroundColor: 'var(--muted)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
    },
    '.cm-panels-top': { borderBottom: '1px solid var(--border)' },
    '.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
    '.cm-panel.cm-search': {
        padding: '0.375rem 2rem 0.375rem 0.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.25rem 0.5rem',
    },
    '.cm-panel.cm-search br': { display: 'none' },
    '.cm-panel.cm-search label': { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--text-xs)' },
    '.cm-panel.cm-search [name=close]': { top: '0.375rem', right: '0.5rem', color: 'var(--muted-foreground)', fontSize: 'var(--text-sm)' },
    '.cm-textfield': {
        backgroundColor: 'var(--field)',
        color: 'var(--foreground)',
        border: '1px solid var(--input)',
        borderRadius: 'var(--control-radius)',
        padding: '0.125rem 0.5rem',
        margin: '0',
        fontSize: 'var(--text-xs)',
        outline: 'none',
    },
    '.cm-textfield:focus': { borderColor: 'var(--ring)' },
    '.cm-button': {
        backgroundImage: 'none',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--control-radius)',
        padding: '0.125rem 0.5rem',
        margin: '0',
        fontSize: 'var(--text-xs)',
    },
    '.cm-button:hover': { backgroundColor: 'var(--accent)' },
    '.cm-bracket-0': { color: 'var(--code-bracket-1)' },
    '.cm-bracket-1': { color: 'var(--code-bracket-2)' },
    '.cm-bracket-2': { color: 'var(--code-bracket-3)' },
    '.cm-indent-guides': {
        display: 'inline-block',
        verticalAlign: 'top',
        height: '1lh',
        backgroundImage: 'linear-gradient(to right, var(--border) 1px, transparent 1px)',
        backgroundRepeat: 'repeat-x',
    },
    '.cm-searchMatch': { backgroundColor: 'color-mix(in oklab, var(--warning) 24%, transparent)', borderRadius: 'calc(var(--radius) / 2)' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'color-mix(in oklab, var(--warning) 48%, transparent)' },
})

/**
 * The text and line heights by size: `md` at body size, `sm` at the size of help text, for a dense
 * pane, and `lg` a step over the body, for long writing.
 */
const SIZES = {
    sm: EditorView.theme({ '&': { fontSize: 'var(--text-xs)' }, '.cm-scroller': { lineHeight: 'var(--text-xs--line-height)' } }),
    md: EditorView.theme({ '&': { fontSize: 'var(--text-sm)' }, '.cm-scroller': { lineHeight: 'var(--leading-code)' } }),
    lg: EditorView.theme({ '&': { fontSize: 'var(--text-base)' }, '.cm-scroller': { lineHeight: 'var(--text-base--line-height)' } }),
}

/** A document past this many characters drops folding, bracket colors and indent guides, which walk the whole of it. */
export const LARGE_DOCUMENT = 1_000_000

const NO_MARKS: readonly CodeMark[] = []

const setMarks = StateEffect.define<readonly CodeMark[]>()

/** A mark's range in the document, or null for a whole-line mark or one outside the document. */
function range(state: EditorState, mark: CodeRange): { from: number; to: number } | null {
    if (mark.from === undefined) return null
    const clamp = (pos: number) => Math.max(0, Math.min(pos, state.doc.length))
    if (mark.line === undefined) {
        const from = clamp(mark.from)
        return { from, to: Math.max(from, clamp(mark.to ?? mark.from)) }
    }
    if (mark.line < 1 || mark.line > state.doc.lines) return null
    const line = state.doc.line(mark.line)
    const column = (at: number) => Math.min(line.to, line.from + Math.max(0, at - 1))
    const from = column(mark.from)
    return { from, to: Math.max(from, column(mark.to ?? line.length + 1)) }
}

function decorate(state: EditorState, marks: readonly CodeMark[]): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    const placed: { from: number; to: number; decoration: Decoration }[] = []
    for (const mark of marks) {
        if (mark.from === undefined) {
            if (mark.line === undefined || mark.line < 1 || mark.line > state.doc.lines) continue
            const line = state.doc.line(mark.line)
            placed.push({ from: line.from, to: line.from, decoration: Decoration.line({ class: `cm-mark-${mark.tone}` }) })
        } else if (mark.message === undefined) {
            const at = range(state, mark)
            if (at !== null && at.to > at.from)
                placed.push({ ...at, decoration: Decoration.mark({ class: `cm-lintRange cm-lintRange-${mark.tone}` }) })
        }
    }
    placed.sort((a, b) => a.from - b.from || a.to - b.to)
    for (const { from, to, decoration } of placed) builder.add(from, to, decoration)
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

/** The marks that carry a message, as diagnostics: a whole line's mark covers the line's text. */
function markDiagnostics(state: EditorState, marks: readonly CodeMark[]): Diagnostic[] {
    return marks.flatMap((mark) => {
        if (mark.message === undefined) return []
        let at = range(state, mark)
        if (at === null && mark.from === undefined && mark.line !== undefined && mark.line >= 1 && mark.line <= state.doc.lines) {
            const line = state.doc.line(mark.line)
            at = { from: line.from, to: line.to }
        }
        return at === null ? [] : [{ ...at, severity: mark.tone, message: mark.message }]
    })
}

const WORD = /[\w$@]/

/** The word under a position: letters, digits, `_`, and a leading `$` or `@`. */
function wordAt(state: EditorState, pos: number): { from: number; to: number; text: string } | null {
    const line = state.doc.lineAt(pos)
    let start = pos - line.from
    let end = start
    while (start > 0 && WORD.test(line.text[start - 1])) start -= 1
    while (end < line.length && WORD.test(line.text[end])) end += 1
    if (start === end) return null
    return { from: line.from + start, to: line.from + end, text: line.text.slice(start, end) }
}

function toCompletion(item: CodeCompletion): Completion {
    return { label: item.label, detail: item.detail, info: item.docs, type: item.kind, apply: item.apply }
}

/** The names a `[[link]]` completes from: a list, or a function of what is typed after the brackets. */
export type CodeLinks = readonly CodeCompletion[] | ((query: string) => readonly CodeCompletion[] | Promise<readonly CodeCompletion[]>)

/**
 * The names offered as a `[[link]]` is typed, from the brackets on, matched against what follows
 * them. The one chosen is put in with the closing `]]`, unless they follow already.
 */
export async function linkCompletions(context: CompletionContext, links: CodeLinks): Promise<CompletionResult | null> {
    const typed = context.matchBefore(/\[\[[^[\]\n]*/)
    if (typed === null) return null
    const query = typed.text.slice(2)
    const list = typeof links === 'function' ? await links(query) : links
    const closed = context.state.sliceDoc(context.pos, context.pos + 2) === ']]'
    return {
        from: typed.from + 2,
        options: list.map((item) => ({ ...toCompletion(item), apply: `${item.apply ?? item.label}${closed ? '' : ']]'}` })),
        validFor: /^[^[\]\n]*$/,
    }
}

export interface CodeEditorProps {
    /** The document, held from outside with `onChange`; left out with `doc`. */
    value?: string
    /** Called with the document after each change, its own or, with `doc`, another editor's. */
    onChange?: (value: string) => void
    /**
     * A document shared with other editors (`useSharedDocument`), in place of `value`: an edit in
     * any of them shows in all, one undo history serves them all, and each keeps its own caret and
     * selection. The editor opens at the caret the last one left, so a pane opened again in a
     * window goes on where it was. Keep the same document for the editor's life.
     */
    doc?: SharedDocument
    language?: CodeLanguage
    readOnly?: boolean
    lineNumbers?: boolean
    /** Shades the caret's line while the editor has focus; on by default, off for an app whose people turn it off. */
    activeLine?: boolean
    /** Folds long lines at the editor's edge instead of scrolling sideways. */
    wrap?: boolean
    marks?: readonly CodeMark[]
    /** Words offered while typing, beside the language's own: a list, or a function of the word being typed (a leading `$` or `@` included, a `.` not). */
    completions?: readonly CodeCompletion[] | ((word: string) => readonly CodeCompletion[] | Promise<readonly CodeCompletion[]>)
    /**
     * Whether the language's own words (jq's built-ins) are offered beside `completions`; an app's
     * word replaces the language's of the same label either way, its detail and docs being its own.
     */
    languageWords?: boolean
    /** The names a `[[link]]` to another note completes from as it is typed, such as every note's title. */
    links?: CodeLinks
    /** What a word is, shown when the pointer rests on it; nothing to show nothing. */
    hover?: (word: string) => ReactNode
    /** Runs the document, on Mod-Enter (Cmd on a Mac, Ctrl elsewhere). */
    onRun?: CodeKeyHandler
    /** More key bindings, by CodeMirror's key names: `{ 'Mod-s': save }`. */
    keys?: Readonly<Record<string, CodeKeyHandler>>
    /** A find and replace bar, opened with Mod-f. */
    search?: boolean
    /** Opens the find bar at once with this query. */
    defaultSearch?: string
    /** A fold gutter, for the languages that know their blocks. Off past a megabyte. */
    folding?: boolean
    /** Brackets colored by depth, so a pair reads at a glance. Off past a megabyte. */
    bracketColors?: boolean
    /** Faint rules at each indent step. Off past a megabyte. */
    indentGuides?: boolean
    /** `md` at body size, `sm` at the size of help text, for a dense pane, `lg` a step over the body, for long writing. */
    size?: 'sm' | 'md' | 'lg'
    /** `field` is boxed like an input; `pane` fills the pane it is in, edge to edge, under the pane's own header. */
    variant?: 'field' | 'pane'
    /** A JSON Schema (2020-12) a JSON or YAML document is checked against and completed from. */
    schema?: JsonSchema
    /** Leaves a value unchecked by the schema, and anything inside it, such as one holding a reference filled in later. */
    deferred?: (value: unknown) => boolean
    /**
     * Finds the schema a document names for itself, when `schema` is not given: a top-level `$schema`
     * key, or a `# yaml-language-server: $schema=<address>` line in YAML. The editor fetches nothing;
     * a document in the JSON Schema 2020-12 dialect is checked against it without this.
     */
    resolveSchema?: CodeSchemaResolver
    /** Selects a range and scrolls it into view, such as where a check failed; a new object moves there again. */
    reveal?: CodeRange | null
    /**
     * Called with every problem the editor shows (what the schema finds and the marks with a
     * message) each time they change, an empty list once there are none, for a problems list beside it.
     */
    onProblems?: (problems: readonly CodeProblem[]) => void
    /** The words the schema check says, in English unless given. */
    words?: Partial<CodeSchemaWords>
    /** CodeMirror's own words (the find bar, the fold marks), by their English text, to translate them. */
    phrases?: Readonly<Record<string, string>>
    placeholder?: string
    /** What the editor holds, for a screen reader. */
    label: string
    /** The id of the editable text, for a form's label to point at and its submit to focus. */
    id?: string
    /** Called as the editor loses the focus, as a field marks itself left. */
    onBlur?: () => void
    className?: string
    invalid?: boolean
}

/**
 * A code editor on CodeMirror: JSON, YAML, jq or plain text by name, or any language given as a
 * CodeMirror `LanguageSupport` or a stream parser (`defineLanguage` builds one). Highlighted in the
 * theme's colors, with line numbers, bracket matching, undo, and Tab indenting (Escape then Tab
 * leaves the editor). `marks` wash whole lines or underline ranges, a message on hover. `completions`
 * offers words while typing, `hover` says what a word is, `onRun` runs on Mod-Enter and `keys` binds
 * any other key. `search` opens a find and replace bar on Mod-f, `folding` adds a fold gutter,
 * `bracketColors` and `indentGuides` help read deep structure (the three off past a megabyte), and
 * `schema` checks JSON or YAML against a JSON Schema (2020-12) and completes its property names and
 * values. `onProblems` hears what the checks find, for a problems list beside the editor whose rows
 * go to each through `reveal`. `wrap` folds long lines at the editor's edge, for prose such as a prompt. The value is
 * controlled: a new `value` replaces the document, and an edit is reported through `onChange`.
 *
 * `doc` edits a document shared with other editors in place of `value`, as a pane and the window
 * it opens into (`WindowedPane`) edit one document: `useSharedDocument` makes one, `useSharedText`
 * reads its text.
 *
 * `markdown` highlights notes and documents: headings, strong and emphasized words, code, quotes,
 * lists, links and addresses, `[[links]]` between notes and `#tags`. `links` completes a
 * `[[link]]` as it is typed from the names given, such as every note's title, the closing brackets
 * put in with the name.
 */
export function CodeEditor({
    value: givenValue,
    onChange,
    doc,
    language = 'text',
    readOnly = false,
    lineNumbers: numbered = true,
    activeLine = true,
    wrap = false,
    marks = NO_MARKS,
    completions,
    languageWords = true,
    links,
    hover,
    onRun,
    keys,
    search = false,
    defaultSearch,
    folding = false,
    bracketColors = false,
    indentGuides = false,
    size = 'md',
    variant = 'field',
    schema: given,
    deferred,
    resolveSchema,
    reveal,
    onProblems,
    words,
    phrases,
    placeholder,
    label,
    id,
    onBlur,
    className,
    invalid = false,
}: CodeEditorProps) {
    const host = useRef<HTMLDivElement>(null)
    const view = useRef<EditorView | null>(null)
    const value = givenValue ?? ''
    const link = doc === undefined ? undefined : sharedLink(doc)
    const report = useRef(onChange)
    report.current = onChange
    const [address, setAddress] = useState<string | undefined>(() =>
        given === undefined && (language === 'json' || language === 'yaml') ? namedSchema(doc?.text ?? value, language) : undefined,
    )
    const [named, setNamed] = useState<{ address: string; schema: JsonSchema } | undefined>()
    const schema = given ?? (named !== undefined && named.address === address ? named.schema : undefined)
    const [languageReady, setLanguageReady] = useState(0)
    const props = useRef({
        marks,
        completions,
        languageWords,
        links,
        hover,
        onRun,
        keys,
        schema,
        deferred,
        words,
        language,
        resolveSchema,
        onBlur,
        onProblems,
    })
    props.current = {
        marks,
        completions,
        languageWords,
        links,
        hover,
        onRun,
        keys,
        schema,
        deferred,
        words,
        language,
        resolveSchema,
        onBlur,
        onProblems,
    }
    // The problems last reported, so a change of anything else reports nothing.
    const reported = useRef<string | undefined>(undefined)
    const reportProblems = (state: EditorState) => {
        const tell = props.current.onProblems
        if (tell === undefined) return
        const problems = codeProblems(state)
        const key = JSON.stringify(problems)
        if (key === reported.current) return
        reported.current = key
        tell(problems)
    }
    const compartments = useRef({
        language: new Compartment(),
        readOnly: new Compartment(),
        gutter: new Compartment(),
        wrap: new Compartment(),
        keys: new Compartment(),
        search: new Compartment(),
        look: new Compartment(),
        folding: new Compartment(),
        active: new Compartment(),
        size: new Compartment(),
        lint: new Compartment(),
        schema: new Compartment(),
    })

    const schemaLanguage: SchemaLanguage | undefined =
        schema !== undefined && (language === 'json' || language === 'yaml') ? language : undefined
    const large = (doc?.length ?? value.length) > LARGE_DOCUMENT
    const diagnosing = schemaLanguage !== undefined || marks.some((mark) => mark.message !== undefined)
    const keyNames = [...(onRun === undefined ? [] : ['Mod-Enter']), ...Object.keys(keys ?? {})].join(' ')

    /**
     * Every diagnostic the editor shows: the marks with a message and what the schema finds, once
     * the schema checker has loaded.
     */
    const diagnose = (state: EditorState): Diagnostic[] => {
        const { marks: given, schema: against, words, language: lang, deferred: unchecked } = props.current
        const found = markDiagnostics(state, given)
        const check = loadedValidate()
        if (against === undefined || (lang !== 'json' && lang !== 'yaml') || check === undefined) return found
        return [...found, ...schemaDiagnostics(state, lang, against, check, { ...SCHEMA_WORDS, ...words }, unchecked)]
    }

    const extensions = {
        keys: () =>
            Prec.highest(
                keymap.of(
                    keyNames
                        .split(' ')
                        .filter((key) => key !== '')
                        .map((key) => ({
                            key,
                            preventDefault: true,
                            run: (editor: EditorView) => {
                                const { onRun: run, keys: bound } = props.current
                                const handler = bound?.[key] ?? (key === 'Mod-Enter' ? run : undefined)
                                if (handler === undefined) return false
                                handler(editor.state.doc.toString())
                                return true
                            },
                        })),
                ),
            ),
        search: () => (search ? [searchPanel({ top: true }), keymap.of(searchKeymap)] : []),
        look: () => (large ? [] : [bracketColors ? colorBrackets : [], indentGuides ? drawGuides : []]),
        folding: () => (folding && !large ? [codeFolding(), foldGutter(), keymap.of(foldKeymap)] : []),
        lint: () => (diagnosing ? [lintGutter(), linter((editor) => diagnose(editor.state), { delay: 300 })] : []),
        schema: () => {
            if (schemaLanguage === undefined) return []
            // One source for the life of the configuration: the autocompletion restarts when its sources change.
            const data = [{ autocomplete: schemaCompletion(() => props.current.schema, schemaLanguage) }]
            return [
                EditorState.languageData.of(() => data),
                hoverTooltip(
                    schemaHover(() => props.current.schema, schemaLanguage),
                    { hoverTime: 300 },
                ),
            ]
        },
    }

    useEffect(() => {
        if (host.current === null) return
        const parts = compartments.current
        const given = [{ autocomplete: complete }]
        // A shared document keeps the history; the keys reach it rather than a history of the editor's own.
        const shared: Extension =
            link === undefined
                ? []
                : Prec.high(
                      keymap.of([
                          { key: 'Mod-z', run: (editor) => !editor.state.readOnly && link.history('undo', editor), preventDefault: true },
                          {
                              key: 'Mod-y',
                              mac: 'Mod-Shift-z',
                              run: (editor) => !editor.state.readOnly && link.history('redo', editor),
                              preventDefault: true,
                          },
                          {
                              linux: 'Ctrl-Shift-z',
                              run: (editor) => !editor.state.readOnly && link.history('redo', editor),
                              preventDefault: true,
                          },
                      ]),
                  )
        const editor = new EditorView({
            parent: host.current,
            dispatchTransactions: (transactions, editor) => {
                editor.update(transactions)
                link?.forward(transactions, editor)
            },
            state: EditorState.create({
                doc: doc?.text ?? value,
                selection: link?.selection(),
                extensions: [
                    shared,
                    parts.gutter.of(numbered ? [lineNumbers(), ...(activeLine ? [highlightActiveLineGutter()] : [])] : []),
                    parts.folding.of(extensions.folding()),
                    parts.look.of(extensions.look()),
                    parts.wrap.of(wrap ? EditorView.lineWrapping : []),
                    parts.keys.of(extensions.keys()),
                    link === undefined ? history() : [],
                    drawSelection(),
                    indentOnInput(),
                    bracketMatching(),
                    parts.active.of(activeLine ? highlightActiveLine() : []),
                    syntaxHighlighting(HIGHLIGHT),
                    autocompletion({ icons: true, override: [offer] }),
                    keymap.of([...completionKeymap, ...defaultKeymap, ...(link === undefined ? historyKeymap : []), indentWithTab]),
                    parts.search.of(extensions.search()),
                    parts.language.of(languageExtension(language)),
                    parts.schema.of(extensions.schema()),
                    parts.lint.of(extensions.lint()),
                    parts.readOnly.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
                    parts.size.of(SIZES[size]),
                    marksField,
                    EditorState.languageData.of(() => given),
                    hoverTooltip(describe, { hoverTime: 300 }),
                    THEME,
                    phrases === undefined ? [] : EditorState.phrases.of(phrases),
                    placeholder !== undefined ? placeholderText(placeholder) : [],
                    EditorView.contentAttributes.of(id === undefined ? { 'aria-label': label } : { 'aria-label': label, id }),
                    EditorView.domEventHandlers({ blur: () => void props.current.onBlur?.() }),
                    EditorView.updateListener.of((update) => {
                        if (update.transactions.length > 0) reportProblems(update.state)
                        if (!update.docChanged) return
                        const text = update.state.doc.toString()
                        report.current?.(text)
                        const lang = props.current.language
                        if (lang === 'json' || lang === 'yaml') setAddress(namedSchema(text, lang))
                    }),
                ],
            }),
        })
        view.current = editor
        const detach = link?.attach(editor)
        editor.dispatch({ effects: setMarks.of(marks) })
        if (diagnosing) editor.dispatch(setDiagnostics(editor.state, diagnose(editor.state)))
        reportProblems(editor.state)
        if (search && defaultSearch !== undefined) {
            openSearchPanel(editor)
            editor.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: defaultSearch })) })
        }
        return () => {
            detach?.()
            editor.destroy()
            view.current = null
        }
        // The editor is made once; later prop changes are dispatched by the effects below.
    }, [])

    /** The names of a `[[link]]` being typed, or else the words the caller offers for the word being typed. */
    /**
     * Every source's words at once, the app's first: a language's or a schema's word with the label of
     * one the app gives is left out, and the language's words go when `languageWords` is false.
     */
    async function offer(context: CompletionContext): Promise<CompletionResult | null> {
        const sources = context.state
            .languageDataAt<CompletionSource | readonly (string | Completion)[]>('autocomplete', context.pos)
            .filter((source): source is CompletionSource => typeof source === 'function' && source !== complete)
        const [own, ...others] = await Promise.all([complete(context), ...sources.map((source) => source(context))])
        if (own !== null && own !== undefined && 'options' in own && own.options.length > 0 && others.every((other) => !other)) return own
        const taken = new Set((own?.options ?? []).map((option) => option.label))
        const kept = others.filter((other): other is CompletionResult => other !== null && other !== undefined)
        // The language's own words are those of a source other than the schema's, which answers only for JSON and YAML.
        const theirs = props.current.languageWords === false && props.current.schema === undefined ? [] : kept
        const results = [
            ...(own === null || own === undefined ? [] : [own]),
            ...theirs.map((other) => ({ ...other, options: other.options.filter((option) => !taken.has(option.label)) })),
        ]
        const from = results[0]?.from
        if (from === undefined) return null
        const options = results.filter((result) => result.from === from).flatMap((result) => result.options)
        return options.length === 0 ? null : { from, options, validFor: results.length === 1 ? results[0].validFor : undefined }
    }

    async function complete(context: CompletionContext): Promise<CompletionResult | null> {
        const offered = props.current.links
        if (offered !== undefined) {
            const linked = await linkCompletions(context, offered)
            if (linked !== null) return linked
        }
        const given = props.current.completions
        if (given === undefined) return null
        const word = context.matchBefore(/[$@]?\w*/)
        if (word === null) return null
        const afterDot = context.state.sliceDoc(word.from - 1, word.from) === '.'
        if (word.from === word.to && !context.explicit && !afterDot) return null
        const list = typeof given === 'function' ? await given(word.text) : given
        return { from: word.from, options: list.map(toCompletion), validFor: /^[$@]?\w*$/ }
    }

    /** The caller's words on the word under the pointer, drawn in a tooltip. */
    function describe(editor: EditorView, pos: number) {
        const describeWord = props.current.hover
        if (describeWord === undefined) return null
        const word = wordAt(editor.state, pos)
        if (word === null) return null
        const content = describeWord(word.text)
        if (content === null || content === undefined || content === false || content === '') return null
        return {
            pos: word.from,
            end: word.to,
            above: true,
            create: () => {
                const dom = document.createElement('div')
                dom.className = 'cm-hover'
                if (typeof content === 'string' || typeof content === 'number') {
                    dom.textContent = String(content)
                    return { dom }
                }
                const root = createRoot(dom)
                flushSync(() => root.render(content))
                return { dom, destroy: () => queueMicrotask(() => root.unmount()) }
            },
        }
    }

    useEffect(() => {
        const editor = view.current
        if (editor === null || doc !== undefined || editor.state.doc.toString() === value) return
        editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    }, [value])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.language.reconfigure(languageExtension(language)) })
        if (!isLazy(language) || loaded.has(language)) return
        let live = true
        loadCodeLanguage(language).then(
            () => {
                if (live) setLanguageReady((count) => count + 1)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [language])

    // A language that loaded after the editor was made is put in once it is there.
    useEffect(() => {
        if (languageReady > 0) view.current?.dispatch({ effects: compartments.current.language.reconfigure(languageExtension(language)) })
    }, [languageReady])

    useEffect(() => {
        if (language !== 'json' && language !== 'yaml') setAddress(undefined)
        else setAddress(namedSchema(view.current?.state.doc.toString() ?? value, language))
    }, [language])

    // The schema a document names is found once per address; the 2020-12 dialect is the checker's own.
    useEffect(() => {
        if (given !== undefined || address === undefined) return
        let live = true
        const find = props.current.resolveSchema
        Promise.resolve(find?.(address))
            .then((found) => found ?? (address.replace(/#$/, '') === DRAFT_2020 ? { $id: DRAFT_2020 } : undefined))
            .then(
                (found) => {
                    if (live) setNamed(found === undefined ? undefined : { address, schema: found })
                },
                () => undefined,
            )
        return () => {
            live = false
        }
    }, [address, given === undefined])

    useEffect(() => {
        const editor = view.current
        if (editor === null || reveal === null || reveal === undefined) return
        let at = range(editor.state, reveal)
        if (
            at === null &&
            reveal.from === undefined &&
            reveal.line !== undefined &&
            reveal.line >= 1 &&
            reveal.line <= editor.state.doc.lines
        ) {
            const line = editor.state.doc.line(reveal.line)
            at = { from: line.from, to: line.to }
        }
        if (at === null) return
        editor.dispatch({
            selection: { anchor: at.from, head: at.to },
            effects: EditorView.scrollIntoView(at.from, { y: 'center' }),
        })
        editor.focus()
    }, [reveal])

    useEffect(() => {
        view.current?.dispatch({
            effects: compartments.current.readOnly.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        })
    }, [readOnly])

    useEffect(() => {
        view.current?.dispatch({
            effects: [
                compartments.current.gutter.reconfigure(
                    numbered ? [lineNumbers(), ...(activeLine ? [highlightActiveLineGutter()] : [])] : [],
                ),
                compartments.current.active.reconfigure(activeLine ? highlightActiveLine() : []),
            ],
        })
    }, [numbered, activeLine])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.wrap.reconfigure(wrap ? EditorView.lineWrapping : []) })
    }, [wrap])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.keys.reconfigure(extensions.keys()) })
    }, [keyNames])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.search.reconfigure(extensions.search()) })
    }, [search])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.folding.reconfigure(extensions.folding()) })
    }, [folding, large])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.look.reconfigure(extensions.look()) })
    }, [bracketColors, indentGuides, large])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.size.reconfigure(SIZES[size]) })
    }, [size])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.schema.reconfigure(extensions.schema()) })
    }, [schemaLanguage])

    // The schema checker loads with the first schema; what it finds is drawn as soon as it is there.
    useEffect(() => {
        if (schemaLanguage === undefined || loadedValidate() !== undefined) return
        let live = true
        loadValidate().then(
            () => {
                const editor = view.current
                if (live && editor !== null) editor.dispatch(setDiagnostics(editor.state, diagnose(editor.state)))
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [schemaLanguage])

    useEffect(() => {
        view.current?.dispatch({ effects: compartments.current.lint.reconfigure(extensions.lint()) })
    }, [diagnosing])

    useEffect(() => {
        const editor = view.current
        if (editor === null) return
        editor.dispatch({ effects: setMarks.of(marks) })
        if (diagnosing) editor.dispatch(setDiagnostics(editor.state, diagnose(editor.state)))
        else if (diagnosticCount(editor.state) > 0) editor.dispatch(setDiagnostics(editor.state, []))
    }, [marks, schema, words, language])

    return (
        <div
            ref={host}
            data-slot="code-editor"
            aria-invalid={invalid || undefined}
            className={cn(
                'overflow-hidden [&_.cm-editor]:h-full',
                variant === 'field'
                    ? 'min-h-24 rounded-control border border-input bg-field [--editor-paper:var(--field)] focus-within:border-ring/80 aria-invalid:border-destructive'
                    : 'h-full min-h-0 bg-background [--editor-paper:var(--background)]',
                readOnly && variant === 'field' && 'bg-muted/40 [--editor-paper:color-mix(in_oklab,var(--muted)_40%,var(--background))]',
                className,
            )}
        />
    )
}
