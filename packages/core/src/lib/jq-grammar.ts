import type { LanguageRegistration } from 'shiki/core'

const NAME = '[A-Za-z_][A-Za-z0-9_]*'

/**
 * A TextMate grammar for jq, which Shiki does not carry: comments, strings with `\(…)`
 * interpolation, numbers, keywords, `true`, `false` and `null`, `$variables`, `.fields`, `@formats`,
 * definitions, calls and operators.
 */
const jq: LanguageRegistration = {
    name: 'jq',
    scopeName: 'source.jq',
    displayName: 'jq',
    patterns: [{ include: '#expression' }],
    repository: {
        expression: {
            patterns: [
                { include: '#comment' },
                { include: '#string' },
                { include: '#group' },
                { include: '#definition' },
                { include: '#keyword' },
                { include: '#constant' },
                { include: '#number' },
                { include: '#variable' },
                { include: '#field' },
                { include: '#format' },
                { include: '#call' },
                { include: '#operator' },
                { include: '#punctuation' },
            ],
        },
        comment: { match: '#.*$', name: 'comment.line.number-sign.jq' },
        string: {
            begin: '"',
            end: '"',
            name: 'string.quoted.double.jq',
            patterns: [
                {
                    begin: '\\\\\\(',
                    end: '\\)',
                    name: 'meta.interpolation.jq',
                    beginCaptures: { 0: { name: 'punctuation.section.interpolation.begin.jq' } },
                    endCaptures: { 0: { name: 'punctuation.section.interpolation.end.jq' } },
                    contentName: 'source.jq',
                    patterns: [{ include: '#expression' }],
                },
                { match: '\\\\.', name: 'constant.character.escape.jq' },
            ],
        },
        group: {
            begin: '\\(',
            end: '\\)',
            beginCaptures: { 0: { name: 'punctuation.section.parens.begin.jq' } },
            endCaptures: { 0: { name: 'punctuation.section.parens.end.jq' } },
            patterns: [{ include: '#expression' }],
        },
        definition: {
            match: `\\b(def)\\s+(${NAME})`,
            captures: { 1: { name: 'keyword.other.def.jq' }, 2: { name: 'entity.name.function.jq' } },
        },
        keyword: {
            patterns: [
                { match: '\\b(and|or|not)\\b', name: 'keyword.operator.word.jq' },
                {
                    match: '\\b(as|if|then|elif|else|end|reduce|foreach|try|catch|label|import|include|def)\\b',
                    name: 'keyword.control.jq',
                },
            ],
        },
        constant: { match: '\\b(true|false|null)\\b', name: 'constant.language.jq' },
        number: { match: '\\b[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?\\b', name: 'constant.numeric.jq' },
        variable: { match: `\\$(__loc__|${NAME}(::${NAME})*)`, name: 'variable.other.jq' },
        field: {
            patterns: [
                { match: `\\.${NAME}`, name: 'variable.other.property.jq' },
                { match: '\\.(?=")', name: 'punctuation.accessor.jq' },
            ],
        },
        format: { match: '@[A-Za-z0-9_]+', name: 'support.function.format.jq' },
        call: { match: `\\b${NAME}(::${NAME})*\\b`, name: 'entity.name.function.call.jq' },
        operator: { match: '\\?//|//=|\\|=|\\+=|-=|\\*=|/=|%=|==|!=|<=|>=|//|\\.\\.|[|+\\-*/%<>=?]', name: 'keyword.operator.jq' },
        punctuation: { match: '[\\[\\]{},:;.]', name: 'punctuation.jq' },
    },
}

export default [jq]
