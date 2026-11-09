import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Row, Split, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Textarea } from '@winterop-com/sokkel-ui/primitives/textarea'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Cpu, MessageSquarePlus, PowerOff, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { chatWith, useDeleteModels } from '../actions'
import { models as library } from '../data/backend'
import { QUANTS } from '../data/catalog'
import { pathOf } from '../data/disk'
import { bytes, context, counted, day, params } from '../data/format'
import { DEFAULT_SAMPLING, FORMAT_NOTES, SOURCES, type FileRole, type Model, type ModelFile, type Sampling } from '../data/model'
import { ensureLoaded, memoryOf, unloadModel } from '../engine/runner'
import { useApp } from '../state'
import { MemoryChip } from './Library'

const ROLES: Record<FileRole, string> = {
    weights: 'loads',
    projector: 'projector',
    tokenizer: 'tokenizer',
    config: 'config',
    card: 'card',
}

const FILE_COLUMNS: DataColumn<ModelFile>[] = [
    {
        id: 'name',
        header: 'File',
        width: 'minmax(12rem,1fr)',
        cell: (file) => <span className="font-mono">{file.name}</span>,
        sortValue: (file) => file.name,
        stack: 'lead',
    },
    {
        id: 'role',
        header: 'Role',
        width: '7rem',
        cell: (file) =>
            file.role === 'weights' ? (
                <StatusChip status="ready" label={ROLES[file.role]} />
            ) : (
                <span className="text-muted-foreground">{ROLES[file.role]}</span>
            ),
        sortValue: (file) => file.role,
    },
    {
        id: 'size',
        header: 'Size',
        width: '6.5rem',
        align: 'end',
        cell: (file) => <span className="tabular-nums">{bytes(file.size)}</span>,
        sortValue: (file) => file.size,
    },
]

/** The defaults a new conversation with the model starts with, kept as each is changed. */
function Defaults({ model }: { model: Model }) {
    const [system, setSystem] = useState(model.defaults.system)
    const save = (patch: Partial<Sampling>) =>
        void library
            .update(model.id, { defaults: { ...model.defaults, ...patch } })
            .catch((error: unknown) => toast.add({ type: 'error', title: 'Could not save', description: String(error) }))
    return (
        <Stack gap="lg">
            <SliderField
                id="default-temperature"
                label="Temperature"
                value={model.defaults.temperature}
                onChange={(temperature) => save({ temperature })}
                max={2}
                step={0.05}
                format={(value) => value.toFixed(2)}
                help="Higher is more varied, lower more literal. 0 always answers alike."
            />
            <SliderField
                id="default-top-p"
                label="Top p"
                value={model.defaults.topP}
                onChange={(topP) => save({ topP })}
                max={1}
                step={0.05}
                format={(value) => value.toFixed(2)}
                help="Only the likeliest tokens up to this share are drawn from."
            />
            <NumberField
                id="default-max-tokens"
                label="Max tokens"
                hint={`up to ${model.context.toLocaleString('en-US')}`}
                integer
                step={64}
                min={1}
                max={model.context}
                defaultValue={model.defaults.maxTokens}
                onValueChange={(maxTokens) => {
                    if (maxTokens !== null && maxTokens >= 1 && maxTokens <= model.context) save({ maxTokens })
                }}
            />
            <Field id="default-system" label="System prompt" help="Said to the model before every conversation with it starts.">
                <Textarea
                    id="default-system"
                    rows={4}
                    value={system}
                    onChange={(event) => setSystem(event.target.value)}
                    onBlur={() => system !== model.defaults.system && save({ system })}
                />
            </Field>
            <Stack align="start">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setSystem(DEFAULT_SAMPLING.system)
                        save({ ...DEFAULT_SAMPLING })
                    }}
                >
                    <RotateCcw aria-hidden />
                    Reset to the app's defaults
                </Button>
            </Stack>
        </Stack>
    )
}

