/**
 * Starts every example's Electron and Tauri shell once, takes a still of its window and closes it.
 * A shell fails when it crashes, shows no window, or shows a window with nothing drawn in it.
 *
 *   xvfb-run -a -s '-screen 0 1920x1080x24' bun scripts/shell-stills.ts [--out <folder>] [--electron | --tauri] [example ...]
 *
 * It runs on Linux only, under a display of its own (Xvfb), and never on a desktop: the windows
 * it opens are real. It needs each example's web build, its Electron main file (`bun run build:main`)
 * and the Electron binary its install fetched, the Tauri shells built with `cargo build` into the
 * shared Cargo target folder (`CARGO_TARGET_DIR`, or the one example.mk uses), and xdotool and
 * ImageMagick, which find each shell's window and take its still. The stills go to `shell-stills/`
 * unless `--out` names another folder, as `<example>-electron.png` and `<example>-tauri.png`. CI runs
 * it in a network namespace with no network, so no shell reaches a public source.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const EXAMPLES = join(ROOT, 'examples')

/** How long a shell has to show its window, in milliseconds. */
const WINDOW_TIMEOUT = 60_000
/** How long a page draws after its window shows before the still is taken, in milliseconds. */
const SETTLE = 5_000
/** A still with fewer colors than this has nothing drawn in it. */
const FEWEST_COLORS = 8
/** A line a shell prints that is worth a warning on the run. */
const WARNING = /error|panic|uncaught/i
/** What a shell prints on any virtual display without a GPU, a sound card or a network, and says nothing of the app. */
const NOISE = /dbus|ALSA|alsa_util|DRI3|libEGL|gpu|viz_main|network_service|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/i

type Kind = 'electron' | 'tauri'

interface Outcome {
    id: string
    kind: Kind
    problem?: string
    /** How long its window took to show, in milliseconds. */
    shown?: number
    warnings: string[]
}

/** How a shell is started: its program, its arguments, where and with what added to the environment. */
interface Launch {
    command: string
    args: string[]
    cwd: string
    env: Record<string, string>
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

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** Why a still shows nothing drawn, or undefined when it shows something. */
function blank(file: string): string | undefined {
    const out = tool('identify', ['-format', '%k', file])
    if (out === undefined) return `ImageMagick could not read ${file}`
    const count = Number(out.trim())
    return count < FEWEST_COLORS ? `its window shows nothing drawn (${String(count)} colors)` : undefined
}

/** How an example's Electron shell starts: its own Electron binary on its built main file. */
function electronLaunch(id: string): Launch | string {
    const dir = join(EXAMPLES, id, 'electron')
    if (!existsSync(join(dir, 'dist', 'main.js'))) return 'its main file is not built (bun run build:main)'
    const electron = join(dir, 'node_modules', 'electron')
    const pathFile = join(electron, 'path.txt')
    const binary = existsSync(pathFile) ? join(electron, 'dist', readFileSync(pathFile, 'utf8').trim()) : undefined
    if (binary === undefined || !existsSync(binary)) return 'its install fetched no Electron binary'
    // Chromium's sandbox needs a setuid helper or user namespaces, which a CI runner has neither of;
    // and with no GPU, WebGL (the maps) draws only on SwiftShader, which Chromium blocks unless asked.
    const flags = ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']
    return { command: binary, args: [...flags, '.'], cwd: dir, env: {} }
}

/** The Cargo target folder the Tauri shells are built into, as example.mk names it. */
function cargoTarget(): string {
    return (
        process.env.CARGO_TARGET_DIR ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'sokkel-ui', 'examples-cargo-target')
    )
}

/** How an example's Tauri shell starts: its debug binary, named for its crate. */
function tauriLaunch(id: string): Launch | string {
    const dir = join(EXAMPLES, id, 'tauri', 'src-tauri')
    const crate = /^name\s*=\s*"([^"]+)"/m.exec(readFileSync(join(dir, 'Cargo.toml'), 'utf8'))?.[1]
    if (crate === undefined) return 'its Cargo.toml names no crate'
    const binary = join(cargoTarget(), 'debug', crate)
    if (!existsSync(binary)) return `its binary is not built (${binary})`
    // WebKitGTK draws without a GPU on a virtual display only with compositing and DMA-BUF off.
    return { command: binary, args: [], cwd: dir, env: { WEBKIT_DISABLE_COMPOSITING_MODE: '1', WEBKIT_DISABLE_DMABUF_RENDERER: '1' } }
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

/** Starts one shell, waits for its window, lets the page draw, takes the still and closes the shell. */
async function still(id: string, kind: Kind, out: string): Promise<Outcome> {
    const outcome: Outcome = { id, kind, warnings: [] }
    const launch = kind === 'electron' ? electronLaunch(id) : tauriLaunch(id)
    if (typeof launch === 'string') return { ...outcome, problem: launch }

    const child = spawn(launch.command, launch.args, {
        cwd: launch.cwd,
        env: { ...process.env, NO_AT_BRIDGE: '1', ...launch.env },
        stdio: ['ignore', 'pipe', 'pipe'],
    })
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
        outcome.shown = Date.now() - started
        await wait(SETTLE)
        const crashed = exited()
        if (crashed !== undefined) return { ...outcome, problem: crashed + lastWords() }
        const file = join(out, `${id}-${kind}.png`)
        if (tool('import', ['-window', window, file]) === undefined)
            return { ...outcome, problem: 'ImageMagick could not take a still of its window' }
        return { ...outcome, problem: blank(file), warnings: said.filter((line) => WARNING.test(line) && !NOISE.test(line)).slice(0, 10) }
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
    for (const kind of kinds) {
        for (const id of ids) {
            const started = Date.now()
            const outcome = await still(id, kind, out)
            outcomes.push(outcome)
            const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`
            const shown = outcome.shown === undefined ? '' : `, window after ${seconds(outcome.shown)}`
            console.log(
                `${kind} ${id}: ${outcome.problem === undefined ? 'still taken' : 'failed'} (${seconds(Date.now() - started)}${shown})`,
            )
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
