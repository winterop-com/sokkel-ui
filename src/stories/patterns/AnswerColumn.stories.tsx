import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AnswerColumn, type AnswerState } from '@winterop-com/sokkel-ui/AnswerColumn'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * One model's answer to a prompt sent to several, as a column beside the others: the model and a
 * short fact about it, the answer's state, the answer streaming in with a caret, and its usage line
 * pinned under it.
 */
const meta: Meta = { title: 'Patterns/Answer column', parameters: { frame: 'padded' } }
export default meta

const ANSWERS = {
    large: `**nightly-export failed at \`validate\` last night.** It read 2,184 rows, and 37 of them carried an \`amount\` that was not a number: most were written with a decimal comma, such as \`12,50\`.

We now parse amounts with the source's locale in \`transform\`:

\`\`\`yaml
transform:
  amount: parse_decimal(amount, locale: "nb-NO")
\`\`\`

Tonight's run should go through. Ask ada if anything looks off.`,
    medium: `nightly-export stopped at the \`validate\` step: **37 of 2,184 rows** had an \`amount\` that was not a number, mostly decimal commas like \`12,50\`.

- \`transform\` now parses amounts with the source's locale.
- Blank amounts are dropped before \`validate\`.

The next run is tonight at 02:00. Questions go to ada.`,
    small: `Last night nightly-export failed in \`validate\`. 37 rows had amounts that were not numbers, because they used a comma as the decimal mark.`,
}

/** An answer cut off part way, as it stands while streaming or once stopped. */
const PARTIAL = 'Last night nightly-export failed in `validate`. 37 rows had amounts that were not numbers, because'

/** Each state a column passes through, side by side. */
export const States: StoryObj = {
    render: () => (
        <TooltipProvider>
            <Columns count={3} min="lg" gap="inspector">
                <AnswerColumn model="kelp-3b" detail="Q4_K_M · 1.9 GB" state="waiting" content="" usage={{ input: 184, output: 0 }} />
                <AnswerColumn
                    model="tide-7b-instruct"
                    detail="Q5_K_M · 5.1 GB"
                    state="streaming"
                    content={PARTIAL}
                    usage={{ input: 184, output: 21, firstToken: 210, rate: 47.8, latency: 650 }}
                    onStop={() => undefined}
                />
                <AnswerColumn
                    model="brine-coder-14b"
                    detail="Q4_K_M · 8.9 GB"
                    state="done"
                    content={ANSWERS.medium}
                    usage={{ input: 184, output: 86, firstToken: 380, rate: 31.2, latency: 3_140 }}
                    onRetry={() => undefined}
                    onRemove={() => undefined}
                />
                <AnswerColumn
                    model="tide-7b-instruct"
                    detail="Q5_K_M · 5.1 GB"
                    state="stopped"
                    content={PARTIAL}
                    usage={{ input: 184, output: 21, firstToken: 210, rate: 47.8, latency: 650 }}
                    onRetry={() => undefined}
                />
                <AnswerColumn
                    model="reef-32b"
                    detail="Q3_K_S · 14.2 GB"
                    state="failed"
                    content=""
                    problem="The model needs 15.8 GB and the runner has 9.4 GB free. Unload a model and run it again."
                    onRetry={() => undefined}
                />
            </Columns>
        </TooltipProvider>
    ),
}

const MODELS = [
    { id: 'kelp-3b', detail: 'Q4_K_M · 1.9 GB', answer: ANSWERS.small, first: 90, rate: 112.4 },
    { id: 'tide-7b-instruct', detail: 'Q5_K_M · 5.1 GB', answer: ANSWERS.medium, first: 210, rate: 47.8 },
    { id: 'brine-coder-14b', detail: 'Q4_K_M · 8.9 GB', answer: ANSWERS.large, first: 380, rate: 31.2 },
] as const

/** A column's answer as a story streams it, a few words at each tick. */
interface Run {
    state: AnswerState
    words: number
}

const wordsOf = (text: string) => text.split(/(?<=\s)/)

/**
 * Run sends one prompt to three models: each waits for its first token, then streams at its own
 * pace with its usage line counting up, and Stop or Run again in its head acts on that column alone.
 */
export const Live: StoryObj = {
    render: function Render() {
        const [runs, setRuns] = useState<Run[]>(MODELS.map((model) => ({ state: 'done', words: wordsOf(model.answer).length })))
        const [tick, setTick] = useState(0)
        const going = runs.some((run) => run.state === 'waiting' || run.state === 'streaming')
        useEffect(() => {
            if (!going) return
            const timer = setTimeout(() => {
                setTick((at) => at + 1)
                setRuns((all) =>
                    all.map((run, index) => {
                        const model = MODELS[index]
                        const total = wordsOf(model.answer).length
                        if (run.state === 'waiting') return tick * 100 >= model.first ? { ...run, state: 'streaming' } : run
                        if (run.state !== 'streaming') return run
                        const words = Math.min(total, run.words + Math.max(1, Math.round(model.rate / 25)))
                        return { state: words >= total ? 'done' : 'streaming', words }
                    }),
                )
            }, 100)
            return () => clearTimeout(timer)
        }, [going, tick])
        const start = (index?: number) => {
            setTick(0)
            setRuns((all) => all.map((run, at) => (index === undefined || at === index ? { state: 'waiting', words: 0 } : run)))
        }
        return (
            <TooltipProvider>
                <Stack gap="lg">
                    <Row>
                        <Button size="sm" onClick={() => start()} disabled={going}>
                            <Play aria-hidden />
                            Run
                        </Button>
                    </Row>
                    <Columns count={3} min="lg" gap="inspector">
                        {MODELS.map((model, index) => {
                            const run = runs[index]
                            const content = wordsOf(model.answer).slice(0, run.words).join('')
                            const output = Math.round(run.words * 1.3)
                            const streamed = run.state === 'waiting' ? undefined : Math.round(model.first + (output / model.rate) * 1000)
                            return (
                                <AnswerColumn
                                    key={model.id}
                                    model={model.id}
                                    detail={model.detail}
                                    state={run.state}
                                    content={content}
                                    usage={{
                                        input: 184,
                                        output,
                                        firstToken: run.state === 'waiting' ? undefined : model.first,
                                        rate: output === 0 ? undefined : model.rate,
                                        latency: streamed,
                                    }}
                                    onStop={() =>
                                        setRuns((all) => all.map((one, at) => (at === index ? { ...one, state: 'stopped' } : one)))
                                    }
                                    onRetry={() => start(index)}
                                    className="h-96"
                                />
                            )
                        })}
                    </Columns>
                </Stack>
            </TooltipProvider>
        )
    },
}
