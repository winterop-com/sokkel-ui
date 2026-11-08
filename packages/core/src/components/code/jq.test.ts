import { StringStream } from '@codemirror/language'
import { describe, expect, it } from 'vitest'

import { jqParser } from './jq'

/** Each token of the lines as [text, type], the blanks left out. */
function tokens(...lines: string[]): [string, string | null][] {
    const state = jqParser.startState!(2)
    const out: [string, string | null][] = []
    for (const line of lines) {
        const stream = new StringStream(line, 4, 2)
        while (!stream.eol()) {
            const type = jqParser.token(stream, state)
            const text = stream.current()
            if (text.trim() !== '') out.push([text, type])
            stream.start = stream.pos
        }
    }
    return out
}

describe('the jq language', () => {
    it('reads keywords, definitions, variables and fields', () => {
        expect(tokens('def total($x): reduce .[] as $row (0; . + $row.amount); if .a then 1 else null end')).toEqual([
            ['def', 'definitionKeyword'],
            ['total', 'variableName.definition'],
            ['(', 'bracket'],
            ['$x', 'variableName'],
            [')', 'bracket'],
            [':', 'punctuation'],
            ['reduce', 'controlKeyword'],
            ['.', 'operator'],
            ['[', 'bracket'],
            [']', 'bracket'],
            ['as', 'controlKeyword'],
            ['$row', 'variableName'],
            ['(', 'bracket'],
            ['0', 'number'],
            [';', 'punctuation'],
            ['.', 'operator'],
            ['+', 'operator'],
            ['$row', 'variableName'],
            ['.amount', 'propertyName'],
            [')', 'bracket'],
            [';', 'punctuation'],
            ['if', 'controlKeyword'],
            ['.a', 'propertyName'],
            ['then', 'controlKeyword'],
            ['1', 'number'],
            ['else', 'controlKeyword'],
            ['null', 'null'],
            ['end', 'controlKeyword'],
        ])
    })

    it('reads string interpolation as code inside a string', () => {
        expect(tokens('"run \\(.id | tostring) of \\(.job)"')).toEqual([
            ['"', 'string'],
            ['run ', 'string'],
            ['\\(', 'string.special'],
            ['.id', 'propertyName'],
            ['|', 'operator'],
            ['tostring', 'variableName.function'],
            [')', 'string.special'],
            [' of ', 'string'],
            ['\\(', 'string.special'],
            ['.job', 'propertyName'],
            [')', 'string.special'],
            ['"', 'string'],
        ])
    })

    it('reads formats, quoted fields, comments, operators and the alternative', () => {
        expect(tokens('@base64 ."a b" // 2.5e3 # note', '.x |= not and true')).toEqual([
            ['@base64', 'string.special'],
            ['."a b"', 'propertyName'],
            ['//', 'operator'],
            ['2.5e3', 'number'],
            ['# note', 'comment'],
            ['.x', 'propertyName'],
            ['|=', 'operator'],
            ['not', 'operatorKeyword'],
            ['and', 'operatorKeyword'],
            ['true', 'bool'],
        ])
    })

    it('keeps a string open across lines', () => {
        expect(tokens('"first', 'second" | length')).toEqual([
            ['"', 'string'],
            ['first', 'string'],
            ['second', 'string'],
            ['"', 'string'],
            ['|', 'operator'],
            ['length', 'variableName.function'],
        ])
    })
})
