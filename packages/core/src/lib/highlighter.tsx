import * as React from 'react'
import type { GrammarState, HighlighterCore, LanguageInput, ThemeRegistration } from 'shiki/core'

import { ansiCss, parseAnsi, type AnsiStyle } from './ansi'

// The languages the highlighter knows. Each one loads the first time it is used.
const languages: Record<string, LanguageInput> = {
    bash: () => import('shiki/langs/shellscript.mjs'),
    css: () => import('shiki/langs/css.mjs'),
    diff: () => import('shiki/langs/diff.mjs'),
    html: () => import('shiki/langs/html.mjs'),
    javascript: () => import('shiki/langs/javascript.mjs'),
    jq: () => import('./jq-grammar'),
    json: () => import('shiki/langs/json.mjs'),
    jsx: () => import('shiki/langs/jsx.mjs'),
    markdown: () => import('shiki/langs/markdown.mjs'),
    python: () => import('shiki/langs/python.mjs'),
    sql: () => import('shiki/langs/sql.mjs'),
    tsx: () => import('shiki/langs/tsx.mjs'),
    typescript: () => import('shiki/langs/typescript.mjs'),
    yaml: () => import('shiki/langs/yaml.mjs'),
}

const aliases: Record<string, string> = {
    js: 'javascript',
    md: 'markdown',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    shellscript: 'bash',
    ts: 'typescript',
    yml: 'yaml',
    zsh: 'bash',
}

/**
 * Adds a language the highlighter colors in `Code`, `Markdown`'s fences and everything else that
 * highlights, under `name` and any `aliases`. `grammar` is a Shiki language (a TextMate grammar):
 * a function that imports it, such as `() => import('shiki/langs/rust.mjs')`, so it loads the
 * first time code in it is drawn, or the grammar itself. Its `name` must be `name` or one of its own
 * aliases. Registering a name again replaces it for code not yet drawn in it.
 */
export function registerLanguage(name: string, grammar: LanguageInput, options: { aliases?: readonly string[] } = {}): void {
    const key = name.toLowerCase()
    languages[key] = grammar
    for (const alias of options.aliases ?? []) aliases[alias.toLowerCase()] = key
}

const color = (role: string) => `var(--code-${role})`

/**
 * The one theme: every TextMate scope drawn in a `code-*` token, so code follows the theme and
 * scheme around it with no second pass. Text no scope names takes the color around it.
 */
const THEME_NAME = 'sokkel'

const THEME: ThemeRegistration = {
    name: THEME_NAME,
    type: 'light',
    fg: 'inherit',
    bg: 'transparent',
    settings: [
        { settings: { foreground: 'inherit', background: 'transparent' } },
        {
            scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
            settings: { foreground: color('comment'), fontStyle: 'italic' },
        },
        {
            scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control'],
            settings: { foreground: color('keyword') },
        },
        {
            scope: ['keyword.operator', 'keyword.operator.word', 'punctuation.accessor', 'punctuation.separator.key-value'],
            settings: { foreground: color('operator') },
        },
        {
            scope: ['punctuation', 'meta.brace', 'punctuation.definition.tag', 'punctuation.section.embedded'],
            settings: { foreground: color('punctuation') },
        },
        {
            scope: ['string', 'punctuation.definition.string', 'string.quoted', 'string.unquoted', 'markup.inline.raw', 'markup.raw'],
            settings: { foreground: color('string') },
        },
        { scope: ['string.regexp', 'constant.character.escape', 'constant.other.placeholder'], settings: { foreground: color('regexp') } },
        { scope: ['constant.numeric', 'keyword.other.unit'], settings: { foreground: color('number') } },
        {
            scope: ['constant.language', 'constant.other', 'support.constant', 'variable.other.constant', 'variable.other.enummember'],
            settings: { foreground: color('constant') },
        },
        {
            scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function', 'variable.function'],
            settings: { foreground: color('function') },
        },
        {
            scope: [
                'variable.parameter',
                'variable.language',
                'variable.other.normal',
                'variable.other.special',
                'variable.other.positional',
                'variable.other.bracket',
                'variable.other.jq',
                'punctuation.definition.variable',
            ],
            settings: { foreground: color('variable') },
        },
        {
            scope: [
                'entity.name.type',
                'entity.name.class',
                'entity.name.namespace',
                'entity.other.inherited-class',
                'support.type',
                'support.class',
                'storage.type.primitive',
                'meta.type.annotation entity.name.type',
            ],
            settings: { foreground: color('type') },
        },
        {
            scope: [
                'variable.other.property',
                'variable.other.object.property',
                'meta.object-literal.key',
                'support.type.property-name',
                'entity.name.tag.yaml',
                'meta.mapping.key string',
                'support.variable.property',
            ],
            settings: { foreground: color('property') },
        },
        { scope: ['entity.name.tag', 'meta.tag.sgml'], settings: { foreground: color('tag') } },
        { scope: ['entity.other.attribute-name'], settings: { foreground: color('attribute') } },
        {
            scope: ['markup.heading', 'entity.name.section', 'markup.heading entity.name'],
            settings: { foreground: color('heading'), fontStyle: 'bold' },
        },
        { scope: ['markup.underline.link', 'string.other.link', 'markup.link'], settings: { foreground: color('link') } },
        { scope: ['markup.inserted', 'punctuation.definition.inserted'], settings: { foreground: color('inserted') } },
        { scope: ['markup.deleted', 'punctuation.definition.deleted'], settings: { foreground: color('deleted') } },
        { scope: ['meta.diff.range', 'meta.diff.header', 'meta.diff.index'], settings: { foreground: color('type') } },
        { scope: ['markup.bold', 'strong'], settings: { fontStyle: 'bold' } },
        { scope: ['markup.italic', 'emphasis'], settings: { fontStyle: 'italic' } },
        { scope: ['invalid', 'invalid.illegal'], settings: { foreground: color('invalid') } },
    ],
}

