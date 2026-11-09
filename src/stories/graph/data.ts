import type { PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import type { RunStep } from '@winterop-com/sokkel-ui-graph/RunGraph'

/** The nightly-export job of the harbor project: fetch from two places, transform, validate, upload, notify. */
export const NIGHTLY_EXPORT: PipelineStep[] = [
    { code: 'fetch-orders', name: 'Fetch orders', kind: 'http', needs: [] },
    { code: 'fetch-inventory', name: 'Fetch inventory', kind: 'http', needs: [] },
    { code: 'transform', name: 'Join and reshape', kind: 'sql', needs: ['fetch-orders', 'fetch-inventory'] },
    { code: 'validate', kind: 'schema', needs: ['transform'] },
    { code: 'upload', name: 'Upload to storage', kind: 's3', needs: ['validate'] },
    { code: 'send-digest', name: 'Send digest', kind: 'email', needs: ['upload'] },
    { code: 'notify', kind: 'webhook', needs: ['validate'] },
]

/** Three steps in a row, each named only by its code. */
export const SHORT: PipelineStep[] = [
    { code: 'fetch', needs: [] },
    { code: 'transform', needs: ['fetch'] },
    { code: 'upload', needs: ['transform'] },
]

/** A run of nightly-export partway through: transform running, the rest waiting on it. */
export const RUNNING: RunStep[] = [
    { ...step('fetch-orders'), status: 'succeeded', duration_ms: 1840 },
    { ...step('fetch-inventory'), status: 'succeeded', duration_ms: 920 },
    { ...step('transform'), status: 'running', duration_ms: 12_400, progress: 0.62 },
    { ...step('validate'), status: 'queued' },
    { ...step('upload'), status: 'queued' },
    { ...step('send-digest'), status: 'queued' },
    { ...step('notify'), status: 'queued' },
]

/** A run of nightly-export that failed at validate, so upload and the digest were skipped. */
export const FAILED: RunStep[] = [
    { ...step('fetch-orders'), status: 'succeeded', duration_ms: 1840 },
    { ...step('fetch-inventory'), status: 'succeeded', duration_ms: 920 },
    { ...step('transform'), status: 'succeeded', duration_ms: 19_250 },
    { ...step('validate'), status: 'failed', duration_ms: 310 },
    { ...step('upload'), status: 'skipped' },
    { ...step('send-digest'), status: 'skipped' },
    { ...step('notify'), status: 'succeeded', duration_ms: 140 },
]

function step(code: string): PipelineStep {
    const found = NIGHTLY_EXPORT.find((each) => each.code === code)
    if (found === undefined) throw new Error(`no step ${code}`)
    return found
}

const REGIONS = ['north', 'south', 'east', 'west', 'central', 'coast']

/**
 * The rebuild-index job, wide enough that a fit stops at its floor: a fetch and a check per region,
 * transformed, validated, indexed, uploaded, verified, compacted and reported per region, merged,
 * and announced. 57 steps.
 */
export const LARGE: PipelineStep[] = [
    { code: 'plan', kind: 'python', needs: [] },
    ...REGIONS.flatMap((region) => [
        { code: `fetch-${region}`, kind: 'http', needs: ['plan'] },
        { code: `check-${region}`, kind: 'schema', needs: [`fetch-${region}`] },
        { code: `transform-${region}`, kind: 'sql', needs: [`check-${region}`] },
        { code: `validate-${region}`, kind: 'schema', needs: [`transform-${region}`] },
        { code: `index-${region}`, kind: 'python', needs: [`validate-${region}`] },
        { code: `upload-${region}`, kind: 's3', needs: [`index-${region}`] },
        { code: `verify-${region}`, kind: 'http', needs: [`upload-${region}`] },
        { code: `compact-${region}`, kind: 'python', needs: [`verify-${region}`] },
        { code: `report-${region}`, kind: 'sql', needs: [`compact-${region}`] },
    ]),
    { code: 'merge', kind: 'sql', needs: REGIONS.map((region) => `report-${region}`) },
    { code: 'notify', kind: 'webhook', needs: ['merge'] },
]

/** The import-orders job, its steps named at length, so a box's width follows its words up to the widest. */
export const LONG_NAMES: PipelineStep[] = [
    { code: 'fetch', name: 'Fetch', kind: 'http', needs: [] },
    { code: 'transform', name: 'Transform orders into the warehouse layout', kind: 'sql', needs: ['fetch'] },
    {
        code: 'validate',
        name: 'Validate every order line against the inventory schema and the price list',
        kind: 'schema',
        needs: ['transform'],
    },
    { code: 'upload', name: 'Upload', kind: 's3', needs: ['validate'] },
    { code: 'notify', kind: 'webhook', needs: ['validate'] },
]

/** One run of a job, for a list of runs. */
export interface JobRun {
    id: string
    job: string
    project: string
    started: string
    by: string
    status: RunStep['status']
    steps: RunStep[]
}

/** Each step of a pipeline in a state, by code; a step not named has succeeded. */
function runOf(steps: PipelineStep[], states: Record<string, RunStep['status']>): RunStep[] {
    return steps.map((each) => ({ ...each, status: states[each.code] ?? 'succeeded' }))
}

const SYNC_INVENTORY: PipelineStep[] = [
    { code: 'fetch', needs: [] },
    { code: 'transform', needs: ['fetch'] },
    { code: 'validate', needs: ['transform'] },
    { code: 'upload', needs: ['validate'] },
]

const SEND_DIGEST: PipelineStep[] = [
    { code: 'fetch-orders', needs: [] },
    { code: 'fetch-inventory', needs: [] },
    { code: 'fetch-customers', needs: [] },
    { code: 'transform', needs: ['fetch-orders', 'fetch-inventory', 'fetch-customers'] },
    { code: 'notify', needs: ['transform'] },
]

const REBUILD_INDEX: PipelineStep[] = [
    { code: 'plan', needs: [] },
    ...['north', 'south', 'east'].flatMap((region) => [
        { code: `fetch-${region}`, needs: ['plan'] },
        { code: `transform-${region}`, needs: [`fetch-${region}`] },
        { code: `upload-${region}`, needs: [`transform-${region}`] },
    ]),
    { code: 'validate', needs: ['upload-north', 'upload-south', 'upload-east'] },
    { code: 'notify', needs: ['validate'] },
]

/** Recent runs of five jobs, each with its steps in the state the run left them. */
export const JOB_RUNS: JobRun[] = [
    {
        id: '01a1a5b9',
        job: 'nightly-export',
        project: 'harbor',
        started: '02:00',
        by: 'scheduler',
        status: 'running',
        steps: RUNNING,
    },
    {
        id: '01a1a5c2',
        job: 'nightly-export',
        project: 'harbor',
        started: 'Yesterday 02:00',
        by: 'scheduler',
        status: 'failed',
        steps: FAILED,
    },
    {
        id: '01a1a5d0',
        job: 'sync-inventory',
        project: 'juniper',
        started: '01:45',
        by: 'ada',
        status: 'succeeded',
        steps: runOf(SYNC_INVENTORY, {}),
    },
    {
        id: '01a1a5d7',
        job: 'sync-inventory',
        project: 'juniper',
        started: '01:30',
        by: 'grace',
        status: 'cancelled',
        steps: runOf(SYNC_INVENTORY, { validate: 'cancelled', upload: 'cancelled' }),
    },
    {
        id: '01a1a5e3',
        job: 'send-digest',
        project: 'harbor',
        started: '01:15',
        by: 'linus',
        status: 'queued',
        steps: runOf(SEND_DIGEST, {
            'fetch-orders': 'queued',
            'fetch-inventory': 'queued',
            'fetch-customers': 'queued',
            transform: 'queued',
            notify: 'queued',
        }),
    },
    {
        id: '01a1a5f1',
        job: 'rebuild-index',
        project: 'larkspur',
        started: '00:40',
        by: 'margaret',
        status: 'running',
        steps: runOf(REBUILD_INDEX, {
            'transform-south': 'running',
            'upload-south': 'queued',
            'transform-east': 'failed',
            'upload-east': 'skipped',
            validate: 'queued',
            notify: 'queued',
        }),
    },
    {
        id: '01a1a5f8',
        job: 'import-orders',
        project: 'harbor',
        started: '00:10',
        by: 'scheduler',
        status: 'succeeded',
        steps: runOf(LONG_NAMES, {}),
    },
]
