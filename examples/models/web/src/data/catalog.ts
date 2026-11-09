/**
 * The sources the library pulls from, simulated: a public hub's catalog and the stores of a local
 * and a desktop runner, each entry with the variants it can be pulled in. Search answers after a
 * short delay, as a remote catalog would.
 */

import type { Capability, Format, ModelFile, Source } from './model'

/** One way an entry can be pulled: its rounding and format, and the bytes that take. */
export interface Variant {
    quant: string
    format: Format
    size: number
}

export interface CatalogEntry {
    /** `publisher/name`. */
    id: string
    name: string
    publisher: string
    family: string
    params: number
    context: number
    source: Source
    capabilities: Capability[]
    tags: string[]
    summary: string
    /** Pulls in the last month. */
    downloads: number
    likes: number
    /** Days since it last changed. */
    updated: number
    variants: Variant[]
}

/** Bits a weight takes in each rounding. */
const BITS: Record<string, number> = {
    Q3_K_S: 3.5,
    Q4_K_M: 4.85,
    Q5_K_M: 5.7,
    Q6_K: 6.6,
    Q8_0: 8.5,
    F16: 16,
    BF16: 16,
    '4bit': 4.5,
    '8bit': 8.5,
}

/** What a rounding means, said in a tooltip and on a model's page. */
export const QUANTS: Record<string, string> = {
    Q3_K_S: 'Three bits a weight, small blocks: the smallest that still answers well',
    Q4_K_M: 'Four bits a weight, medium blocks: the usual balance of size and quality',
    Q5_K_M: 'Five bits a weight: a little larger, a little closer to the original',
    Q6_K: 'Six bits a weight: hard to tell from the original',
    Q8_0: 'Eight bits a weight: as good as the original, twice the size of four',
    F16: 'Half precision: the original weights, unrounded',
    BF16: 'Brain float, half precision: the weights as trained',
    '4bit': 'Four bits a weight, for unified memory',
    '8bit': 'Eight bits a weight, for unified memory',
}

function sizeOf(params: number, quant: string): number {
    return Math.round((params * 1e9 * (BITS[quant] ?? 8)) / 8 + 24_000_000)
}

function variants(params: number, formats: Partial<Record<Format, readonly string[]>>): Variant[] {
    return (Object.entries(formats) as [Format, readonly string[]][]).flatMap(([format, quants]) =>
        quants.map((quant) => ({ quant, format, size: sizeOf(params, quant) })),
    )
}

const PACKED = ['Q4_K_M', 'Q5_K_M', 'Q8_0'] as const
const UNIFIED = ['4bit', '8bit'] as const

