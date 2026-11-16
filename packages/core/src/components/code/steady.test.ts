import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { editedHere, fromValue, sameLanguage, sameMarks, sameWords } from './steady'

describe('props given afresh', () => {
    it('are the same marks while they mark the same', () => {
        const marks = [{ path: ['steps', 0], tone: 'error', message: 'Unknown step' }]
        expect(sameMarks(marks, [{ path: ['steps', 0], tone: 'error', message: 'Unknown step' }])).toBe(true)
        expect(sameMarks(marks, [{ path: ['steps', 1], tone: 'error', message: 'Unknown step' }])).toBe(false)
        expect(sameMarks(marks, [])).toBe(false)
    })

    it('are the same words while each word is the same', () => {
        const say = () => 'Wrong'
        expect(sameWords({ deprecated: 'old', say }, { deprecated: 'old', say })).toBe(true)
        expect(sameWords({ deprecated: 'old' }, { deprecated: 'retired' })).toBe(false)
        expect(sameWords({ deprecated: 'old' }, undefined)).toBe(false)
        expect(sameWords(undefined, undefined)).toBe(true)
    })

    it('are the same language for one name, or a stream parser of one name written again', () => {
        const parser = () => ({ name: 'digest', token: () => null })
        expect(sameLanguage('json', 'json')).toBe(true)
        expect(sameLanguage('json', 'yaml')).toBe(false)
        expect(sameLanguage(parser(), parser())).toBe(true)
        expect(sameLanguage(parser(), { name: 'export', token: () => null })).toBe(false)
    })
})

describe('an edit reported', () => {
    it('is one made in the editor, not a new value put in', () => {
        const state = EditorState.create({ doc: '{}' })
        const typed = state.update({ changes: { from: 1, insert: '"a": 1' } })
        const put = state.update({ changes: { from: 0, to: 2, insert: '[]' }, annotations: fromValue.of(true) })
        const moved = state.update({ selection: { anchor: 1 } })
        expect(editedHere([typed])).toBe(true)
        expect(editedHere([put])).toBe(false)
        expect(editedHere([moved])).toBe(false)
        expect(editedHere([put, typed])).toBe(true)
    })
})
