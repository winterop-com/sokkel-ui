/** What the demo starts with: a library of fifteen models, four conversations, a comparison and a quiet runner. */

import { plan, tokens } from '../engine/generate'
import { CATALOG, filesOf, modelId, QUANTS, type CatalogEntry, type Variant } from './catalog'
import {
    DEFAULT_SAMPLING,
    SOURCES,
    type Comparison,
    type Conversation,
    type Loaded,
    type LogEvent,
    type Message,
    type Model,
    type Runner,
    type Sampling,
    type Source,
    type Usage,
} from './model'
import { bytes, context, params } from './format'

const DAY = 86_400_000
const HOUR = 3_600_000
const MINUTE = 60_000

/** A model's card, as its publisher would write it. */
export function cardOf(entry: CatalogEntry, variant: Variant): string {
    return `# ${entry.name}

${entry.summary}

| | |
| --- | --- |
| Parameters | ${params(entry.params)} |
| Context | ${context(entry.context)} tokens |
| Rounding | \`${variant.quant}\`: ${QUANTS[variant.quant] ?? 'as published'} |
| Format | \`${variant.format}\` |
| Size | ${bytes(variant.size)} |
| Published by | ${entry.publisher} |

## Use

Load it in the runner, then ask it over the runner's API:

\`\`\`bash
curl http://runner.example.org:8400/v1/chat \\
  -d '{"model": "${entry.name}", "messages": [{"role": "user", "content": "Hello"}]}'
\`\`\`

## Good at

${entry.tags.map((tag) => `- ${tag}`).join('\n')}

> [!NOTE]
> Answers can be wrong. Check anything that matters before acting on it.
`
}

/** A library model made from a catalog entry's variant, as a pull or a copy lands it. */
export function modelOf(entry: CatalogEntry, variant: Variant, source: Source, added: number): Model {
    const defaults: Sampling = {
        ...DEFAULT_SAMPLING,
        temperature: entry.capabilities.includes('code') ? 0.2 : entry.capabilities.includes('reasoning') ? 0.6 : 0.7,
        maxTokens: entry.params < 2 ? 512 : 1024,
    }
    return {
        id: modelId(entry.name, variant.quant),
        name: entry.name,
        publisher: entry.publisher,
        family: entry.family,
        params: entry.params,
        quant: variant.quant,
        format: variant.format,
        size: filesOf(entry, variant).reduce((sum, file) => sum + file.size, 0),
        context: entry.context,
        source,
        added,
        used: null,
        capabilities: [...entry.capabilities],
        tags: [...entry.tags],
        files: filesOf(entry, variant),
        defaults,
        card: cardOf(entry, variant),
    }
}

const KEPT: [catalog: string, quant: string, daysAgo: number, usedHoursAgo: number | null][] = [
    ['ada/tide-7b-instruct', 'Q4_K_M', 41, 0.2],
    ['ada/tide-14b-instruct', 'Q4_K_M', 33, 26],
    ['runner/kelp-3b', 'Q4_K_M', 8, 3],
    ['grace/kelp-1b', 'Q8_0', 29, null],
    ['desktop/brine-coder-14b', '4bit', 18, 1.5],
    ['linus/brine-coder-14b', 'BF16', 12, 70],
    ['linus/brine-coder-3b', 'Q5_K_M', 25, 30],
    ['margaret/reef-8b', 'Q4_K_M', 15, 5],
    ['margaret/reef-32b', 'Q3_K_S', 21, 200],
    ['desktop/drift-vision-11b', 'Q4_K_M', 18, 50],
    ['linus/shoal-0.5b', 'Q8_0', 60, null],
    ['ada/eddy-22b', '4bit', 45, 400],
    ['margaret/skerry-9b', 'Q5_K_M', 70, 100],
    ['runner/cove-embed-0.3b', 'F16', 40, null],
    ['desktop/pebble-2b', '4bit', 90, 900],
]

