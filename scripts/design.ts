/**
 * Keep `design/`, the copy of the sokkel-design contract that `src/parts.test.ts` checks the
 * components against: its `index.json` and the JSON files under `schema/`, `parts/` and `patterns/`,
 * as they are at the commit `design/pin.json` names. The copy is written as the contract has it,
 * byte for byte, and never edited here: a change to a spec is a sokkel-design PR, then a moved pin.
 *
 *   bun run design                             write the copy at the pinned commit
 *   bun run design --ref main                  move the pin to a branch, tag or commit, and write the copy there
 *   bun run design --from ../sokkel-design     copy from a checkout and pin its HEAD, which must hold the files as committed
 *   bun run design --check                     fail when the copy is not the pinned commit's; skipped when GitHub cannot be reached
 *
 * A commit is read with git over HTTPS (`git ls-remote`, then a fetch of that one commit), never
 * through the GitHub API, so the check shares no API limit.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const DESIGN = join(import.meta.dirname, '..', 'design')
const PIN = join(DESIGN, 'pin.json')
const REPO = 'https://github.com/winterop-com/sokkel-design'

interface Pin {
    $description?: string
    repo: string
    commit: string
}

/** The contract's files the copy holds: the index and the JSON of the schemas, parts and patterns. */
function copied(path: string): boolean {
    return path === 'index.json' || /^(schema|parts|patterns)\/[^/]+\.json$/.test(path)
}

function git(args: string[], cwd?: string): string {
    return execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
}

/** Whether the repository answers at all; a check is skipped rather than failed when it does not. */
function reachable(repo: string): boolean {
    try {
        git(['ls-remote', repo, 'HEAD'])
        return true
    } catch {
        return false
    }
}

/** The contract's files at a ref (a branch, a tag or a commit) and the commit it names. */
function fetched(repo: string, ref: string): { commit: string; files: Map<string, Buffer> } {
    const dir = mkdtempSync(join(tmpdir(), 'sokkel-design-'))
    try {
        git(['init', '-q'], dir)
        git(['fetch', '-q', '--depth', '1', repo, ref], dir)
        const commit = git(['rev-parse', 'FETCH_HEAD'], dir).trim()
        const files = new Map<string, Buffer>()
        for (const path of git(['ls-tree', '-r', '--name-only', 'FETCH_HEAD'], dir).split('\n').filter(copied)) {
            files.set(path, execFileSync('git', ['show', `FETCH_HEAD:${path}`], { cwd: dir }))
        }
        return { commit, files }
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}

/** The contract's files in a checkout and its HEAD, refusing a checkout whose copied files differ from that commit. */
function checkout(dir: string): { commit: string; files: Map<string, Buffer> } {
    const changed = git(['status', '--porcelain', '--', 'index.json', 'schema', 'parts', 'patterns'], dir).trim()
    if (changed !== '')
        throw new Error(
            `${dir} has uncommitted changes in the contract's files; commit them first, so the pin names what is copied:\n${changed}`,
        )
    const commit = git(['rev-parse', 'HEAD'], dir).trim()
    const files = new Map<string, Buffer>()
    for (const path of git(['ls-files'], dir).split('\n').filter(copied)) files.set(path, readFileSync(join(dir, path)))
    return { commit, files }
}

/** The copy's files now, by their path in the contract. */
function local(): Map<string, Buffer> {
    const files = new Map<string, Buffer>()
    if (existsSync(join(DESIGN, 'index.json'))) files.set('index.json', readFileSync(join(DESIGN, 'index.json')))
    for (const folder of ['schema', 'parts', 'patterns']) {
        if (!existsSync(join(DESIGN, folder))) continue
        for (const name of readdirSync(join(DESIGN, folder))) {
            const path = `${folder}/${name}`
            if (copied(path)) files.set(path, readFileSync(join(DESIGN, path)))
        }
    }
    return files
}

/** What differs between the copy and the contract's files: each path missing, extra or changed. */
function differences(copy: Map<string, Buffer>, contract: Map<string, Buffer>): string[] {
    const paths = [...new Set([...copy.keys(), ...contract.keys()])].sort()
    return paths.flatMap((path) => {
        const mine = copy.get(path)
        const theirs = contract.get(path)
        if (mine === undefined) return [`design/${path} is missing`]
        if (theirs === undefined) return [`design/${path} is not in the contract`]
        return mine.equals(theirs) ? [] : [`design/${path} differs`]
    })
}

function write(commit: string, repo: string, files: Map<string, Buffer>): void {
    for (const path of local().keys()) if (!files.has(path)) rmSync(join(DESIGN, path))
    for (const [path, content] of files) {
        mkdirSync(dirname(join(DESIGN, path)), { recursive: true })
        writeFileSync(join(DESIGN, path), content)
    }
    const pin: Pin = {
        $description: 'The sokkel-design commit design/ is a copy of. Move it with `bun run design --ref <ref>`; never edit the copy.',
        repo,
        commit,
    }
    writeFileSync(PIN, `${JSON.stringify(pin, null, 4)}\n`)
    console.log(`design/ holds ${String(files.size)} files of ${repo} at ${commit}`)
}

function option(name: string): string | undefined {
    const at = process.argv.indexOf(name)
    if (at < 0) return undefined
    const value = process.argv[at + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} takes a value`)
    return value
}

function main(): void {
    const pin = existsSync(PIN) ? (JSON.parse(readFileSync(PIN, 'utf8')) as Pin) : undefined
    const repo = pin?.repo ?? REPO
    const from = option('--from')
    const ref = option('--ref')

    if (process.argv.includes('--check')) {
        if (pin === undefined) throw new Error('design/pin.json is missing; run `bun run design --ref main`')
        if (!reachable(repo)) {
            const said = `design --check skipped: ${repo} cannot be reached`
            console.log(process.env.GITHUB_ACTIONS === 'true' ? `::warning::${said}` : said)
            return
        }
        const contract = fetched(repo, pin.commit)
        const found = differences(local(), contract.files)
        if (found.length > 0) {
            console.error(`design/ is not ${repo} at ${pin.commit}:\n${found.map((line) => `  ${line}`).join('\n')}`)
            console.error('Run `bun run design` to write the pinned copy, or move the pin with `bun run design --ref <ref>`.')
            process.exit(1)
        }
        console.log(`design/ is ${repo} at ${pin.commit}`)
        return
    }

    if (from !== undefined) {
        const { commit, files } = checkout(from)
        write(commit, repo, files)
        return
    }
    const target = ref ?? pin?.commit
    if (target === undefined) throw new Error('No pin yet: name a ref, as `bun run design --ref main`')
    if (!reachable(repo)) throw new Error(`${repo} cannot be reached`)
    const { commit, files } = fetched(repo, target)
    write(commit, repo, files)
}

main()
