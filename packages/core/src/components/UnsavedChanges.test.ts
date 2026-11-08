import { describe, expect, it } from 'vitest'

import { leaveQuestion } from './UnsavedChanges'

describe('leaveQuestion', () => {
    it('lets the page go at once when nothing is unsaved, asking nothing', async () => {
        const heard: boolean[] = []
        const question = leaveQuestion((asking) => heard.push(asking))
        await expect(question.ask(false)).resolves.toBe(true)
        expect(heard).toEqual([])
    })

    it('asks while changes are unsaved and answers with the choice', async () => {
        const heard: boolean[] = []
        const question = leaveQuestion((asking) => heard.push(asking))
        const leaving = question.ask(true)
        expect(question.asking).toBe(true)
        question.answer(true)
        await expect(leaving).resolves.toBe(true)
        expect(heard).toEqual([true, false])

        const staying = question.ask(true)
        question.answer(false)
        await expect(staying).resolves.toBe(false)
        expect(question.asking).toBe(false)
    })

    it('answers a second ask while open with the same answer, opening once', async () => {
        const heard: boolean[] = []
        const question = leaveQuestion((asking) => heard.push(asking))
        const first = question.ask(true)
        const second = question.ask(true)
        expect(second).toBe(first)
        question.answer(true)
        await expect(second).resolves.toBe(true)
        expect(heard).toEqual([true, false])
    })

    it('answers stay to an ask still waiting when the page goes, closing nothing', async () => {
        const heard: boolean[] = []
        const question = leaveQuestion((asking) => heard.push(asking))
        const waiting = question.ask(true)
        question.drop()
        await expect(waiting).resolves.toBe(false)
        expect(heard).toEqual([true])
    })
})