export function seedModels(now = Date.now()): Model[] {
    return KEPT.map(([id, quant, daysAgo, usedHoursAgo]) => {
        const entry = CATALOG.find((one) => one.id === id)
        const variant = entry?.variants.find((one) => one.quant === quant)
        if (entry === undefined || variant === undefined) throw new Error(`No ${id} ${quant} in the catalog`)
        const model = modelOf(entry, variant, entry.source, now - daysAgo * DAY - 7 * HOUR)
        return { ...model, used: usedHoursAgo === null ? null : now - usedHoursAgo * HOUR }
    })
}

/** The memory a model takes once loaded: its weights and a working context. */
export function memoryOf(model: Model): number {
    return Math.round(model.size * 1.06 + Math.min(model.context, 8192) * model.params * 2_000 + 220_000_000)
}

/** The models the runner holds as the demo opens: one in use a moment ago, one a little before. */
export function seedLoaded(library: readonly Model[], now = Date.now()): Loaded[] {
    return (
        [
            ['tide-7b-instruct-q4_k_m', 5 * HOUR, 2 * MINUTE, 14],
            ['brine-coder-14b-4bit', 25 * MINUTE, 4 * MINUTE, 3],
        ] as const
    ).flatMap(([id, loadedAgo, usedAgo, answers]) => {
        const model = library.find((one) => one.id === id)
        if (model === undefined) return []
        return [
            {
                id,
                model: model.name,
                state: 'ready' as const,
                progress: 1,
                memory: memoryOf(model),
                context: Math.min(model.context, 8192),
                loadedAt: now - loadedAgo,
                usedAt: now - usedAgo,
                answers,
            },
        ]
    })
}

