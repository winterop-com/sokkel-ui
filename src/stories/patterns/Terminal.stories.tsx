import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { Terminal, type TerminalEntry } from '../../components/terminal/Terminal'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * A terminal: commands and what they wrote, escape codes drawn as colors, and output that streams
 * in, follows the newest line, and redraws a progress bar in place.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <div className="flex h-svh flex-col bg-background p-6 text-foreground">{children}</div>
        </TooltipProvider>
    )
}

const E = '\u001b['

const SESSION: TerminalEntry[] = [
    {
        id: '1',
        command: 'jobs list --project larkspur',
        output: `${E}2mCODE              STATE       LAST RUN${E}0m
nightly-export    ${E}31mfailed${E}0m      02:00
import-orders     ${E}36mrunning${E}0m     14:02
rebuild-index     ${E}32msucceeded${E}0m   01:40
send-digest       ${E}32msucceeded${E}0m   01:00`,
    },
    {
        id: '2',
        command: 'jobs run nightly-export',
        output: `${E}1mfetch${E}0m      read 2,184 rows ${E}2m(0.9s)${E}0m
${E}1mtransform${E}0m  ${E}33mwarning:${E}0m currency missing on 12 rows; assumed EUR
${E}1mvalidate${E}0m   ${E}31merror:${E}0m amount must be a number (37 rows), first at row 112`,
        exitCode: 1,
    },
    { id: '3', command: 'echo $?', output: '1' },
]

const PROGRESS = (percent: number) =>
    `${E}1mupload${E}0m     [${'#'.repeat(Math.round(percent / 5)).padEnd(20, '.')}] ${String(percent).padStart(3)}%`

function Session() {
    const [entries, setEntries] = useState(SESSION)
    return (
        <Ground>
            <Terminal title="ada@tidevann: ~/jobs" entries={entries} onClear={() => setEntries([])} className="min-h-0 flex-1" />
        </Ground>
    )
}

/** Output caught mid-stream: a progress bar redrawn by carriage returns, and the cursor after it. */
function Midway() {
    return (
        <Ground>
            <Terminal
                title="ada@tidevann: ~/jobs"
                streaming
                className="min-h-0 flex-1"
                entries={[
                    {
                        id: '1',
                        command: 'jobs run import-orders --follow',
                        output: `${E}1mfetch${E}0m      read 4,912 rows ${E}2m(1.4s)${E}0m\n${E}1mvalidate${E}0m   ${E}32mok${E}0m\n${PROGRESS(10)}\r${PROGRESS(35)}\r${PROGRESS(60)}`,
                    },
                ]}
            />
        </Ground>
    )
}

const STEPS = [
    `${E}1mfetch${E}0m      connecting to https://api.example.org`,
    `\n${E}1mfetch${E}0m      read 4,912 rows ${E}2m(1.4s)${E}0m`,
    `\n${E}1mtransform${E}0m  ${E}33mwarning:${E}0m 3 rows had no currency; assumed EUR`,
    `\n${E}1mvalidate${E}0m   ${E}32mok${E}0m`,
    ...Array.from({ length: 21 }, (_, index) => `${index === 0 ? '\n' : '\r'}${PROGRESS(index * 5)}`),
    `\n${E}1mnotify${E}0m     sent to #orders`,
    `\n${E}32mdone${E}0m in 6.2s`,
]

/** A run streaming live: scroll up while it writes and the view stays put, with a way back. */
function Live() {
    const [output, setOutput] = useState('')
    const [step, setStep] = useState(0)
    useEffect(() => {
        if (step >= STEPS.length) return
        const timer = setTimeout(
            () => {
                setOutput((current) => current + STEPS[step])
                setStep(step + 1)
            },
            step > 3 && step < 25 ? 120 : 600,
        )
        return () => clearTimeout(timer)
    }, [step])
    return (
        <Ground>
            <Terminal
                title="ada@tidevann: ~/jobs"
                streaming={step < STEPS.length}
                className="min-h-0 flex-1"
                onClear={() => {
                    setOutput('')
                    setStep(0)
                }}
                entries={[{ id: '1', command: 'jobs run import-orders --follow', output }]}
            />
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Terminal' }
export default meta

export const Session_: StoryObj = { name: 'Session', render: () => <Session /> }
export const Midway_: StoryObj = { name: 'Streaming', render: () => <Midway /> }
export const Live_: StoryObj = { name: 'Live', tags: ['no-screenshot'], render: () => <Live /> }
