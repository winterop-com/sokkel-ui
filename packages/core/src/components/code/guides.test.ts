import { json } from '@codemirror/lang-json'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import { describe, expect, it, vi } from 'vitest'

import { bracketMarks, type DepthAt } from './guides'

const marks = (set: DecorationSet) => {
    const out: [number, string][] = []
    set.between(0, Number.MAX_SAFE_INTEGER, (from, _to, value) => {
        out.push([from, String(value.spec.class)])
    })
    return out
}

describe('bracket colors', () => {
    const doc = JSON.stringify({ steps: Array.from({ length: 400 }, (_, index) => ({ name: 'fetch', at: [index, '[x]'] })) }, null, 2)
    const state = EditorState.create({ doc, extensions: [json()] })
    ensureSyntaxTree(state, doc.length, 10_000)

    it('marks the same depths counted on from a kept depth as counted from the start', () => {
        const shown = Math.floor(doc.length * 0.8)
        const end = shown + 2000
        const whole = marks(bracketMarks(state, shown, end, []))
        const kept: DepthAt[] = []
        bracketMarks(state, 0, end, kept)
        expect(kept.length).toBeGreaterThan(2)
        expect(marks(bracketMarks(state, shown, end, kept))).toEqual(whole)
        expect(whole.length).toBeGreaterThan(0)
    })

    it('reads only from the nearest kept depth on a scroll, not from the start', () => {
        const kept: DepthAt[] = []
        bracketMarks(state, 0, doc.length, kept)
        const slice = vi.spyOn(state, 'sliceDoc')
        const shown = doc.length - 1000
        bracketMarks(state, shown, doc.length, kept)
        const [from] = slice.mock.calls[0] ?? [0]
        expect(from).toBeGreaterThan(shown - 5000)
        slice.mockRestore()
    })
})
