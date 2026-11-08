import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useRef, useState } from 'react'

import { TerminalView, type TerminalHandle, type TerminalSize } from '@winterop-com/sokkel-ui-terminal/TerminalView'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * An interactive terminal. The stories drive a small shell of their own in place of a connection:
 * what is typed comes back through `onData`, and the story writes the answer through the handle, as
 * an app writes what its connection brings.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="none" className="h-svh bg-background p-6 text-foreground">
            {children}
        </Stack>
    )
}

const E = '\u001b['
const PROMPT = `${E}34mada@tidevann${E}0m:${E}36m~/jobs${E}0m$ `

const JOBS = `${E}2mJOB               STATE       LAST RUN${E}0m
nightly-export    ${E}31mfailed${E}0m      02:00
import-orders     ${E}36mrunning${E}0m     14:02
rebuild-index     ${E}32msucceeded${E}0m   01:40
send-digest       ${E}32msucceeded${E}0m   01:00
sync-inventory    ${E}2mqueued${E}0m      -`

const RUN = (job: string) => `${E}1mfetch${E}0m      read 2,184 rows ${E}2m(0.9s)${E}0m
${E}1mtransform${E}0m  ${E}33mwarning:${E}0m currency missing on 12 rows; assumed EUR
${E}1mvalidate${E}0m   ${E}32mok${E}0m
${E}1mupload${E}0m     [####################] 100%
${E}1mnotify${E}0m     sent to grace and linus
${E}32m${job} succeeded${E}0m in 6.2s`

const HELP = `jobs list           the jobs in larkspur and how they last ran
jobs run <job>      run a job: fetch, transform, validate, upload, notify
echo <words>        write the words back
whoami              who is signed in
clear               clear the screen (or Ctrl+L)`

/** What the shell answers to a command, or null for `clear`. */
function answer(command: string): string | null {
    const [name, ...rest] = command.trim().split(/\s+/)
    if (name === undefined || name === '') return ''
    if (name === 'clear') return null
    if (name === 'help') return HELP
    if (name === 'whoami') return 'ada'
    if (name === 'echo') return rest.join(' ')
    if (name === 'jobs' && rest[0] === 'list') return JOBS
    if (name === 'jobs' && rest[0] === 'run' && rest[1] !== undefined) return RUN(rest[1])
    if (name === 'jobs') return `${E}31merror:${E}0m jobs list or jobs run <job>`
    return `tidevann: command not found: ${name}`
}

const crlf = (text: string) => text.replace(/\n/g, '\r\n')

const INTRO = crlf(
    `Tidevann shell. Type ${E}1mhelp${E}0m for the commands.\n\n${PROMPT}jobs list\n${JOBS}\n${PROMPT}jobs run nightly-export\n${RUN('nightly-export')}\n${PROMPT}`,
)

/** A small shell: type a command and press Enter, Backspace edits the line, Ctrl+C drops it and Ctrl+L clears the screen. */
function Shell() {
    const term = useRef<TerminalHandle>(null)
    const line = useRef('')
    const [size, setSize] = useState<TerminalSize | null>(null)

    useEffect(() => {
        term.current?.write(INTRO)
    }, [])

    const take = (data: string) => {
        const handle = term.current
        if (handle === null) return
        // Arrow keys and other escape sequences are not handled by this shell.
        if (data.startsWith('\u001b')) return
        for (const char of data) {
            if (char === '\r') {
                const reply = answer(line.current)
                line.current = ''
                if (reply === null) handle.write(`${E}2J${E}H${PROMPT}`)
                else handle.write(`\r\n${reply === '' ? '' : `${crlf(reply)}\r\n`}${PROMPT}`)
            } else if (char === '\u007f') {
                if (line.current.length > 0) {
                    line.current = line.current.slice(0, -1)
                    handle.write('\b \b')
                }
            } else if (char === '\u0003') {
                line.current = ''
                handle.write(`^C\r\n${PROMPT}`)
            } else if (char === '\u000c') {
                handle.write(`${E}2J${E}H${PROMPT}${line.current}`)
            } else if (char >= ' ') {
                line.current += char
                handle.write(char)
            }
        }
    }

    return (
        <Ground>
            <TerminalView
                ref={term}
                title="ada@tidevann: ~/jobs"
                actions={size === null ? undefined : <span className="text-terminal-muted">{`${size.cols}×${size.rows}`}</span>}
                cursorBlink={false}
                onData={take}
                onResize={setSize}
                onClear={() => term.current?.write(`\r${E}K${PROMPT}${line.current}`)}
                className="min-h-0 flex-1"
            />
        </Ground>
    )
}

interface Row {
    job: string
    state: 'succeeded' | 'failed' | 'running' | 'queued' | 'cancelled' | 'skipped'
    step: string
    done: number
    last: string
    owner: string
}

