/**
 * Builds every example's web app and gathers them into one static site: each app's build in a
 * folder named for its example, and an index page that lists them, drawn with the library's own
 * parts. The Pages workflow publishes the site beside Storybook, under `examples/`.
 *
 *   bun run build && bun scripts/examples-site.ts [--shots] [--out <folder>]
 *
 * An example is a folder in `examples/` with a `web/` app. The index takes its name and one line
 * from its `example.json` (`{ "name", "summary" }`), or, without one, from the comment that heads its
 * Makefile (`# Name: what it is.`). `--shots` takes a still of each app, light and dark, in
 * Playwright's chromium, for its card. The site goes to `examples-static/` unless `--out` names
 * another folder, which is emptied first. Every app is built with `base: './'`, so the site works
 * under any path.
 */
import type { SiteExample } from 'virtual:examples'

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { basename, extname, join, normalize, resolve, sep } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { build, type Plugin } from 'vite'

import { appearanceScript } from '@winterop-com/sokkel-ui/lib/appearance'

const ROOT = join(import.meta.dirname, '..')
const EXAMPLES = join(ROOT, 'examples')
const INDEX = join(import.meta.dirname, 'examples-site')

/** The index's own files and the stills, in folders apart from the examples, whose names never start with `_`. */
const INDEX_ASSETS = '_index'
const STILLS = '_stills'

