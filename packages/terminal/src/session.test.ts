import { describe, expect, it } from 'vitest'

import { sessionText, sessionWrite, type TerminalEntry } from './session'

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

describe('sessionWrite', () => {
    const write = (before: TerminalEntry[], after: TerminalEntry[]) => {
        const first = sessionWrite(undefined, before, '$', exited)
        const next = sessionWrite(first.written, after, '$', exited)
        // Whatever it writes, the terminal ends up showing the whole session.
        expect(next.reset ? next.data : first.data + next.data).toBe(sessionText(after, '$', exited))
        return next
    }
    const run: TerminalEntry = { id: '1', command: 'jobs run nightly-export', output: 'fetch' }

    it('writes only what was added as the last output grows and entries follow', () => {
        expect(write([run], [{ ...run, output: 'fetch ok' }])).toMatchObject({ reset: false, data: ' ok' })
        expect(write([run], [run, { id: '2', command: 'echo $?', output: '0' }])).toMatchObject({ reset: false })
    })

    it('writes nothing when nothing changed, even as new objects', () => {
        expect(write([run], [{ ...run }])).toMatchObject({ reset: false, data: '' })
    })

    it('adds after entries that showed nothing', () => {
        expect(write([run, { id: '2' }], [run, { id: '2', output: 'validate ok' }])).toMatchObject({ reset: false })
        expect(write([{ id: '0' }], [{ id: '0' }, run])).toMatchObject({ reset: false })
    })

    it('resets and writes everything when what was written changed', () => {
        expect(write([run], [{ ...run, output: 'validate' }]).reset).toBe(true)
        expect(
            write(
                [run, { id: '2', output: '0' }],
                [
                    { ...run, output: 'fetch ok' },
                    { id: '2', output: '0' },
                ],
            ).reset,
        ).toBe(true)
        expect(write([run, { id: '2', output: '0' }], [run]).reset).toBe(true)
    })
})
