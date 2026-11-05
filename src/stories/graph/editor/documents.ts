import type { EditorStep, PipelineDoc } from './use-editor'

/**
 * The nightly-export pipeline of the harbor project, built from blocks: orders fetched and the
 * inventory read, joined, deduplicated and validated, then written to a file that is uploaded,
 * with an email once the records are known good.
 */
export const NIGHTLY: EditorStep[] = [
    {
        code: 'fetch-orders',
        name: 'Fetch orders',
        kind: 'http.get',
        needs: [],
        settings: { url: 'https://api.example.org/orders', timeout: '30s' },
    },
    {
        code: 'read-inventory',
        name: 'Read inventory',
        kind: 'csv.read',
        needs: [],
        settings: { path: 'inventory/latest.csv', delimiter: ',' },
    },
    { code: 'join-stock', kind: 'join', needs: ['fetch-orders', 'read-inventory'], settings: { on: 'sku' } },
    { code: 'dedupe-orders', kind: 'dedupe', needs: ['join-stock'], settings: { keys: ['order_id'] } },
    {
        code: 'validate',
        kind: 'validate.schema',
        needs: ['dedupe-orders'],
        settings: { schema: 'https://schemas.example.org/order.json', on_error: 'fail' },
    },
    { code: 'write-csv', kind: 'csv.write', needs: ['validate'], settings: { path: 'exports/orders.csv', header: true } },
    {
        code: 'upload',
        name: 'Upload to storage',
        kind: 'upload.s3',
        needs: ['write-csv'],
        settings: { bucket: 'harbor-exports', prefix: 'nightly/' },
    },
    {
        code: 'notify',
        name: 'Send digest',
        kind: 'notify.email',
        needs: ['validate'],
        settings: { to: ['ada@example.org', 'grace@example.org'] },
    },
]

export const NIGHTLY_DOC: PipelineDoc = { steps: NIGHTLY, positions: {} }

/** The same pipeline with two problems: the fetch has no address, and the digest has nothing flowing in. */
export const BROKEN_DOC: PipelineDoc = {
    steps: NIGHTLY.map((step) => {
        if (step.code === 'fetch-orders') return { ...step, settings: { timeout: '30s' } }
        if (step.code === 'notify') return { ...step, needs: [] }
        return step
    }),
    positions: {},
}

/** The pipeline before its digest was connected, so connecting it is what is left to do. */
export const UNCONNECTED_DOC: PipelineDoc = {
    steps: NIGHTLY.map((step) => (step.code === 'notify' ? { ...step, needs: [] } : step)),
    positions: {},
}

/** The pipeline as it stands after dedupe-orders was removed: the step undo brings back. */
export const WITHOUT_DEDUPE: PipelineDoc = {
    steps: NIGHTLY.filter((step) => step.code !== 'dedupe-orders').map((step) =>
        step.code === 'validate' ? { ...step, needs: ['join-stock'] } : step,
    ),
    positions: {},
}

/** Every step placed by hand, out of order and overlapping its neighbors' rows, for the layout to tidy. */
export const SCATTERED_DOC: PipelineDoc = {
    steps: NIGHTLY,
    positions: {
        'fetch-orders': { x: 420, y: 10 },
        'read-inventory': { x: 0, y: 260 },
        'join-stock': { x: 160, y: 60 },
        'dedupe-orders': { x: 620, y: 230 },
        validate: { x: 300, y: 330 },
        'write-csv': { x: 40, y: 120 },
        upload: { x: 760, y: 70 },
        notify: { x: 520, y: 400 },
    },
}

export const EMPTY_DOC: PipelineDoc = { steps: [], positions: {} }
