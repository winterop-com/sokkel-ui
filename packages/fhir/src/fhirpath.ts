import type { StreamParser } from '@codemirror/language'
import type { PluginLanguage } from '@winterop-com/sokkel-ui/lib/plugins'

import { COMMENT_TOKENS, copyState, programToken, startState, type ProgramState, type ProgramSyntax } from './program'

export type { ProgramState } from './program'

/** The words FHIRPath's grammar spells as operators and literals. */
const KEYWORDS: ReadonlySet<string> = new Set(['and', 'or', 'xor', 'implies', 'is', 'as', 'div', 'mod', 'in', 'contains', 'true', 'false'])

const SYNTAX: ProgramSyntax = {
    keywords: KEYWORDS,
    operator: /^(?:!=|!~|<=|>=|[=~<>+\-*/&|])/,
    punctuation: /^,/,
    number: /^\d+(?:\.\d+)?/,
    quotedName: /^`(?:[^`\\]|\\.)*`/,
    binding: /^(?:%(?:[A-Za-z_]\w*|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')|\$(?:this|index|total)\b)/,
}

/**
 * FHIRPath as a CodeMirror stream parser: a name followed by `(` is a function, a name after `.` is
 * a member even when it is spelled like a keyword, `%name` and `$this` are bound from outside the
 * expression, a backticked name is a name, a single-quoted text is a string, and `@2026-01-01` is a
 * date.
 */
export const fhirpathParser: StreamParser<ProgramState> & { name: string } = {
    name: 'fhirpath',
    startState,
    copyState,
    token: (stream, state) => programToken(stream, state, SYNTAX),
    languageData: {
        commentTokens: COMMENT_TOKENS,
        closeBrackets: { brackets: ['(', '[', '{', "'", '`'] },
    },
}

/** FHIRPath as a plugin's language: `language="fhirpath"`, written as `text/fhirpath` or `application/fhirpath`. */
export const fhirpathLanguage: PluginLanguage = {
    name: 'fhirpath',
    language: fhirpathParser as StreamParser<unknown> & { name: string },
    mediaTypes: ['text/fhirpath', 'application/fhirpath'],
}