/** One model: its facts, where it is kept, its files, its card, and the defaults its chats start with. */
export function ModelPage({ id }: { id: string }) {
    const { modelOf, loaded, conversations, prefs, loading } = useApp()
    const model = modelOf(id)
    const removing = useDeleteModels(() => go('/library'))
    if (model === undefined)
        return (
            <PageState loading={loading} empty emptyMessage={`No model ${id} is in the library. It may have been deleted.`}>
                {null}
            </PageState>
        )
    const held = loaded.find((one) => one.id === model.id)
    const path = pathOf(prefs.root, model)
    const talks = conversations.filter((one) => one.model === model.id)
    const files = [...model.files].sort((a, b) => b.size - a.size)
    return (
        <>
            <PageHeader
                title={model.name}
                code={`${model.publisher} · ${model.quant} · ${model.format}`}
                description={`${params(model.params)} parameters · ${bytes(model.size)} · ${context(model.context)} context`}
                actions={
                    <>
                        <Button size="sm" variant="outline" onClick={() => removing.ask([model])}>
                            <Trash2 aria-hidden />
                            Delete
                        </Button>
                        {held === undefined ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    void ensureLoaded(model).catch((error: unknown) =>
                                        toast.add({
                                            type: 'error',
                                            title: `Could not load ${model.name}`,
                                            description: error instanceof Error ? error.message : String(error),
                                        }),
                                    )
                                }
                            >
                                <Cpu aria-hidden />
                                Load
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => void unloadModel(model.id, 'by hand')}>
                                <PowerOff aria-hidden />
                                Unload
                            </Button>
                        )}
                        <Button size="sm" onClick={() => chatWith(model)}>
                            <MessageSquarePlus aria-hidden />
                            Chat
                        </Button>
                    </>
                }
            />
            <Split
                width="lg"
                aside={
                    <Stack gap="page">
                        <Section
                            title="Defaults for new chats"
                            description="Each new conversation with it starts from these; a conversation's own settings change only that one."
                        >
                            <Defaults key={model.id} model={model} />
                        </Section>
                        <Section title="In use">
                            <DescriptionList
                                termWidth="8rem"
                                items={[
                                    { term: 'Runner', value: <MemoryChip held={held} /> },
                                    { term: 'Memory', value: bytes(held?.memory ?? memoryOf(model)), numeric: true },
                                    {
                                        term: 'Conversations',
                                        value: talks.length === 0 ? 'none' : counted(talks.length, 'conversation'),
                                        numeric: true,
                                    },
                                    { term: 'Last used', value: model.used === null ? 'never' : day(model.used) },
                                ]}
                            />
                        </Section>
                    </Stack>
                }
            >
                <Stack gap="page">
                    <Section title="Details">
                        <Stack gap="lg">
                            <TagChips tags={[...new Set([...model.capabilities, ...model.tags])]} />
                            <DescriptionList
                                termWidth="8rem"
                                items={[
                                    { term: 'Publisher', value: model.publisher },
                                    { term: 'Family', value: model.family },
                                    { term: 'Parameters', value: params(model.params), numeric: true },
                                    { term: 'Rounding', value: `${model.quant}: ${QUANTS[model.quant] ?? 'as published'}` },
                                    { term: 'Format', value: `${model.format}: ${FORMAT_NOTES[model.format]}` },
                                    { term: 'Size', value: bytes(model.size), numeric: true },
                                    { term: 'Context', value: `${model.context.toLocaleString('en-US')} tokens`, numeric: true },
                                    { term: 'Source', value: SOURCES[model.source].label },
                                    { term: 'Added', value: day(model.added) },
                                    {
                                        term: 'Path',
                                        value: (
                                            <Row gap="2xs" inline className="min-w-0">
                                                <span className="min-w-0 truncate font-mono">{path}</span>
                                                <CopyButton value={path} size="icon-xs" words={{ copy: 'Copy the path' }} />
                                            </Row>
                                        ),
                                    },
                                ]}
                            />
                        </Stack>
                    </Section>
                    <Section title="Files" meta={`${String(files.length)} · ${bytes(model.size)}`} flush>
                        <DataTable
                            variant="list"
                            framed={false}
                            resizable={false}
                            columns={FILE_COLUMNS}
                            rows={files}
                            rowKey={(file) => file.name}
                            defaultSort={{ column: 'size', direction: 'desc' }}
                        />
                    </Section>
                    <Section title="Card">
                        <Markdown content={model.card} scale="document" />
                    </Section>
                </Stack>
            </Split>
            {removing.dialog}
        </>
    )
}
