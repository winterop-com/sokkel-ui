import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@winterop-com/sokkel-ui/primitives/select'
import { Textarea } from '@winterop-com/sokkel-ui/primitives/textarea'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { conversations as talks } from '../data/backend'
import { bytes, context } from '../data/format'
import { FORMATS, type Conversation, type Model } from '../data/model'
import { setSettings } from '../engine/chat'
import { rateOf } from '../engine/generate'
import { memoryOf } from '../engine/runner'
import { useApp } from '../state'
import { MemoryChip } from './Library'

/** System prompts a person reaches for often. */
const PRESETS = [
    'Answer briefly, in one short paragraph.',
    'You review code. Point at the line, say what is wrong and how to fix it.',
    'You are a helpful assistant. Answer plainly and say when you are not sure.',
]

/** The library's models as a select, grouped by format, for a conversation or a comparison column. */
export function ModelSelect({
    value,
    onChange,
    label = 'Model',
    variant = 'field',
    className,
}: {
    value: string
    onChange: (id: string) => void
    label?: string
    variant?: 'field' | 'quiet'
    className?: string
}) {
    const { models } = useApp()
    const items = models.map((model) => ({ value: model.id, label: `${model.name} ${model.quant}` }))
    return (
        <Select items={items} value={value} onValueChange={(next) => next !== null && onChange(next)}>
            <SelectTrigger aria-label={label} variant={variant} size="sm" className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {FORMATS.map((format) => {
                    const kept = models.filter((model) => model.format === format)
                    if (kept.length === 0) return null
                    return (
                        <SelectGroup key={format}>
                            <SelectLabel>{format}</SelectLabel>
                            {kept.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                    <span className="font-mono">{model.name}</span>
                                    <span className="text-muted-foreground">{model.quant}</span>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    )
                })}
            </SelectContent>
        </Select>
    )
}

/** The system prompt, kept when the field is left. */
function SystemPrompt({ conversation }: { conversation: Conversation }) {
    const [text, setText] = useState(conversation.settings.system)
    useEffect(() => setText(conversation.settings.system), [conversation.settings.system])
    return (
        <Stack gap="sm">
            <Field
                id="system-prompt"
                label="System prompt"
                help="Said to the model before the conversation. Asking it to be brief keeps answers to a paragraph."
            >
                <Textarea
                    id="system-prompt"
                    rows={5}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onBlur={() => text !== conversation.settings.system && setSettings(conversation.id, { system: text })}
                />
            </Field>
            <Row gap="xs" wrap>
                {PRESETS.map((preset) => (
                    <Button
                        key={preset}
                        size="xs"
                        variant="outline"
                        onClick={() => {
                            setText(preset)
                            setSettings(conversation.id, { system: preset })
                        }}
                    >
                        {preset.split(/[,.]/)[0]}
                    </Button>
                ))}
            </Row>
        </Stack>
    )
}

/** What a model is, in the panel: its size, context, the memory it takes, its pace, and whether it is loaded. */
function ModelFacts({ model }: { model: Model }) {
    const { loaded } = useApp()
    return (
        <DescriptionList
            termWidth="6.5rem"
            items={[
                { term: 'Runner', value: <MemoryChip held={loaded.find((one) => one.id === model.id)} /> },
                { term: 'Size', value: bytes(model.size), numeric: true },
                { term: 'Memory', value: bytes(memoryOf(model)), numeric: true },
                { term: 'Context', value: `${context(model.context)} tokens`, numeric: true },
                { term: 'Pace', value: `about ${String(Math.round(rateOf(model)))} tok/s`, numeric: true },
            ]}
        />
    )
}

/** The conversation's model and how it answers: the model, temperature, top p, max tokens and the system prompt. */
export function ChatSettingsPanel({ conversation }: { conversation: Conversation }) {
    const { modelOf } = useApp()
    const model = modelOf(conversation.model)
    const { settings } = conversation
    return (
        <SidePanel
            tabs={[
                {
                    id: 'settings',
                    label: 'Settings',
                    content: (
                        <>
                            <PanelSection title="Model">
                                <Stack gap="md">
                                    <ModelSelect
                                        value={conversation.model}
                                        onChange={(id) => void talks.update(conversation.id, { model: id })}
                                        className="w-full"
                                    />
                                    {model === undefined ? (
                                        <p className="text-help text-muted-foreground">
                                            This model is no longer in the library. Pick another.
                                        </p>
                                    ) : (
                                        <ModelFacts model={model} />
                                    )}
                                </Stack>
                            </PanelSection>
                            <PanelSection title="Sampling">
                                <Stack gap="lg">
                                    <SliderField
                                        id="temperature"
                                        label="Temperature"
                                        value={settings.temperature}
                                        onChange={(temperature) => setSettings(conversation.id, { temperature })}
                                        max={2}
                                        step={0.05}
                                        format={(value) => value.toFixed(2)}
                                        help="Higher is more varied, lower more literal. At 0 asking again gives the same answer."
                                    />
                                    <SliderField
                                        id="top-p"
                                        label="Top p"
                                        value={settings.topP}
                                        onChange={(topP) => setSettings(conversation.id, { topP })}
                                        max={1}
                                        step={0.05}
                                        format={(value) => value.toFixed(2)}
                                        help="Only the likeliest tokens up to this share are drawn from."
                                    />
                                </Stack>
                            </PanelSection>
                            <PanelSection title="Length">
                                <NumberField
                                    key={conversation.id}
                                    id="max-tokens"
                                    label="Max tokens"
                                    hint={model === undefined ? undefined : `up to ${model.context.toLocaleString('en-US')}`}
                                    help="An answer stops here, its usage line saying so."
                                    integer
                                    step={64}
                                    min={1}
                                    max={model?.context}
                                    defaultValue={settings.maxTokens}
                                    onValueChange={(maxTokens) => {
                                        if (maxTokens !== null && maxTokens >= 1) setSettings(conversation.id, { maxTokens })
                                    }}
                                />
                            </PanelSection>
                            <PanelSection title="System prompt">
                                <SystemPrompt key={conversation.id} conversation={conversation} />
                            </PanelSection>
                            {model !== undefined && (
                                <PanelSection title="Defaults">
                                    <Button size="sm" variant="outline" onClick={() => setSettings(conversation.id, { ...model.defaults })}>
                                        <RotateCcw aria-hidden />
                                        Back to {model.name}'s defaults
                                    </Button>
                                </PanelSection>
                            )}
                        </>
                    ),
                },
            ]}
        />
    )
}