const ROWS: Row[] = [
    { job: 'import-orders', state: 'running', step: 'transform', done: 0.45, last: '14:02', owner: 'grace' },
    { job: 'rebuild-index', state: 'running', step: 'upload', done: 0.8, last: '13:55', owner: 'linus' },
    { job: 'nightly-export', state: 'failed', step: 'validate', done: 0.6, last: '02:00', owner: 'ada' },
    { job: 'send-digest', state: 'succeeded', step: 'notify', done: 1, last: '01:00', owner: 'margaret' },
    { job: 'sync-inventory', state: 'queued', step: 'fetch', done: 0, last: '-', owner: 'grace' },
]

const STATE_COLOR: Record<Row['state'], string> = {
    succeeded: '32',
    failed: '31',
    running: '36',
    queued: '2',
    cancelled: '33',
    skipped: '2',
}

/** A cell of a screen row: its text, the width it takes and the style around it. */
type Cell = [text: string, width: number, style?: string]

/** The cells of a row that fit in `cols`, each padded to its width. */
function rowOf(cells: Cell[], cols: number): string {
    let used = 0
    let out = ''
    for (const [text, width, style] of cells) {
        if (used + width > cols) break
        const padded = text.slice(0, width).padEnd(width)
        out += style === undefined ? padded : `${E}${style}m${padded}${E}0m`
        used += width
    }
    return out
}

/** A full screen of a job monitor at the size given, drawn as a program draws one: alternate screen, cursor moves and colors. */
function monitor({ cols, rows }: TerminalSize): string {
    const at = (row: number, col = 1) => `${E}${row};${col}H`
    const bar = (done: number, width: number) => {
        const filled = Math.round(done * width)
        return `${'#'.repeat(filled)}${'.'.repeat(width - filled)}`
    }
    const running = ROWS.filter((row) => row.state === 'running').length
    const failed = ROWS.filter((row) => row.state === 'failed').length
    const head = ` tidevann top   larkspur   ${ROWS.length} jobs   ${running} running   ${failed} failed`
    let screen = `${E}?1049h${E}?25l${E}H${E}2J`
    screen += at(1) + `${E}7m${head.padEnd(cols).slice(0, cols)}${E}0m`
    screen += at(1, Math.max(1, cols - 8)) + `${E}7m 14:07:32${E}0m`
    screen +=
        at(3) +
        rowOf(
            [
                [' JOB', 17, '1'],
                ['STATE', 11, '1'],
                ['STEP', 11, '1'],
                ['PROGRESS', 24, '1'],
                ['LAST', 7, '1'],
                ['OWNER', 10, '1'],
            ],
            cols,
        )
    ROWS.forEach((row, index) => {
        const highlighted = index === 2
        screen +=
            at(4 + index) +
            rowOf(
                [
                    [` ${row.job}`, 17, highlighted ? '7' : undefined],
                    [row.state, 11, highlighted ? '7' : STATE_COLOR[row.state]],
                    [row.step, 11, highlighted ? '7' : undefined],
                    [`${bar(row.done, 16)} ${String(Math.round(row.done * 100)).padStart(3)}%`, 24, highlighted ? '7' : '32'],
                    [row.last, 7, highlighted ? '7' : '2'],
                    [row.owner, 10, highlighted ? '7' : undefined],
                ],
                cols,
            )
    })
    const detail = 4 + ROWS.length + 1
    if (detail + 7 < rows && cols >= 60) {
        screen += at(detail) + `${E}1m nightly-export${E}0m ${E}2mrun 418, started 02:00 by scheduler${E}0m`
        const steps: [string, string, string][] = [
            ['fetch', '32', 'read 2,184 rows in 0.9s'],
            ['transform', '33', '12 rows had no currency; assumed EUR'],
            ['validate', '31', 'amount must be a number (37 rows), first at row 112'],
            ['upload', '2', 'not started'],
            ['notify', '2', 'not started'],
        ]
        steps.forEach(([step, color, text], index) => {
            screen += at(detail + 1 + index) + `   ${E}${color}m${step.padEnd(10)}${E}0m ${text.slice(0, cols - 14)}`
        })
    }
    const keys = ' q quit   r rerun   l logs   enter open   / filter'
    screen += at(rows) + `${E}7m${keys.padEnd(cols).slice(0, cols)}${E}0m`
    return screen
}

/**
 * A full-screen program, a job monitor, drawn as one draws in any terminal: the alternate screen,
 * the cursor moved to each place, inverse bars and colors, redrawn when the size changes. Press q to
 * leave it.
 */
function FullScreen() {
    const term = useRef<TerminalHandle>(null)
    const [quit, setQuit] = useState(false)
    return (
        <Ground>
            <TerminalView
                ref={term}
                title="ada@tidevann: jobs top"
                cursorBlink={false}
                onResize={(size) => {
                    if (!quit) term.current?.write(monitor(size))
                }}
                onData={(data) => {
                    if (quit || data !== 'q') return
                    setQuit(true)
                    term.current?.write(`${E}?1049l${E}?25h${PROMPT}`)
                }}
                className="min-h-0 flex-1"
            />
        </Ground>
    )
}

const meta: Meta = { title: 'Terminal/Terminal view' }
export default meta

export const Shell_: StoryObj = { name: 'Shell', render: () => <Shell /> }
export const FullScreen_: StoryObj = { name: 'Full screen', render: () => <FullScreen /> }
