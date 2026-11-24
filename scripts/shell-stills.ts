/**
 * Starts every example's Electron and Tauri shell once, takes a still of its window and closes it.
 * A shell fails when it crashes, shows no window, or shows a window with nothing drawn in it.
 *
 *   xvfb-run -a -s '-screen 0 1920x1080x24' bun scripts/shell-stills.ts [--out <folder>] [--electron | --tauri] [example ...]
 *
 * It runs on Linux only, under a display of its own (Xvfb), and never on a desktop: the windows
 * it opens are real. It needs each example's web build and Electron main file (`bun run build:main`),
 * the Tauri shells built with `cargo build` into the shared Cargo target folder (`CARGO_TARGET_DIR`,
 * or the one example.mk uses), and xdotool and ImageMagick. An example's Electron shell runs its own
 * Electron binary, or, when its install skipped the download, another example's of the same
 * version. The stills go to `shell-stills/` unless `--out` names another folder, as
 * `<example>-electron.png` and `<example>-tauri.png`. CI runs it in a network namespace with no
 * network, so no shell reaches a public source.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { _electron } from '@playwright/test'

const ROOT = join(import.meta.dirname, '..')
const EXAMPLES = join(ROOT, 'examples')

/** How long a shell has to show its window, in milliseconds. */
const WINDOW_TIMEOUT = 60_000
/** How long a page draws after its window shows before the still is taken, in milliseconds. */
const SETTLE = { electron: 4_000, tauri: 8_000 }
/** A still with fewer colors than this has nothing drawn in it. */
const FEWEST_COLORS = 8

type Kind = 'electron' | 'tauri'

interface Outcome {
    id: string
    kind: Kind
    problem?: string
    warnings: string[]
}

/** Prints an error or a warning, as an annotation on the run when it runs in GitHub Actions. */
function say(level: 'error' | 'warning', message: string): void {
    const annotate = process.env.GITHUB_ACTIONS === 'true'
    console.log(annotate ? `::${level}::${message}` : `${level}: ${message}`)
}

/** Runs a tool and gives its output, or undefined when it fails. */
function tool(command: string, args: readonly string[]): string | undefined {
    const result = spawnSync(command, args, { encoding: 'utf8' })
    return result.status === 0 ? result.stdout : undefined
}

/** How many colors a still holds, by ImageMagick. */
function colors(file: string): number {
    const out = tool('identify', ['-format', '%k', file])
    if (out === undefined) throw new Error(`ImageMagick could not read ${file}`)
    return Number(out.trim())
}

/** Why a still shows nothing drawn, or undefined when it shows something. */
function blank(file: string): string | undefined {
    const count = colors(file)
    return count < FEWEST_COLORS ? `its window shows nothing drawn (${String(count)} colors)` : undefined
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** The Electron binary under an example's electron/, when its install fetched one, and the version it installed. */
function electronOf(id: string): { version: string; binary?: string } {
    const at = join(EXAMPLES, id, 'electron', 'node_modules', 'electron')
    const { version } = JSON.parse(readFileSync(join(at, 'package.json'), 'utf8')) as { version: string }
    const pathFile = join(at, 'path.txt')
    const binary = existsSync(pathFile) ? join(at, 'dist', readFileSync(pathFile, 'utf8').trim()) : undefined
    return { version, binary: binary !== undefined && existsSync(binary) ? binary : undefined }
}

/** The binary each Electron version runs on: the first example's that has one. */
function electronBinaries(ids: readonly string[]): Map<string, string> {
    const binaries = new Map<string, string>()
    for (const id of ids) {
        const { version, binary } = electronOf(id)
        if (binary !== undefined && !binaries.has(version)) binaries.set(version, binary)
    }
    return binaries
}

async function electronStill(id: string, out: string, binaries: Map<string, string>): Promise<Outcome> {
    const outcome: Outcome = { id, kind: 'electron', warnings: [] }
    const dir = join(EXAMPLES, id, 'electron')
    if (!existsSync(join(dir, 'dist', 'main.js'))) return { ...outcome, problem: 'its main file is not built (bun run build:main)' }
    const { version, binary } = electronOf(id)
    const executablePath = binary ?? binaries.get(version)
    if (executablePath === undefined) return { ...outcome, problem: `no Electron ${version} binary is installed in any example` }

    const app = await _electron.launch({ executablePath, args: ['.'], cwd: dir, timeout: WINDOW_TIMEOUT })
    let exit: string | undefined
    app.process().once('exit', (code, signal) => (exit = `it exited (${signal ?? `code ${String(code)}`})`))
    try {
        const page = await app.firstWindow({ timeout: WINDOW_TIMEOUT })
        page.on('pageerror', (error) => outcome.warnings.push(`page error: ${error.message}`))
        page.on('console', (message) => {
            if (message.type() === 'error') outcome.warnings.push(`console: ${message.text()}`)
        })
        await page.waitForLoadState('load', { timeout: WINDOW_TIMEOUT })
        await wait(SETTLE.electron)
        if (exit !== undefined) return { ...outcome, problem: exit }
        const file = join(out, `${id}-electron.png`)
        await page.screenshot({ path: file })
        return { ...outcome, problem: blank(file) }
    } catch (error) {
        return { ...outcome, problem: exit ?? (error instanceof Error ? error.message.split('\n')[0] : String(error)) }
    } finally {
        await Promise.race([app.close(), wait(10_000)]).catch(() => undefined)
        if (app.process().exitCode === null) app.process().kill('SIGKILL')
    }
}

/** The Cargo target folder the Tauri shells are built into, as example.mk names it. */
function cargoTarget(): string {
    return (
        process.env.CARGO_TARGET_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'sokkel-ui', 'examples-cargo-target')
    )
}

