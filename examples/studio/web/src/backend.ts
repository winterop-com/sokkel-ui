/** The workspace on the fake backend: its files, the runs started here, the values tried against schemas and the reader's settings. */

import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, type Prefs, type Run, type WorkFile } from './model'
import { SAMPLES, seedFiles } from './seed'

export const files = collection<WorkFile>('files', seedFiles)
export const runs = collection<Run>('runs', () => [])
/** The value tried against each schema, by the schema file's id. */
export const samples = collection<{ id: string; text: string }>('samples', () =>
    Object.entries(SAMPLES).map(([id, text]) => ({ id, text })),
)
/** Where the boxes of each pipeline's graph were moved to, by the pipeline file's id and then by step. */
export const layouts = collection<{ id: string; positions: Record<string, { x: number; y: number }> }>('layouts', () => [])
export const prefs = collection<Prefs>('prefs', () => [{ ...DEFAULT_PREFS }])
