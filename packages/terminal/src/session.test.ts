import { describe, expect, it } from 'vitest'

import { nextWrite, sessionText } from './session'

const E = '\u001b['
const exited = (code: number) => `exited with ${code}`

describe('sessionText', () => {
    it('draws the prompt before a command and its output on the lines after', () => {
        expect(sessionText([{ id: '1', command: 'jobs list', output: 'nightly-export\nsend-digest' }], '$', exited)).toBe(
            `${E}34m$${E}0m jobs list\r\nnightly-export\r\nsend-digest`,
        )
    })

    it('says how a failed command ended, and nothing for one that succeeded', () => {
        const text = sessionText(
            [
                { id: '1', command: 'jobs run nightly-export', exitCode: 1 },
                { id: '2', command: 'true', exitCode: 0 },
            ],
            '$',
            exited,
        )
        expect(text).toContain(`${E}31mexited with 1`)
        expect(text).not.toContain('exited with 0')
    })

    it('only adds to what was written as an output grows and entries follow', () => {
        const before = sessionText([{ id: '1', command: 'jobs run import-orders', output: `${E}1mfetch${E}0m ok\r[#...]` }], '$', exited)
        const after = sessionText(
            [
                { id: '1', command: 'jobs run import-orders', output: `${E}1mfetch${E}0m ok\r[#...]\r[####]\n${E}32mdone` },
                { id: '2', command: 'echo $?', output: '0' },
            ],
            '$',
            exited,
        )
        expect(after.startsWith(before)).toBe(true)
    })
})

describe('nextWrite', () => {
    it('writes only what was added when the text continues', () => {
        expect(nextWrite('fetch', 'fetch ok')).toEqual({ reset: false, data: ' ok' })
    })

    it('resets and writes everything when what was written changed', () => {
        expect(nextWrite('fetch ok', 'validate')).toEqual({ reset: true, data: 'validate' })
    })
})