/** The name of an example's Tauri crate, which is its binary's. */
function crateOf(id: string): string {
    const manifest = readFileSync(join(EXAMPLES, id, 'tauri', 'src-tauri', 'Cargo.toml'), 'utf8')
    const name = /^name\s*=\s*"([^"]+)"/m.exec(manifest)?.[1]
    if (name === undefined) throw new Error(`examples/${id}/tauri/src-tauri/Cargo.toml names no crate`)
    return name
}

/** The visible windows a process shows, by xdotool. */
function windowsOf(pid: number): string[] {
    return (tool('xdotool', ['search', '--onlyvisible', '--pid', String(pid)]) ?? '').split('\n').filter((line) => line.trim() !== '')
}

/** Ends a process, by force when it does not end in five seconds. */
async function end(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) return
    const ended = new Promise((done) => child.once('exit', done))
    child.kill('SIGTERM')
    await Promise.race([ended, wait(5_000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
}

async function tauriStill(id: string, out: string, profile: string): Promise<Outcome> {
    const outcome: Outcome = { id, kind: 'tauri', warnings: [] }
    const binary = join(cargoTarget(), profile, crateOf(id))
    if (!existsSync(binary)) return { ...outcome, problem: `its binary is not built (${binary})` }

    // WebKitGTK draws without a GPU on a virtual display only with compositing and DMA-BUF off.
    const env = { ...process.env, WEBKIT_DISABLE_COMPOSITING_MODE: '1', WEBKIT_DISABLE_DMABUF_RENDERER: '1', NO_AT_BRIDGE: '1' }
    const child = spawn(binary, [], { env, stdio: ['ignore', 'pipe', 'pipe'] })
    const said: string[] = []
    const hear = (chunk: Buffer) =>
        said.push(
            ...chunk
                .toString()
                .split('\n')
                .filter((line) => line.trim() !== ''),
        )
    child.stdout.on('data', hear)
    child.stderr.on('data', hear)
    const exited = () =>
        child.exitCode !== null || child.signalCode !== null
            ? `it exited (${child.signalCode ?? `code ${String(child.exitCode)}`})`
            : undefined
    const lastWords = () => (said.length === 0 ? '' : `; its last output: ${said.slice(-5).join(' | ')}`)
    try {
        if (child.pid === undefined) return { ...outcome, problem: 'it did not start' }
        const started = Date.now()
        let window: string | undefined
        while (window === undefined && Date.now() - started < WINDOW_TIMEOUT) {
            const crashed = exited()
            if (crashed !== undefined) return { ...outcome, problem: crashed + lastWords() }
            window = windowsOf(child.pid).at(-1)
            if (window === undefined) await wait(500)
        }
        if (window === undefined) return { ...outcome, problem: `it showed no window in ${String(WINDOW_TIMEOUT / 1000)}s${lastWords()}` }
        await wait(SETTLE.tauri)
        const crashed = exited()
        if (crashed !== undefined) return { ...outcome, problem: crashed + lastWords() }
        const file = join(out, `${id}-tauri.png`)
        if (tool('import', ['-window', window, file]) === undefined)
            return { ...outcome, problem: 'ImageMagick could not take a still of its window' }
        return { ...outcome, problem: blank(file), warnings: said.filter((line) => /error|panic/i.test(line)).slice(0, 10) }
    } finally {
        await end(child)
    }
}

async function main(args: readonly string[]): Promise<void> {
    if (process.platform !== 'linux' || process.env.DISPLAY === undefined) {
        throw new Error(
            'This opens real windows, so it runs only on Linux under a display of its own: xvfb-run -a bun scripts/shell-stills.ts',
        )
    }
    const outAt = args.indexOf('--out')
    const out = resolve(ROOT, outAt === -1 ? 'shell-stills' : (args[outAt + 1] ?? 'shell-stills'))
    const kinds: Kind[] = args.includes('--electron') ? ['electron'] : args.includes('--tauri') ? ['tauri'] : ['electron', 'tauri']
    const named = args.filter((arg, at) => !arg.startsWith('--') && args[at - 1] !== '--out')
    const all = readdirSync(EXAMPLES)
        .filter((name) => existsSync(join(EXAMPLES, name, 'electron', 'package.json')) && existsSync(join(EXAMPLES, name, 'tauri')))
        .sort()
    const unknown = named.filter((id) => !all.includes(id))
    if (unknown.length > 0) throw new Error(`No example named ${unknown.join(', ')}`)
    const ids = named.length > 0 ? named : all
    if (ids.length === 0) throw new Error('No example has an electron/ and a tauri/ shell')
    mkdirSync(out, { recursive: true })

    const outcomes: Outcome[] = []
    const binaries = kinds.includes('electron') ? electronBinaries(all) : new Map<string, string>()
    for (const kind of kinds) {
        for (const id of ids) {
            const started = Date.now()
            const outcome = kind === 'electron' ? await electronStill(id, out, binaries) : await tauriStill(id, out, 'debug')
            outcomes.push(outcome)
            const took = `${((Date.now() - started) / 1000).toFixed(1)}s`
            console.log(`${kind} ${id}: ${outcome.problem === undefined ? 'still taken' : 'failed'} (${took})`)
            for (const warning of outcome.warnings) say('warning', `${id} (${kind}): ${warning}`)
        }
    }

    const failed = outcomes.filter((outcome) => outcome.problem !== undefined)
    for (const { id, kind, problem } of failed) say('error', `${id} (${kind}): ${problem ?? ''}`)
    console.log(
        `\n${String(outcomes.length - failed.length)} of ${String(outcomes.length)} shells showed their window; the stills are in ${out}`,
    )
    if (failed.length > 0) process.exitCode = 1
}

await main(process.argv.slice(2))
