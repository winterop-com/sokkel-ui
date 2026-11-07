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
