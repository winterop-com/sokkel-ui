/**
 * Builds the apps in size/ against the built packages and fails when one grows past its
 * budget in size/budget.json, or bundles an engine its budget does not list.
 *
 *   bun run build && bun run size
 *
 * The apps import the packages by their names, which resolve through the workspace's links and each
 * package's own `exports`, so each bundles what an installed copy would give it. The forms app
 * imports only the core package, on its styles.css; forms-lean is the same app on styles-base.css
 * and its modules' lists of sources. Every size is gzipped, in kB: `start` is the
 * JavaScript loaded with the page, `lazy` what is fetched later by a dynamic import, and `css` the
 * stylesheet. An app whose budget names `first` is held to one more: the JavaScript a page fetches
 * before its first drawing, the start and the lazy chunks holding the modules `first.fetches` names
 * with all they import. `lazy` adds up every chunk a page could ever fetch, so it grows when an
 * engine is split finer while each page fetches less; `first` follows what one page waits for.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { build, type Rolldown } from 'vite'

import { PACKAGES } from './components-index'

const ROOT = join(import.meta.dirname, '..')
const APPS = join(ROOT, 'size')

/** The engines an app pays for only when it uses them, each known by the packages it is built from. */
const ENGINES: Record<string, RegExp> = {
    echarts: /\/node_modules\/(echarts|zrender)\//,
    maplibre: /\/node_modules\/maplibre-gl\//,
    'react-flow': /\/node_modules\/(@xyflow|elkjs)\//,
    xterm: /\/node_modules\/@xterm\//,
    'hls.js': /\/node_modules\/hls\.js\//,
    codemirror: /\/node_modules\/(@codemirror|@lezer)\//,
    mermaid: /\/node_modules\/mermaid\//,
    katex: /\/node_modules\/(katex|rehype-katex|remark-math)\//,
    'dnd-kit': /\/node_modules\/@dnd-kit\//,
}

type Measure = 'start' | 'lazy' | 'css'
const MEASURES: Measure[] = ['start', 'lazy', 'css']

type Budget = Record<Measure, number> & {
    /** The engines the app may bundle. */
    engines: string[]
    /** What a page fetches before its first drawing: the modules it loads first by a dynamic import, and its budget. */
    first?: { budget: number; fetches: string[] }
}

const unbuilt = PACKAGES.filter((name) => !existsSync(join(ROOT, 'packages', name, 'dist')))
if (unbuilt.length > 0) {
    console.error(`No dist/ to build against in ${unbuilt.join(', ')}: run \`bun run build\` first.`)
    process.exit(1)
}

const budgets = JSON.parse(readFileSync(join(APPS, 'budget.json'), 'utf8')) as Record<string, Budget>

const gzipped = (source: string | Uint8Array) => gzipSync(source, { level: 9 }).length / 1000

async function measure(name: string, fetches: readonly string[]): Promise<Record<Measure, number> & { engines: string[]; first: number }> {
    const root = join(APPS, name)
    const result = await build({
        configFile: false,
        root,
        logLevel: 'error',
        plugins: [react(), tailwindcss()],
        build: { write: false, reportCompressedSize: false, rolldownOptions: { input: join(root, 'main.tsx') } },
    })
    const output = (Array.isArray(result) ? result : [result as Rolldown.RolldownOutput]).flatMap((out) => out.output)
    const chunks = output.filter((out): out is Rolldown.OutputChunk => out.type === 'chunk')
    const styles = output.filter((out): out is Rolldown.OutputAsset => out.type === 'asset' && out.fileName.endsWith('.css'))

    // The entry and every chunk it imports statically load with the page; the rest wait for a dynamic import.
    const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
    const atStart = new Set<string>()
    const reach = (into: Set<string>) => {
        const visit = (file: string) => {
            if (into.has(file)) return
            into.add(file)
            for (const next of byFile.get(file)?.imports ?? []) visit(next)
        }
        return visit
    }
    const visitStart = reach(atStart)
    for (const chunk of chunks) if (chunk.isEntry) visitStart(chunk.fileName)

    // The start, and each chunk holding a module the page fetches first, with every chunk it imports.
    const atFirst = new Set(atStart)
    const visitFirst = reach(atFirst)
    for (const wanted of fetches) {
        const holding = chunks.filter((chunk) => chunk.moduleIds.some((id) => id.endsWith(wanted)))
        if (holding.length === 0) throw new Error(`${name}: no chunk holds ${wanted}, which its budget's first.fetches names`)
        for (const chunk of holding) visitFirst(chunk.fileName)
    }

    const sum = (sizes: number[]) => sizes.reduce((total, size) => total + size, 0)
    const modules = chunks.flatMap((chunk) => chunk.moduleIds)
    return {
        start: sum(chunks.filter((chunk) => atStart.has(chunk.fileName)).map((chunk) => gzipped(chunk.code))),
        lazy: sum(chunks.filter((chunk) => !atStart.has(chunk.fileName)).map((chunk) => gzipped(chunk.code))),
        css: sum(styles.map((style) => gzipped(style.source))),
        first: sum(chunks.filter((chunk) => atFirst.has(chunk.fileName)).map((chunk) => gzipped(chunk.code))),
        engines: Object.keys(ENGINES).filter((engine) => modules.some((id) => ENGINES[engine].test(id))),
    }
}

const failures: string[] = []
for (const [name, budget] of Object.entries(budgets)) {
    const size = await measure(name, budget.first?.fetches ?? [])
    const cells = MEASURES.map((key) => `${key} ${size[key].toFixed(1).padStart(6)} of ${String(budget[key]).padStart(3)} kB`)
    if (budget.first !== undefined)
        cells.push(`first ${size.first.toFixed(1).padStart(6)} of ${String(budget.first.budget).padStart(3)} kB`)
    console.log(`${name.padEnd(10)} ${cells.join('   ')}   engines: ${size.engines.join(', ') || 'none'}`)
    for (const key of MEASURES)
        if (size[key] > budget[key]) failures.push(`${name}: ${key} is ${size[key].toFixed(1)} kB, over its budget of ${budget[key]} kB`)
    if (budget.first !== undefined && size.first > budget.first.budget)
        failures.push(`${name}: first is ${size.first.toFixed(1)} kB, over its budget of ${budget.first.budget} kB`)
    for (const engine of size.engines.filter((engine) => !budget.engines.includes(engine)))
        failures.push(`${name}: bundles ${engine}, which it does not use`)
    for (const engine of budget.engines.filter((engine) => !(engine in ENGINES)))
        failures.push(`${name}: its budget lists ${engine}, which is not one of ${Object.keys(ENGINES).join(', ')}`)
}

if (failures.length > 0) {
    console.error(`\n${failures.join('\n')}\n\nShrink the change, or raise the budget in size/budget.json on purpose.`)
    process.exit(1)
}