let highlighter: Promise<HighlighterCore> | undefined

/** Shiki and its regex engine, fetched with the first code drawn, so a page with no code fetches neither. */
function getHighlighter() {
    highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
        ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
            createHighlighterCore({
                themes: [THEME],
                langs: [],
                engine: createJavaScriptRegexEngine({ forgiving: true }),
            }),
    )
    highlighter.catch(() => {
        highlighter = undefined
    })

    return highlighter
}

function getLanguage(language: string): string | null {
    const name = language.toLowerCase()

    if (name === 'ansi' || name in languages) {
        return name
    }

    return aliases[name] ?? null
}

/** Where highlighted code left off: the grammar's state, and how deep in brackets it is. */
export interface CodeState {
    grammar: GrammarState
    depth: number
}

/** The highlighter's state after a piece of code: the code's, or for ANSI output the style in force. */
export type HighlightState = CodeState | AnsiStyle

const isCode = (state: HighlightState | undefined): state is CodeState => state !== undefined && 'grammar' in state

/** Text a bracket inside it is not a bracket of the code's. */
const QUOTED = new Set([color('string'), color('comment'), color('regexp')])
const OPENING = '([{'
const CLOSING = ')]}'

/** ANSI output, line by line, each run in the style its escapes set. */
function highlightAnsi(code: string, state?: HighlightState) {
    const { segments, style } = parseAnsi(code, state !== undefined && !isCode(state) ? state : {})
    const lines: React.ReactNode[][] = [[]]
    for (const segment of segments) {
        segment.text.split('\n').forEach((part, index) => {
            if (index > 0) lines.push([])
            if (part === '') return
            const line = lines[lines.length - 1]
            line.push(
                <span key={line.length} style={ansiCss(segment.style) as React.CSSProperties}>
                    {part}
                </span>,
            )
        })
    }
    return { lines: lines as React.ReactNode[], state: style as HighlightState }
}

const FONT_STYLE = { italic: 1, bold: 2, underline: 4 } as const

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export async function loadHighlighter(language: string) {
    const lang = getLanguage(language)

    if (!lang) {
        return null
    }

    if (lang === 'ansi') {
        return { highlight: highlightAnsi }
    }

    const shiki = await getHighlighter()

    if (!shiki.getLoadedLanguages().includes(lang)) {
        await shiki.loadLanguage(languages[lang])
    }

    if (!shiki.getLoadedLanguages().includes(lang)) {
        return null
    }

    return {
        // Returns one React node per line, and the state after the last line.
        // Pass that state back to continue where the code left off. Bracket
        // pairs take code-bracket-1 to 3 by how deeply they nest.
        highlight(code: string, state?: HighlightState) {
            const tokens = shiki.codeToTokens(code, {
                lang,
                theme: THEME_NAME,
                grammarState: isCode(state) ? state.grammar : undefined,
            }).tokens
            let depth = isCode(state) ? state.depth : 0
            const bracket = (char: string, key: string) => {
                const closing = CLOSING.includes(char)
                if (closing) depth = Math.max(0, depth - 1)
                const span = (
                    <span key={key} style={{ color: color(`bracket-${String((depth % 3) + 1)}`) }}>
                        {char}
                    </span>
                )
                if (!closing) depth += 1
                return span
            }

            const lines = tokens.map((line) =>
                line.flatMap((token, index) => {
                    const font = token.fontStyle ?? 0
                    const style: React.CSSProperties = {}
                    if (token.color !== undefined && token.color !== 'inherit') style.color = token.color
                    if (font & FONT_STYLE.italic) style.fontStyle = 'italic'
                    if (font & FONT_STYLE.bold) style.fontWeight = 600
                    if (font & FONT_STYLE.underline) style.textDecorationLine = 'underline'
                    if (QUOTED.has(token.color ?? '') || !/[()[\]{}]/.test(token.content)) {
                        return [
                            <span key={index} style={style}>
                                {token.content}
                            </span>,
                        ]
                    }
                    return token.content
                        .split(/([()[\]{}])/)
                        .filter((part) => part !== '')
                        .map((part, at) =>
                            OPENING.includes(part) || CLOSING.includes(part) ? (
                                bracket(part, `${String(index)}.${String(at)}`)
                            ) : (
                                <span key={`${String(index)}.${String(at)}`} style={style}>
                                    {part}
                                </span>
                            ),
                        )
                }),
            )

            return { lines, state: { grammar: shiki.getLastGrammarState(tokens), depth } as HighlightState }
        },
    }
}

/** Whether a language is one the highlighter colors; code in any other is drawn plain. */
export function hasLanguage(language: string): boolean {
    return getLanguage(language) !== null
}
