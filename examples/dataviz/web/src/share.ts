import type { Column, Dataset, ViewSpec } from './model'

/** What a shared link carries: the chart's name, its view, and its whole dataset, so a fresh load needs nothing else. */
export interface SharedChart {
    name: string
    spec: ViewSpec
    dataset: { name: string; description: string; columns: Column[]; rows: string[][] }
}

interface Packed {
    v: 1
    n: string
    s: ViewSpec
    d: { n: string; t: string; c: Column[]; r: string[][] }
}

function toBase64Url(bytes: Uint8Array): string {
    let text = ''
    for (let at = 0; at < bytes.length; at += 0x8000) text += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
    return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'))
    const bytes = new Uint8Array(binary.length)
    for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at)
    return bytes
}

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
    const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
    return new Uint8Array(await new Response(piped).arrayBuffer())
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'

/**
 * A chart and its data as one piece of a link's hash: JSON, deflated where the browser can, in
 * base64url. It starts `z` when deflated and `j` when not, so either reads back.
 */
export async function packChart(name: string, spec: ViewSpec, dataset: Dataset): Promise<string> {
    const packed: Packed = {
        v: 1,
        n: name,
        s: spec,
        d: {
            n: dataset.name,
            t: dataset.description,
            c: dataset.columns,
            r: dataset.rows.map((row) => dataset.columns.map((column) => row[column.id] ?? '')),
        },
    }
    const bytes = new TextEncoder().encode(JSON.stringify(packed))
    if (!canCompress()) return `j${toBase64Url(bytes)}`
    return `z${toBase64Url(await through(bytes, new CompressionStream('deflate-raw')))}`
}

/** Reads a chart packed into a link back, or says why it cannot. */
export async function unpackChart(text: string): Promise<SharedChart> {
    const kind = text.charAt(0)
    let bytes: Uint8Array
    try {
        bytes = fromBase64Url(text.slice(1))
    } catch {
        throw new Error('The link is cut short or changed: its chart cannot be read.')
    }
    if (kind === 'z') {
        if (!canCompress()) throw new Error('This browser cannot unpack the link.')
        try {
            bytes = await through(bytes, new DecompressionStream('deflate-raw'))
        } catch {
            throw new Error('The link is cut short or changed: its chart cannot be read.')
        }
    } else if (kind !== 'j') throw new Error('This is not a link to a shared chart.')
    let packed: Packed
    try {
        packed = JSON.parse(new TextDecoder().decode(bytes)) as Packed
    } catch {
        throw new Error('The link is cut short or changed: its chart cannot be read.')
    }
    if (packed.v !== 1 || !Array.isArray(packed.d.c) || !Array.isArray(packed.d.r))
        throw new Error('The link was made by a version that cannot be read here.')
    return { name: packed.n, spec: packed.s, dataset: { name: packed.d.n, description: packed.d.t, columns: packed.d.c, rows: packed.d.r } }
}

/** The dataset a shared chart carries, as a dataset of its own under `id`. */
export function sharedDataset(shared: SharedChart, id: string, updatedAt: string): Dataset {
    return {
        id,
        name: shared.dataset.name,
        description: shared.dataset.description,
        source: 'link',
        columns: shared.dataset.columns,
        rows: shared.dataset.rows.map((values, index) => ({
            id: `${id}-r${String(index + 1)}`,
            ...Object.fromEntries(shared.dataset.columns.map((column, at) => [column.id, values[at] ?? ''])),
        })),
        updatedAt,
    }
}

/** The address of the app with a hash, as a link someone else opens: the page's own address in a browser, its file in a desktop shell. */
export function linkTo(hash: string): string {
    const origin = window.location.origin === 'null' ? 'file://' : window.location.origin
    return `${origin}${window.location.pathname}${hash}`
}
