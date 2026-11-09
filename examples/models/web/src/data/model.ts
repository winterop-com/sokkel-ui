/**
 * What the Models app keeps: the models on its disk with their files, the conversations had with
 * them, the downloads under way, the runner and the models it holds in memory, the side-by-side
 * comparisons, the runner's log and the preferences.
 */

import type { Row } from 'tidevann-shared/backend'

/** How a model's weights are written on disk. */
export type Format = 'packed' | 'unified' | 'sharded'
export const FORMATS: readonly Format[] = ['packed', 'unified', 'sharded']

/** What each format is, said where a format is chosen or explained. */
export const FORMAT_NOTES: Record<Format, string> = {
    packed: 'One file of rounded weights the runner reads as it is',
    unified: 'Rounded weights laid out for memory the processor and graphics share',
    sharded: 'The full weights, split into shards of a few gigabytes',
}

/** Where a model came from: pulled from a public hub, or taken in from a runner's own store. */
export type Source = 'hub' | 'runner' | 'desktop'
export const SOURCES: Record<Source, { label: string; detail: string }> = {
    hub: { label: 'Public hub', detail: 'hub.example.org, the public catalog of open weights' },
    runner: { label: 'Local runner', detail: "The runner's own store of pulled models" },
    desktop: { label: 'Desktop runner', detail: "A desktop runner's folder of downloads" },
}
export const SOURCE_IDS = Object.keys(SOURCES) as Source[]

/** What a model can do beyond writing text. */
export type Capability = 'tools' | 'vision' | 'code' | 'reasoning'
export const CAPABILITIES: readonly Capability[] = ['tools', 'vision', 'code', 'reasoning']

/** What a file of a model is for: the weights the runner loads, a vision projector, the tokenizer, its config or its card. */
export type FileRole = 'weights' | 'projector' | 'tokenizer' | 'config' | 'card'

export interface ModelFile {
    name: string
    /** Bytes. */
    size: number
    role: FileRole
}

/** The settings an answer is written with. */
export interface Sampling {
    temperature: number
    topP: number
    maxTokens: number
    system: string
}

export const DEFAULT_SAMPLING: Sampling = {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 1024,
    system: 'You are a helpful assistant. Answer plainly and say when you are not sure.',
}

/** One model kept on the disk. */
export interface Model extends Row {
    /** Its name, unique in the library: `tide-7b-instruct`. */
    name: string
    /** Who published it. */
    publisher: string
    family: string
    /** Billions of parameters. */
    params: number
    /** How the weights are rounded: `Q4_K_M`, `8bit`, `BF16`. */
    quant: string
    format: Format
    /** Bytes on disk, every file together. */
    size: number
    /** Tokens of context it was trained for. */
    context: number
    source: Source
    /** When it was put in the library, in milliseconds since the epoch. */
    added: number
    /** When it last answered. */
    used: number | null
    capabilities: Capability[]
    tags: string[]
    files: ModelFile[]
    /** What new conversations with it start with. */
    defaults: Sampling
    /** Its card, as markdown. */
    card: string
}

/** What an answer cost and how fast it came. */
export interface Usage {
    input: number
    output: number
    /** Milliseconds to the first token. */
    firstToken: number
    /** Tokens a second from the first token. */
    rate: number
    /** Milliseconds the whole answer took. */
    latency: number
    /** Why it ended early, if it did: `max tokens`. */
    note?: string
}

/** A file sent with a message. */
export interface Attachment {
    id: string
    name: string
    kind: 'image' | 'file'
    /** Bytes. */
    size: number
    /** A line of what it holds: `CSV, 2,184 lines`. */
    detail: string
    /** The text of a text file, read by the model. */
    text?: string
    /** An image small enough to keep, as a data address. */
    url?: string
}

export type ReplyState = 'streaming' | 'done' | 'stopped' | 'failed'

/** One version of an answer: the first, or one asked for again. */
export interface Version {
    text: string
    /** The model's thinking before it answered, if it thinks. */
    reasoning?: string
    model: string
    state: ReplyState
    usage: Usage | null
    time: number
    /** What went wrong, when it failed. */
    problem?: string
    feedback?: 'good' | 'bad'
}

export interface UserMessage {
    id: string
    role: 'user'
    text: string
    time: number
    attachments: Attachment[]
}

export interface AssistantMessage {
    id: string
    role: 'assistant'
    versions: Version[]
    /** The version shown, from 0. */
    at: number
}

export type Message = UserMessage | AssistantMessage

export interface Conversation extends Row {
    title: string
    /** The model it talks to, by name. */
    model: string
    /** When it was last active. */
    time: number
    pinned: boolean
    messages: Message[]
    settings: Sampling
}

export type DownloadState = 'queued' | 'running' | 'paused' | 'done' | 'failed' | 'cancelled'

/** A model being pulled from a source onto the disk. */
export interface Download extends Row {
    /** The catalog entry and the variant pulled. */
    entry: string
    quant: string
    name: string
    publisher: string
    source: Source
    format: Format
    /** Bytes in all and bytes in so far. */
    size: number
    done: number
    /** Bytes a second, as last measured. */
    speed: number
    state: DownloadState
    started: number
    ended: number | null
    error: string | null
}

export type RunnerStatus = 'up' | 'down' | 'starting' | 'stopping'

/** The local runner that loads models and answers with them. */
export interface Runner extends Row {
    status: RunnerStatus
    /** When it came up or went down. */
    since: number
    version: string
}

/** A model the runner holds in memory. */
export interface Loaded extends Row {
    /** The model's name. */
    model: string
    state: 'loading' | 'ready'
    /** How far the load is, from 0 to 1. */
    progress: number
    /** Bytes of memory it takes. */
    memory: number
    /** Tokens of context it was loaded with. */
    context: number
    loadedAt: number
    usedAt: number
    /** Answers it has written since it was loaded. */
    answers: number
}

export interface LogEvent extends Row {
    time: number
    level: 'info' | 'warn' | 'error'
    source: 'runner' | 'loader' | 'chat' | 'pull' | 'library'
    text: string
}

export type ColumnState = 'waiting' | 'streaming' | 'done' | 'stopped' | 'failed'

/** One model's answer in a comparison. */
export interface CompareColumn {
    model: string
    state: ColumnState
    text: string
    reasoning?: string
    usage: Usage | null
    problem?: string
}

/** One prompt sent to several models side by side. */
export interface Comparison extends Row {
    prompt: string
    time: number
    temperature: number
    maxTokens: number
    columns: CompareColumn[]
}

/** The person's preferences, kept by the backend as one row. */
export interface Prefs extends Row {
    /** Where the library keeps its models. */
    root: string
    /** The model a new conversation starts with, by name. */
    defaultModel: string
    /** Megabytes a second all downloads may take together; 0 for no limit. */
    bandwidth: number
    /** How many downloads run at once; the rest wait their turn. */
    parallel: number
    /** Minutes a model stays loaded after its last answer; 0 keeps it until unloaded. */
    keepAlive: number
    /** Gigabytes of memory the runner may fill with models. */
    memory: number
    /** Start the runner when the app opens. */
    startRunner: boolean
    /** Load a model when a chat needs it and it is not loaded. */
    autoLoad: boolean
    /** Ask before deleting a model from the disk. */
    confirmDelete: boolean
}

export const DEFAULT_PREFS: Prefs = {
    id: 'prefs',
    root: '/Volumes/models',
    defaultModel: 'tide-7b-instruct',
    bandwidth: 0,
    parallel: 2,
    keepAlive: 10,
    memory: 24,
    startRunner: true,
    autoLoad: true,
    confirmDelete: true,
}
