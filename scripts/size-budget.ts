/**
 * Builds the apps in examples/sizes against the built packages and fails when one grows past its
 * budget in examples/sizes/budget.json, or bundles an engine its budget does not list.
 *
 *   bun run build && bun run size
 *
 * The apps import the packages by their names, which resolve through the workspace's links and each
 * package's own `exports`, so each bundles what an installed copy would give it. The forms app
 * imports only the core package. Every size is gzipped, in kB: `start` is the
 * JavaScript loaded with the page, `lazy` what is fetched later by a dynamic import, and `css` the
 * stylesheet.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { build, type Rolldown } from 'vite'

const ROOT = join(import.meta.dirname, '..')
const APPS = join(ROOT, 'examples/sizes')

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
}

type Measure = 'start' | 'lazy' | 'css'
const MEASURES: Measure[] = ['start', 'lazy', 'css']

type Budget = Record<Measure, number> & {
    /** The engines the app may bundle. */
    engines: string[]
}

const unbuilt = ['core', 'charts', 'maps', 'graph', 'terminal', 'media'].filter((name) => !existsSync(join(ROOT, 'packages', name, 'dist')))
if (unbuilt.length > 0) {
    console.error(`No dist/ to build against in ${unbuilt.join(', ')}: run \`bun run build\` first.`)
    process.exit(1)
}

const budgets = JSON.parse(readFileSync(join(APPS, 'budget.json'), 'utf8')) as Record<string, Budget>

const gzipped = (source: string | Uint8Array) => gzipSync(source, { level: 9 }).length / 1000

async function measure(name: string): Promise<Record<Measure, number> & { engines: string[] }> {
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
    const visit = (file: string) => {
        if (atStart.has(file)) return
        atStart.add(file)
        for (const next of byFile.get(file)?.imports ?? []) visit(next)
    }
    for (const chunk of chunks) if (chunk.isEntry) visit(chunk.fileName)

    const sum = (sizes: number[]) => sizes.reduce((total, size) => total + size, 0)
    const modules = chunks.flatMap((chunk) => chunk.moduleIds)
    return {
        start: sum(chunks.filter((chunk) => atStart.has(chunk.fileName)).map((chunk) => gzipped(chunk.code))),
        lazy: sum(chunks.filter((chunk) => !atStart.has(chunk.fileName)).map((chunk) => gzipped(chunk.code))),
        css: sum(styles.map((style) => gzipped(style.source))),
        engines: Object.keys(ENGINES).filter((engine) => modules.some((id) => ENGINES[engine].test(id))),
    }
}

const failures: string[] = []
for (const [name, budget] of Object.entries(budgets)) {
    const size = await measure(name)
    const cells = MEASURES.map((key) => `${key} ${size[key].toFixed(1).padStart(6)} of ${String(budget[key]).padStart(3)} kB`)
    console.log(`${name.padEnd(10)} ${cells.join('   ')}   engines: ${size.engines.join(', ') || 'none'}`)
    for (const key of MEASURES)
        if (size[key] > budget[key]) failures.push(`${name}: ${key} is ${size[key].toFixed(1)} kB, over its budget of ${budget[key]} kB`)
    for (const engine of size.engines.filter((engine) => !budget.engines.includes(engine)))
        failures.push(`${name}: bundles ${engine}, which it does not use`)
    for (const engine of budget.engines.filter((engine) => !(engine in ENGINES)))
        failures.push(`${name}: its budget lists ${engine}, which is not one of ${Object.keys(ENGINES).join(', ')}`)
}

if (failures.length > 0) {
    console.error(`\n${failures.join('\n')}\n\nShrink the change, or raise the budget in examples/sizes/budget.json on purpose.`)
    process.exit(1)
}
