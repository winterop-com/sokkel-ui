/**
 * Builds every package into its dist/: the core first, then the add-ons side by side, since each
 * add-on reads the core's types and none reads another's. A build's output is shown only when it
 * fails. Each run leaves a stamp in node_modules/.cache, which the examples compare against.
 *
 * `--if-changed` builds nothing when no package source (nor the root config the builds read) is
 * newer than the stamp and every package has its dist/.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const PACKAGES = join(ROOT, 'packages')
const STAMP = join(ROOT, 'node_modules/.cache/sokkel-ui/packages.stamp')
const ROOT_INPUTS = ['package.json', 'bun.lock', 'tsconfig.json', 'vite.lib.ts']
const SKIPPED = new Set(['node_modules', 'dist'])

const names = readdirSync(PACKAGES).filter((name) => existsSync(join(PACKAGES, name, 'package.json')))
const addons = names.filter((name) => name !== 'core').sort()

/** The newest modification time under `path`, leaving out node_modules and dist. */
function newest(path: string): number {
    const stat = statSync(path)
    if (!stat.isDirectory()) return stat.mtimeMs
    let latest = stat.mtimeMs
    for (const entry of readdirSync(path)) {
        if (SKIPPED.has(entry)) continue
        latest = Math.max(latest, newest(join(path, entry)))
    }
    return latest
}

function upToDate(): boolean {
    if (!existsSync(STAMP)) return false
    if (names.some((name) => !existsSync(join(PACKAGES, name, 'dist')))) return false
    const built = statSync(STAMP).mtimeMs
    const inputs = [...names.map((name) => join(PACKAGES, name)), ...ROOT_INPUTS.map((file) => join(ROOT, file))]
    return inputs.every((path) => !existsSync(path) || newest(path) <= built)
}

async function build(name: string): Promise<void> {
    const started = performance.now()
    const child = spawn('bun', ['run', 'build'], { cwd: join(PACKAGES, name) })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk))
    child.stderr.on('data', (chunk: Buffer) => (output += chunk))
    const code = await new Promise<number | null>((done) => child.on('close', done))
    const seconds = ((performance.now() - started) / 1000).toFixed(1)
    if (code !== 0) {
        process.stderr.write(output)
        throw new Error(`${name} did not build (exit ${code})`)
    }
    console.log(`  ${name.padEnd(10)} ${seconds}s`)
}

if (process.argv.includes('--if-changed') && upToDate()) {
    console.log('The packages are up to date.')
    process.exit(0)
}

// The stamp takes the time the build began, so a source saved during it counts as newer.
const began = new Date()
try {
    await build('core')
    const results = await Promise.allSettled(addons.map(build))
    const failed = results.filter((result) => result.status === 'rejected')
    if (failed.length > 0) throw new Error(failed.map((result) => String(result.reason?.message)).join('\n'))
} catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
}

mkdirSync(join(STAMP, '..'), { recursive: true })
writeFileSync(STAMP, `${began.toISOString()}\n`)
utimesSync(STAMP, began, began)