export const CATALOG: CatalogEntry[] = [
    {
        id: 'ada/tide-7b-instruct',
        name: 'tide-7b-instruct',
        publisher: 'ada',
        family: 'tide',
        params: 7.2,
        context: 32_768,
        source: 'hub',
        capabilities: ['tools'],
        tags: ['chat', 'general'],
        summary: 'A general model tuned to follow instructions, good at short answers and tool calls.',
        downloads: 1_284_112,
        likes: 3_904,
        updated: 12,
        variants: variants(7.2, { packed: PACKED, unified: UNIFIED }),
    },
    {
        id: 'ada/tide-14b-instruct',
        name: 'tide-14b-instruct',
        publisher: 'ada',
        family: 'tide',
        params: 14.1,
        context: 65_536,
        source: 'hub',
        capabilities: ['tools', 'reasoning'],
        tags: ['chat', 'general'],
        summary: 'The larger tide: slower, more careful, with a longer context.',
        downloads: 612_480,
        likes: 2_210,
        updated: 12,
        variants: variants(14.1, { packed: PACKED, unified: UNIFIED }),
    },
    {
        id: 'ada/tide-32b-instruct',
        name: 'tide-32b-instruct',
        publisher: 'ada',
        family: 'tide',
        params: 32.5,
        context: 131_072,
        source: 'hub',
        capabilities: ['tools', 'reasoning'],
        tags: ['chat', 'long context'],
        summary: 'The largest tide, for long documents and hard questions. Needs a machine with room.',
        downloads: 201_337,
        likes: 1_502,
        updated: 30,
        variants: variants(32.5, { packed: ['Q3_K_S', 'Q4_K_M'], unified: ['4bit'] }),
    },
    {
        id: 'grace/kelp-3b',
        name: 'kelp-3b',
        publisher: 'grace',
        family: 'kelp',
        params: 3.1,
        context: 16_384,
        source: 'hub',
        capabilities: [],
        tags: ['small', 'fast'],
        summary: 'A small, quick model for drafts, labels and short summaries on any laptop.',
        downloads: 904_551,
        likes: 1_877,
        updated: 4,
        variants: variants(3.1, { packed: PACKED, unified: UNIFIED }),
    },
    {
        id: 'grace/kelp-1b',
        name: 'kelp-1b',
        publisher: 'grace',
        family: 'kelp',
        params: 1.2,
        context: 8_192,
        source: 'hub',
        capabilities: [],
        tags: ['small', 'fast', 'edge'],
        summary: 'The smallest kelp, for classifying and routing at hundreds of tokens a second.',
        downloads: 388_020,
        likes: 640,
        updated: 4,
        variants: variants(1.2, { packed: ['Q4_K_M', 'Q8_0', 'F16'] }),
    },
    {
        id: 'linus/brine-coder-14b',
        name: 'brine-coder-14b',
        publisher: 'linus',
        family: 'brine',
        params: 14.7,
        context: 65_536,
        source: 'hub',
        capabilities: ['code', 'tools'],
        tags: ['code'],
        summary: 'Trained on code: writes, explains and fixes functions, queries and scripts.',
        downloads: 742_906,
        likes: 4_118,
        updated: 9,
        variants: variants(14.7, { packed: PACKED, unified: UNIFIED, sharded: ['BF16'] }),
    },
    {
        id: 'linus/brine-coder-3b',
        name: 'brine-coder-3b',
        publisher: 'linus',
        family: 'brine',
        params: 3.0,
        context: 32_768,
        source: 'hub',
        capabilities: ['code'],
        tags: ['code', 'small', 'completion'],
        summary: 'A small coder for completing lines in an editor as they are typed.',
        downloads: 455_390,
        likes: 1_202,
        updated: 9,
        variants: variants(3.0, { packed: PACKED, unified: UNIFIED }),
    },
    {
        id: 'margaret/reef-32b',
        name: 'reef-32b',
        publisher: 'margaret',
        family: 'reef',
        params: 32.0,
        context: 32_768,
        source: 'hub',
        capabilities: ['reasoning'],
        tags: ['reasoning', 'math'],
        summary: 'Thinks before it answers: slow, thorough, strong at math and planning.',
        downloads: 330_712,
        likes: 2_870,
        updated: 21,
        variants: variants(32.0, { packed: ['Q3_K_S', 'Q4_K_M'], unified: ['4bit'] }),
    },
    {
        id: 'margaret/reef-8b',
        name: 'reef-8b',
        publisher: 'margaret',
        family: 'reef',
        params: 8.0,
        context: 32_768,
        source: 'hub',
        capabilities: ['reasoning'],
        tags: ['reasoning'],
        summary: 'The reef way of thinking in a size most machines can hold.',
        downloads: 520_004,
        likes: 1_990,
        updated: 21,
        variants: variants(8.0, { packed: PACKED, unified: UNIFIED }),
    },
    {
        id: 'grace/drift-vision-11b',
        name: 'drift-vision-11b',
        publisher: 'grace',
        family: 'drift',
        params: 10.6,
        context: 32_768,
        source: 'hub',
        capabilities: ['vision', 'tools'],
        tags: ['vision', 'documents'],
        summary: 'Reads images: screenshots, charts, scanned pages and photos of whiteboards.',
        downloads: 287_655,
        likes: 1_334,
        updated: 15,
        variants: variants(10.6, { packed: ['Q4_K_M', 'Q8_0'], unified: ['4bit'] }),
    },
    {
        id: 'linus/shoal-0.5b',
        name: 'shoal-0.5b',
        publisher: 'linus',
        family: 'shoal',
        params: 0.5,
        context: 4_096,
        source: 'hub',
        capabilities: [],
        tags: ['tiny', 'draft'],
        summary: 'A tiny model that drafts tokens for a larger one to check, which makes the larger faster.',
        downloads: 98_211,
        likes: 312,
        updated: 60,
        variants: variants(0.5, { packed: ['Q8_0', 'F16'] }),
    },
    {
        id: 'ada/eddy-22b',
        name: 'eddy-22b',
        publisher: 'ada',
        family: 'eddy',
        params: 22.2,
        context: 131_072,
        source: 'hub',
        capabilities: ['tools'],
        tags: ['chat', 'long context', 'multilingual'],
        summary: 'Writes in many languages and keeps a long context: translation and long summaries.',
        downloads: 176_408,
        likes: 980,
        updated: 45,
        variants: variants(22.2, { packed: ['Q4_K_M', 'Q5_K_M'], unified: ['4bit'] }),
    },
    {
        id: 'margaret/skerry-9b',
        name: 'skerry-9b',
        publisher: 'margaret',
        family: 'skerry',
        params: 9.2,
        context: 8_192,
        source: 'hub',
        capabilities: [],
        tags: ['chat', 'writing'],
        summary: 'A careful writer: letters, release notes and plain explanations.',
        downloads: 233_119,
        likes: 870,
        updated: 70,
        variants: variants(9.2, { packed: PACKED }),
    },
    {
        id: 'grace/swell-70b',
        name: 'swell-70b',
        publisher: 'grace',
        family: 'swell',
        params: 70.6,
        context: 131_072,
        source: 'hub',
        capabilities: ['tools', 'reasoning'],
        tags: ['chat', 'large'],
        summary: 'Very large and very capable. Needs more memory than most single machines have.',
        downloads: 140_870,
        likes: 3_150,
        updated: 33,
        variants: variants(70.6, { packed: ['Q3_K_S', 'Q4_K_M'] }),
    },
    {
        id: 'runner/tide-7b-instruct',
        name: 'tide-7b-instruct',
        publisher: 'ada',
        family: 'tide',
        params: 7.2,
        context: 32_768,
        source: 'runner',
        capabilities: ['tools'],
        tags: ['chat', 'general'],
        summary: "Already in the local runner's store, in its own blob format; taken in as a copy.",
        downloads: 0,
        likes: 0,
        updated: 2,
        variants: variants(7.2, { packed: ['Q4_K_M'] }),
    },
    {
        id: 'runner/kelp-3b',
        name: 'kelp-3b',
        publisher: 'grace',
        family: 'kelp',
        params: 3.1,
        context: 16_384,
        source: 'runner',
        capabilities: [],
        tags: ['small'],
        summary: "In the local runner's store since last week.",
        downloads: 0,
        likes: 0,
        updated: 8,
        variants: variants(3.1, { packed: ['Q4_K_M'] }),
    },
    {
        id: 'runner/cove-embed-0.3b',
        name: 'cove-embed-0.3b',
        publisher: 'linus',
        family: 'cove',
        params: 0.3,
        context: 8_192,
        source: 'runner',
        capabilities: [],
        tags: ['embedding', 'search'],
        summary: 'Turns text into vectors for search; it does not chat.',
        downloads: 0,
        likes: 0,
        updated: 40,
        variants: variants(0.3, { packed: ['F16'] }),
    },
    {
        id: 'desktop/brine-coder-14b',
        name: 'brine-coder-14b',
        publisher: 'linus',
        family: 'brine',
        params: 14.7,
        context: 65_536,
        source: 'desktop',
        capabilities: ['code', 'tools'],
        tags: ['code'],
        summary: "In the desktop runner's downloads folder.",
        downloads: 0,
        likes: 0,
        updated: 18,
        variants: variants(14.7, { unified: ['4bit'] }),
    },
    {
        id: 'desktop/drift-vision-11b',
        name: 'drift-vision-11b',
        publisher: 'grace',
        family: 'drift',
        params: 10.6,
        context: 32_768,
        source: 'desktop',
        capabilities: ['vision', 'tools'],
        tags: ['vision'],
        summary: "In the desktop runner's downloads folder, with its vision projector.",
        downloads: 0,
        likes: 0,
        updated: 18,
        variants: variants(10.6, { packed: ['Q4_K_M'] }),
    },
    {
        id: 'desktop/pebble-2b',
        name: 'pebble-2b',
        publisher: 'margaret',
        family: 'pebble',
        params: 2.4,
        context: 8_192,
        source: 'desktop',
        capabilities: [],
        tags: ['small'],
        summary: 'A small model the desktop runner pulled for its quick replies.',
        downloads: 0,
        likes: 0,
        updated: 90,
        variants: variants(2.4, { unified: ['4bit', '8bit'] }),
    },
]

