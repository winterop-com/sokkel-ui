import { AnswerColumn } from '@winterop-com/sokkel-ui/AnswerColumn'
import { Composer } from '@winterop-com/sokkel-ui/Composer'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { ShowMore } from '@winterop-com/sokkel-ui/ShowMore'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { Columns3, Pencil, Plus, RotateCcw, Square, Trash2, X } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { comparisons as kept } from '../data/backend'
import { bytes, clock, day } from '../data/format'
import type { CompareColumn, Comparison } from '../data/model'
import { compare, compareKey, rerunColumn, stopColumn, stopComparison } from '../engine/chat'
import { live, usageOf, writing } from '../engine/stream'
import { useApp } from '../state'
import { ModelSelect } from './ChatSettings'

interface Draft {
    models: string[]
    prompt: string
    temperature: number
    maxTokens: number
}

const FIRST_DRAFT: Draft = {
    models: ['kelp-3b-q4_k_m', 'tide-7b-instruct-q4_k_m', 'reef-8b-q4_k_m'],
    prompt: '',
    temperature: 0.7,
    maxTokens: 512,
}

/** One column of a comparison: what is being written while it streams, else what was kept. */
function Answer({
    comparison,
    index,
    column,
    onRemove,
}: {
    comparison: Comparison
    index: number
    column: CompareColumn
    onRemove?: () => void
}) {
    const { modelOf } = useApp()
    const now = useStore(live)[compareKey(comparison.id, index)]
    const model = modelOf(column.model)
    const state = now === undefined ? column.state : now.phase === 'loading' || now.phase === 'waiting' ? 'waiting' : now.phase
    const text = now?.text ?? column.text
    const usage = now !== undefined && now.first !== null ? usageOf(now) : column.usage
    return (
        <AnswerColumn
            model={model?.name ?? column.model}
            detail={
                model === undefined
                    ? 'not in the library'
                    : `${model.quant} · ${bytes(model.size)}${now?.phase === 'loading' ? ' · loading' : ''}`
            }
            state={state}
            reasoning={now?.reasoning ?? column.reasoning}
            content={text}
            usage={usage ?? undefined}
            problem={now?.problem ?? column.problem}
            onStop={() => stopColumn(comparison.id, index)}
            onRetry={() => void rerunColumn(comparison.id, index)}
            onRemove={onRemove}
            className="min-h-80"
        />
    )
}

