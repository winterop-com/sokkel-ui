/** What the studio keeps: the workspace's files, the runs of its pipelines and the reader's settings. */

import type { LucideIcon } from 'lucide-react'
import { Braces, Database, Workflow } from 'lucide-react'

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export type Project = (typeof PROJECTS)[number]

/** A pipeline is YAML, a schema is a JSON Schema document, a query is SQL. */
export type FileKind = 'pipeline' | 'schema' | 'query'

export const KINDS: readonly { kind: FileKind; label: string; plural: string; extension: string; icon: LucideIcon }[] = [
    { kind: 'pipeline', label: 'Pipeline', plural: 'Pipelines', extension: '.yaml', icon: Workflow },
    { kind: 'schema', label: 'Schema', plural: 'Schemas', extension: '.schema.json', icon: Braces },
    { kind: 'query', label: 'Query', plural: 'Queries', extension: '.sql', icon: Database },
]

export const kindOf = (kind: FileKind) => KINDS.find((one) => one.kind === kind) ?? KINDS[0]

/** One file of the workspace, as last saved. */
export interface WorkFile {
    id: string
    project: Project
    kind: FileKind
    /** The file's name with its extension: `nightly-export.yaml`. */
    name: string
    text: string
    updated: number
}

export type StepState = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'
export type RunState = 'running' | 'succeeded' | 'failed' | 'cancelled'

/** One step of a run, as far as it got. */
export interface RunStepRecord {
    id: string
    kind: string
    needs: string[]
    state: StepState
    duration_ms?: number
    rows?: number
}

/** A line of a run's log: when it was written, from the start of the run, by which step. */
export interface LogLine {
    at: number
    step: string | null
    level: 'info' | 'warn' | 'error'
    text: string
}

/** A run of a pipeline started in the studio. */
export interface Run {
    id: string
    /** Counted up across the workspace: run 12. */
    number: number
    file: string
    pipeline: string
    project: Project
    state: RunState
    started: number
    finished?: number
    by: string
    steps: RunStepRecord[]
    log: LogLine[]
    failed?: { step: string; reason: string }
    /** Run from changes not saved yet. */
    draft: boolean
}

export type TextSize = 'sm' | 'md' | 'lg'

/** The reader's settings and where they left the work area. */
export interface Prefs {
    id: string
    /** The open tabs: file ids, or `table:<name>` for a table's rows. */
    tabs: string[]
    active: string | null
    wrap: boolean
    lineNumbers: boolean
    size: TextSize
    folding: boolean
    indentGuides: boolean
    bracketColors: boolean
}

export const DEFAULT_PREFS: Prefs = {
    id: 'prefs',
    tabs: ['harbor-nightly-export', 'harbor-order-schema', 'juniper-slow-steps'],
    active: 'harbor-nightly-export',
    wrap: false,
    lineNumbers: true,
    size: 'md',
    folding: true,
    indentGuides: true,
    bracketColors: false,
}

/** The person every edit and run is made as. */
export const ME = 'ada'

/** A file name's stem, without its kind's extension. */
export function stem(file: Pick<WorkFile, 'name' | 'kind'>): string {
    const extension = kindOf(file.kind).extension
    return file.name.endsWith(extension) ? file.name.slice(0, -extension.length) : file.name
}

/** Why a name cannot be a file's: empty, the wrong letters, or taken in the project. */
export function badName(name: string, taken: readonly string[]): string | null {
    const typed = name.trim()
    if (typed === '') return 'Give it a name.'
    if (!/^[a-z][a-z0-9-]*$/.test(typed)) return 'Lowercase letters, digits and dashes, starting with a letter.'
    if (taken.includes(typed)) return 'A file of that kind in this project has that name.'
    return null
}

/** A duration said briefly: 840 ms, 2.4 s, 1 min 12 s. */
export function sayDuration(ms: number): string {
    if (ms < 1000) return `${String(Math.round(ms))} ms`
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
    const minutes = Math.floor(ms / 60_000)
    return `${String(minutes)} min ${String(Math.round((ms % 60_000) / 1000))} s`
}

/** A time of day: 14:02:09. */
export function clock(at: number): string {
    return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** A count with its noun: 1 row, 3 rows. */
export function counted(count: number, noun: string, plural = `${noun}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? noun : plural}`
}