/** The id a library model of this entry and variant gets: its name and rounding, lowercased. */
export function modelId(name: string, quant: string): string {
    return `${name}-${quant.toLowerCase()}`
}

/** Weights split into shards of under five gigabytes, as full weights are published. */
function shards(weights: number): ModelFile[] {
    const count = Math.max(1, Math.ceil(weights / 4.9e9))
    return Array.from({ length: count }, (_, index) => ({
        name: `model-${String(index + 1).padStart(5, '0')}-of-${String(count).padStart(5, '0')}.tensors`,
        size: Math.round(weights / count),
        role: 'weights' as const,
    }))
}

/** The files a variant lands as on disk, the weights first. */
export function filesOf(entry: CatalogEntry, variant: Variant): ModelFile[] {
    const vision = entry.capabilities.includes('vision')
    const projector = vision ? Math.round(entry.params * 62_000_000) : 0
    const weights = variant.size - projector - 1_200_000
    const base = `${entry.name}-${variant.quant}`
    const files: ModelFile[] =
        variant.format === 'packed'
            ? [{ name: `${base}.pack`, size: weights, role: 'weights' }]
            : variant.format === 'unified'
              ? weights > 5e9
                  ? [
                        { name: 'weights-1-of-2.uw', size: Math.round(weights / 2), role: 'weights' },
                        { name: 'weights-2-of-2.uw', size: weights - Math.round(weights / 2), role: 'weights' },
                    ]
                  : [{ name: 'weights.uw', size: weights, role: 'weights' }]
              : shards(weights)
    if (vision)
        files.push({
            name: variant.format === 'packed' ? `vision-${entry.name}-F16.pack` : 'vision.uw',
            size: projector,
            role: 'projector',
        })
    files.push({ name: 'tokenizer.json', size: 1_100_000, role: 'tokenizer' })
    files.push({ name: 'config.json', size: 2_400, role: 'config' })
    files.push({ name: 'README.md', size: 9_600, role: 'card' })
    return files
}

/** What a search asks of the sources. */
export interface CatalogQuery {
    text: string
    source: Source | 'all'
    format: Format | 'all'
}

/** The entries a query finds, the most pulled first, after a delay as a remote catalog answers. */
export function searchCatalog(query: CatalogQuery): Promise<CatalogEntry[]> {
    const words = query.text.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const found = CATALOG.filter(
        (entry) =>
            (query.source === 'all' || entry.source === query.source) &&
            (query.format === 'all' || entry.variants.some((variant) => variant.format === query.format)) &&
            words.every((word) =>
                [entry.name, entry.publisher, entry.family, entry.summary, ...entry.tags, ...entry.capabilities]
                    .join(' ')
                    .toLowerCase()
                    .includes(word),
            ),
    ).sort((a, b) => b.downloads - a.downloads || a.name.localeCompare(b.name))
    return new Promise((resolve) => setTimeout(() => resolve(found), 280 + words.length * 60))
}

export function entryOf(id: string): CatalogEntry | undefined {
    return CATALOG.find((entry) => entry.id === id)
}