/** One prompt sent to two, three or four models side by side, each column streaming its answer with its usage under it. */
export function ComparePage({ id }: { id: string | undefined }) {
    const { comparisons, models } = useApp()
    const [draft, setDraft] = useStored<Draft>('models.compare.draft', FIRST_DRAFT)
    const all = useStore(live)
    const sorted = [...comparisons].sort((a, b) => b.time - a.time)
    const shown = id === 'new' ? undefined : id === undefined ? sorted[0] : comparisons.find((one) => one.id === id)
    const running = shown !== undefined && writing(all, `cmp:${shown.id}:`)
    const picked = draft.models.filter((model) => models.some((one) => one.id === model))
    const ready = draft.prompt.trim() !== '' && picked.length >= 2
    const run = () => {
        if (!ready) return
        void compare(draft.prompt.trim(), picked, draft.temperature, draft.maxTokens).then((made) => go(`/compare/${made.id}`))
    }
    const change = (patch: Partial<Draft>) => setDraft((now) => ({ ...now, ...patch }))
    const free = models.find((model) => !draft.models.includes(model.id))

    return (
        <Stack gap="page">
            <PageHeader
                title="Compare"
                count={shown === undefined ? undefined : `${String(shown.columns.length)} models`}
                actions={
                    <>
                        {sorted.length > 0 && (
                            <Select
                                items={sorted.map((one) => ({ value: one.id, label: `${day(one.time)} ${clock(one.time)}` }))}
                                value={shown?.id ?? null}
                                onValueChange={(next) => next !== null && go(`/compare/${next}`)}
                            >
                                <SelectTrigger size="sm" aria-label="Earlier comparisons" className="max-w-56">
                                    <SelectValue placeholder="Earlier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sorted.map((one) => (
                                        <SelectItem key={one.id} value={one.id}>
                                            {day(one.time)} {clock(one.time)}
                                            <span className="truncate text-muted-foreground">{one.prompt.slice(0, 40)}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {shown !== undefined && (
                            <IconButton
                                label="Delete this comparison"
                                onClick={() => {
                                    stopComparison(shown.id)
                                    void kept.remove(shown.id).then(() => go('/compare/new'))
                                }}
                            >
                                <Trash2 aria-hidden />
                            </IconButton>
                        )}
                    </>
                }
            />
            <Section title="Prompt" description="Sent to every model chosen, each answering on its own at the same settings.">
                <Stack gap="lg">
                    <Row gap="sm" wrap>
                        {draft.models.map((model, index) => (
                            <Row key={`${model}-${String(index)}`} gap="2xs">
                                <ModelSelect
                                    label={`Model ${String(index + 1)}`}
                                    value={model}
                                    onChange={(next) => change({ models: draft.models.map((one, at) => (at === index ? next : one)) })}
                                />
                                {draft.models.length > 2 && (
                                    <IconButton
                                        label={`Take model ${String(index + 1)} away`}
                                        onClick={() => change({ models: draft.models.filter((_, at) => at !== index) })}
                                    >
                                        <X aria-hidden />
                                    </IconButton>
                                )}
                            </Row>
                        ))}
                        {draft.models.length < 4 && free !== undefined && (
                            <Button size="sm" variant="outline" onClick={() => change({ models: [...draft.models, free.id] })}>
                                <Plus aria-hidden />
                                Add a model
                            </Button>
                        )}
                    </Row>
                    <Columns count={2} min="md" gap="xl">
                        <SliderField
                            id="compare-temperature"
                            label="Temperature"
                            value={draft.temperature}
                            onChange={(temperature) => change({ temperature })}
                            max={2}
                            step={0.05}
                            format={(value) => value.toFixed(2)}
                        />
                        <NumberField
                            id="compare-max-tokens"
                            label="Max tokens"
                            integer
                            step={64}
                            min={1}
                            max={8192}
                            value={draft.maxTokens}
                            onValueChange={(maxTokens) => maxTokens !== null && maxTokens >= 1 && change({ maxTokens })}
                        />
                    </Columns>
                    <Composer
                        value={draft.prompt}
                        onChange={(prompt) => change({ prompt })}
                        onSend={run}
                        onStop={() => shown !== undefined && stopComparison(shown.id)}
                        busy={running}
                        disabled={picked.length < 2}
                        words={{
                            placeholder: picked.length < 2 ? 'Choose two models first' : `Prompt for the ${String(picked.length)} models`,
                            send: 'Run',
                        }}
                    />
                </Stack>
            </Section>
            {shown === undefined ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Columns3 aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>Nothing compared yet</EmptyTitle>
                        <EmptyDescription>
                            Choose the models, write a prompt, and press Enter: each answers in a column of its own.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Stack gap="lg">
                    <Section
                        title="Asked"
                        description={`${day(shown.time)} ${clock(shown.time)}, temperature ${shown.temperature.toFixed(2)}, at most ${shown.maxTokens.toLocaleString('en-US')} tokens`}
                        actions={
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        change({
                                            prompt: shown.prompt,
                                            models: shown.columns.map((column) => column.model),
                                            temperature: shown.temperature,
                                            maxTokens: shown.maxTokens,
                                        })
                                    }
                                >
                                    <Pencil aria-hidden />
                                    Edit
                                </Button>
                                {running ? (
                                    <Button size="sm" variant="outline" onClick={() => stopComparison(shown.id)}>
                                        <Square aria-hidden />
                                        Stop all
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => shown.columns.forEach((_, index) => void rerunColumn(shown.id, index))}
                                    >
                                        <RotateCcw aria-hidden />
                                        Run all again
                                    </Button>
                                )}
                            </>
                        }
                    >
                        <ShowMore>{shown.prompt}</ShowMore>
                    </Section>
                    <Columns count={shown.columns.length >= 4 ? 4 : shown.columns.length === 3 ? 3 : 2} min="lg" gap="inspector">
                        {shown.columns.map((column, index) => (
                            <Answer
                                key={`${shown.id}-${String(index)}`}
                                comparison={shown}
                                index={index}
                                column={column}
                                onRemove={
                                    shown.columns.length > 1 && !running
                                        ? () => {
                                              stopColumn(shown.id, index)
                                              void kept.update(shown.id, { columns: shown.columns.filter((_, at) => at !== index) })
                                          }
                                        : undefined
                                }
                            />
                        ))}
                    </Columns>
                </Stack>
            )}
        </Stack>
    )
}