/** The short names of the library's packages an example's web app installs, the core first. */
export function packagesOf(web: string): string[] {
    const manifest = JSON.parse(readFileSync(join(web, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
    return Object.keys(manifest.dependencies ?? {})
        .filter((name) => name.startsWith('@winterop-com/sokkel-ui'))
        .map((name) => (name === '@winterop-com/sokkel-ui' ? 'core' : name.replace('@winterop-com/sokkel-ui-', '')))
        .sort((a, b) => (a === 'core' ? -1 : b === 'core' ? 1 : a.localeCompare(b)))
}

/** An example's name and line, from its example.json, or else from the comment heading its Makefile. */
export function describeExample(folder: string): { name: string; summary: string } {
    const json = join(folder, 'example.json')
    if (existsSync(json)) {
        const { name, summary } = JSON.parse(readFileSync(json, 'utf8')) as { name?: unknown; summary?: unknown }
        if (typeof name !== 'string' || typeof summary !== 'string') throw new Error(`${json} needs a "name" and a "summary"`)
        return { name, summary }
    }
    const makefile = join(folder, 'Makefile')
    const lines = existsSync(makefile) ? readFileSync(makefile, 'utf8').split('\n') : []
    const end = lines.findIndex((line) => !line.startsWith('#'))
    const head = (end === -1 ? lines : lines.slice(0, end))
        .map((line) => line.replace(/^#\s?/, ''))
        .join(' ')
        .replace('`make help` lists the targets.', '')
        .trim()
    const match = /^([^:]+):\s*(.+)$/.exec(head)
    if (match === null) {
        const id = basename(folder)
        return { name: id.charAt(0).toUpperCase() + id.slice(1), summary: '' }
    }
    const summary = match[2].charAt(0).toUpperCase() + match[2].slice(1)
    return { name: match[1].trim(), summary: summary.endsWith('.') ? summary : `${summary}.` }
}

function run(command: string, args: string[], cwd: string): void {
    const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`)
}

const TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.wasm': 'application/wasm',
}

/** Serves the folder `out` under a path of its own, as Pages does. */
async function serve(out: string, prefix: string): Promise<{ url: string; stop: () => void }> {
    const server = createServer((request, response) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        let path = normalize(join(out, decodeURIComponent(pathname.slice(prefix.length))))
        if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html')
        if (!pathname.startsWith(prefix) || !path.startsWith(out + sep) || !existsSync(path)) {
            response.writeHead(404).end()
            return
        }
        response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path))
    })
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo
    return { url: `http://127.0.0.1:${String(port)}${prefix}`, stop: () => void server.close() }
}

/** Takes each example's still at its first page, light and dark, and says what threw while it loaded. */
async function takeStills(out: string, ids: readonly string[]): Promise<void> {
    const { chromium } = await import('@playwright/test')
    const site = await serve(out, '/sokkel-ui/examples/')
    const browser = await chromium.launch()
    mkdirSync(join(out, STILLS), { recursive: true })
    try {
        for (const id of ids) {
            for (const colorScheme of ['light', 'dark'] as const) {
                const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme, reducedMotion: 'reduce' })
                const page = await context.newPage()
                const errors: string[] = []
                page.on('pageerror', (error) => errors.push(error.message))
                await page.goto(`${site.url}${id}/`, { waitUntil: 'load' })
                await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
                await page.waitForTimeout(1_500)
                await page.screenshot({ path: join(out, STILLS, `${id}-${colorScheme}.jpg`), type: 'jpeg', quality: 80 })
                for (const error of errors) console.warn(`${id} (${colorScheme}): ${error}`)
                await context.close()
            }
            console.log(`still: ${id}`)
        }
    } finally {
        await browser.close()
        site.stop()
    }
}

/** The examples as the module `virtual:examples`, which the index page imports. */
function examplesModule(examples: readonly SiteExample[]): Plugin {
    const id = 'virtual:examples'
    return {
        name: 'examples',
        resolveId: (source) => (source === id ? `\0${id}` : undefined),
        load: (source) => (source === `\0${id}` ? `export default ${JSON.stringify(examples)}` : undefined),
    }
}

/** Writes the kept look on `<html>` before the index draws, as every app does. */
const appearance: Plugin = {
    name: 'appearance',
    transformIndexHtml: () => [{ tag: 'script', children: appearanceScript(), injectTo: 'head-prepend' }],
}

async function main(args: readonly string[]): Promise<void> {
    const shots = args.includes('--shots')
    const outAt = args.indexOf('--out')
    const out = resolve(ROOT, outAt === -1 ? 'examples-static' : (args[outAt + 1] ?? 'examples-static'))

    const ids = readdirSync(EXAMPLES)
        .filter((name) => existsSync(join(EXAMPLES, name, 'web', 'package.json')))
        .sort()
    if (ids.length === 0) throw new Error('No example has a web/ app')

    // The out folder is emptied, so it must be new, empty or a site this script built or began before.
    const building = join(out, '.building')
    if (existsSync(out) && readdirSync(out).length > 0 && !existsSync(join(out, INDEX_ASSETS)) && !existsSync(building)) {
        throw new Error(`${out} holds something other than an examples site; name another folder with --out`)
    }
    rmSync(out, { recursive: true, force: true })
    mkdirSync(out, { recursive: true })
    writeFileSync(building, '')

    for (const id of ids) {
        const web = join(EXAMPLES, id, 'web')
        console.log(`\nbuild: ${id}`)
        run('bun', process.env.CI === undefined ? ['install'] : ['install', '--frozen-lockfile'], web)
        run('bun', ['run', 'build'], web)
        cpSync(join(web, 'dist'), join(out, id), { recursive: true })
    }

    if (shots) await takeStills(out, ids)

    const examples: SiteExample[] = ids
        .map((id) => ({
            id,
            ...describeExample(join(EXAMPLES, id)),
            packages: packagesOf(join(EXAMPLES, id, 'web')),
            stills: shots ? { light: `./${STILLS}/${id}-light.jpg`, dark: `./${STILLS}/${id}-dark.jpg` } : undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

    await build({
        configFile: false,
        root: INDEX,
        base: './',
        logLevel: 'warn',
        plugins: [react(), tailwindcss(), examplesModule(examples), appearance],
        resolve: { dedupe: ['react', 'react-dom'] },
        build: { outDir: out, emptyOutDir: false, assetsDir: INDEX_ASSETS, reportCompressedSize: false },
    })
    rmSync(building)

    console.log(`\n${String(examples.length)} examples in ${out}: ${examples.map((example) => example.id).join(', ')}`)
}

if (import.meta.main) await main(process.argv.slice(2))