let made = 0
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(made += 1).toString(36)}`

/** A finished answer as the simulated model writes it, for the seed's conversations. */
function answered(model: Model, prompt: string, settings: Sampling, history: number, time: number): { message: Message; tokens: number } {
    const planned = plan({ prompt, model, settings, attachments: [], history, attempt: 0 })
    const output = tokens(planned.text) + tokens(planned.reasoning)
    const usage: Usage = {
        input: planned.input,
        output,
        firstToken: planned.prefill,
        rate: Number(planned.rate.toFixed(1)),
        latency: Math.round(planned.prefill + (output / planned.rate) * 1000),
        note: planned.note,
    }
    return {
        message: {
            id: newId('m'),
            role: 'assistant',
            versions: [{ text: planned.text, reasoning: planned.reasoning, model: model.id, state: 'done', usage, time }],
            at: 0,
        },
        tokens: planned.input + output,
    }
}

function conversation(
    models: readonly Model[],
    id: string,
    modelName: string,
    prompts: readonly string[],
    endedAgo: number,
    now: number,
    pinned = false,
): Conversation {
    const model = models.find((one) => one.id === modelName) ?? models[0]
    const settings = { ...model.defaults }
    const messages: Message[] = []
    let history = 0
    prompts.forEach((prompt, index) => {
        const time = now - endedAgo - (prompts.length - index) * 3 * MINUTE
        messages.push({ id: newId('m'), role: 'user', text: prompt, time, attachments: [] })
        const { message, tokens: used } = answered(model, prompt, settings, history, time + 20_000)
        history += used
        messages.push(message)
    })
    return { id, title: TITLES[id] ?? prompts[0], model: model.id, time: now - endedAgo, pinned, messages, settings }
}

const TITLES: Record<string, string> = {
    'c-parse': 'Amounts with a decimal comma',
    'c-cron': 'Weekday cron for send-digest',
    'c-week': "This week's runs",
    'c-rate': 'Why a bigger model writes slower',
}

export function seedConversations(models: readonly Model[], now = Date.now()): Conversation[] {
    return [
        conversation(
            models,
            'c-parse',
            'brine-coder-14b-4bit',
            [
                'Write a Python function to parse amounts that may use a decimal comma, like 12,50.',
                'Now a jq query for the failed runs in the API answer.',
            ],
            25 * MINUTE,
            now,
        ),
        conversation(
            models,
            'c-cron',
            'tide-7b-instruct-q4_k_m',
            ['What cron schedule runs send-digest every weekday at 06:30?'],
            3 * HOUR,
            now,
            true,
        ),
        conversation(
            models,
            'c-week',
            'tide-14b-instruct-q4_k_m',
            ['Summarize this week for the harbor project: failures, timeouts and anything slow.'],
            26 * HOUR,
            now,
        ),
        conversation(models, 'c-rate', 'reef-8b-q4_k_m', ['Explain why a bigger model writes slower than a small one.'], 6 * DAY, now),
    ]
}

export function seedComparisons(models: readonly Model[], now = Date.now()): Comparison[] {
    const prompt = 'Explain why nightly-export failed last night, in under a hundred words.'
    const picked = ['kelp-3b-q4_k_m', 'tide-7b-instruct-q4_k_m', 'reef-8b-q4_k_m']
    return [
        {
            id: 'cmp-seed',
            prompt,
            time: now - 2 * HOUR,
            temperature: 0.7,
            maxTokens: 512,
            columns: picked.map((id) => {
                const model = models.find((one) => one.id === id) ?? models[0]
                const settings = { ...DEFAULT_SAMPLING, temperature: 0.7, maxTokens: 512 }
                const { message } = answered(model, prompt, settings, 0, now - 2 * HOUR)
                const version = message.role === 'assistant' ? message.versions[0] : undefined
                return {
                    model: id,
                    state: 'done',
                    text: version?.text ?? '',
                    reasoning: version?.reasoning ?? '',
                    usage: version?.usage ?? null,
                }
            }),
        },
    ]
}

export function seedRunner(now = Date.now()): Runner[] {
    return [{ id: 'runner', status: 'up', since: now - 5 * HOUR - 12 * MINUTE, version: '0.9.4' }]
}

export function seedEvents(now = Date.now()): LogEvent[] {
    const lines: [number, LogEvent['level'], LogEvent['source'], string][] = [
        [5 * HOUR + 12 * MINUTE, 'info', 'runner', 'runner 0.9.4 listening on runner.example.org:8400'],
        [5 * HOUR + 11 * MINUTE, 'info', 'library', `library opened at /Volumes/models: 15 models`],
        [5 * HOUR, 'info', 'loader', 'loaded tide-7b-instruct Q4_K_M in 2.1 s (4.9 GB)'],
        [3 * HOUR, 'info', 'chat', 'tide-7b-instruct answered 74 tokens at 57.2 tok/s'],
        [2 * HOUR, 'info', 'loader', 'loaded kelp-3b Q4_K_M in 1.0 s (2.0 GB)'],
        [2 * HOUR, 'info', 'loader', 'loaded reef-8b Q4_K_M in 2.4 s (5.4 GB)'],
        [2 * HOUR - MINUTE, 'info', 'chat', 'compared kelp-3b, tide-7b-instruct and reef-8b on one prompt'],
        [100 * MINUTE, 'info', 'loader', 'unloaded kelp-3b after 10 min idle'],
        [100 * MINUTE, 'info', 'loader', 'unloaded reef-8b after 10 min idle'],
        [90 * MINUTE, 'warn', 'pull', `${SOURCES.hub.label} answered slowly; retried a part of eddy-22b`],
        [25 * MINUTE, 'info', 'loader', 'loaded brine-coder-14b 4bit in 3.6 s (9.1 GB)'],
        [24 * MINUTE, 'info', 'chat', 'brine-coder-14b answered 212 tokens at 33.8 tok/s'],
    ]
    return lines
        .map(([ago, level, source, text], index) => ({ id: `e-seed-${String(index)}`, time: now - ago, level, source, text }))
        .reverse()
}
