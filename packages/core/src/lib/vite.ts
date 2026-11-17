/// <reference types="node" />
/**
 * A Vite plugin that gives an app the stylesheet of the parts it imports alone. Where the app imports
 * the core's `styles.css`, from its stylesheet or its code, it becomes `styles-base.css` and the list
 * of sources, `sources/<module>.css`, of every module of the library the app's code imports, and the
 * add-ons' `styles.css` go, their lists taking their place. The app's code is read from Vite's root,
 * from every file a relative import there reaches, and from every package it imports that depends on
 * the library.
 *
 *   // vite.config.ts
 *   import tailwindcss from '@tailwindcss/vite'
 *   import { sokkelStyles } from '@winterop-com/sokkel-ui/vite'
 *   export default { plugins: [sokkelStyles(), tailwindcss()] }
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'

export interface SokkelStylesOptions {
    /** The folders the app's code is read from; Vite's root when not given. A relative path is taken from the root. */
    dirs?: readonly string[]
}

const CORE = '@winterop-com/sokkel-ui'
/** A module of the library as an app imports it: the package and its path in the package's `exports`. */
const IMPORT = /['"](@winterop-com\/sokkel-ui(?:-[a-z0-9]+)?)\/([\w./-]+?)['"]/g
/** A relative import or re-export, static or dynamic. */
const RELATIVE = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"?]+)['"]/g
/** A bare import: a package, or a module in one. */
const BARE = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]((?:@[\w-][\w.-]*\/)?\w[\w.-]*)(?:\/[^'"]*)?['"]/g
/** The core's stylesheet and the add-ons', as a stylesheet imports them. */
const STYLES_IMPORT = /^[ \t]*@import\s+['"](@winterop-com\/sokkel-ui(?:-[a-z0-9]+)?)\/styles\.css['"][^;\n]*;?[ \t]*\r?\n?/gm
const CODE = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|mdx)$/
const NOT_CODE = /\.(?:test|spec|stories|d)\.[cm]?[jt]sx?$/
/** The folders left out of an app's own code: installed packages, built output and reports. */
const OUTPUT = new Set(['node_modules', 'dist', 'build', 'coverage', 'storybook-static'])
/** The folders left out of an installed package, whose built output is its code. */
const INSTALLED = new Set(['node_modules'])

const isLibrary = (name: string) => name === CORE || name.startsWith(`${CORE}-`)

/** Every file of code under `dir`, leaving out hidden folders, the folders `left` names and the paths in `skip`. */
function codeUnder(dir: string, left: ReadonlySet<string>, skip: ReadonlySet<string>): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (name.startsWith('.') || left.has(name) || skip.has(path)) return []
        if (statSync(path).isDirectory()) return codeUnder(path, left, skip)
        return CODE.test(name) && !NOT_CODE.test(name) ? [path] : []
    })
}

/** The file a relative import names, trying the extensions and the folder's index a bundler would. */
function sourceOf(from: string, spec: string): string | undefined {
    const base = resolve(dirname(from), spec)
    const tried = [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'].map((ext) => base + ext)]
    return tried.find((path) => CODE.test(path) && existsSync(path) && statSync(path).isFile())
}

/** The folder of the installed package `name` as seen from `from`, looking up through each `node_modules`. */
function packageDir(from: string, name: string): string | undefined {
    for (let dir = dirname(from); ; dir = dirname(dir)) {
        const found = join(dir, 'node_modules', name)
        if (existsSync(join(found, 'package.json'))) return realpathSync(found)
        if (dirname(dir) === dir) return undefined
    }
}

/** Whether the package at `dir` depends on the library, so it draws parts of it as the app does. */
function drawsTheLibrary(dir: string): boolean {
    try {
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>
        return ['dependencies', 'peerDependencies', 'devDependencies'].some((field) => Object.keys(manifest[field] ?? {}).some(isLibrary))
    } catch {
        return false
    }
}

/**
 * The library modules the code under `dirs` imports, as `<package>/<module>`, sorted: read from every
 * file there, every file their relative imports reach, and every package they import that depends on
 * the library itself, such as an app's own shared package. A file that cannot be read is passed over.
 */
export function importedModules(dirs: readonly string[], skip: ReadonlySet<string> = new Set()): string[] {
    const queue = dirs.flatMap((dir) => codeUnder(dir, OUTPUT, skip))
    const seen = new Set(queue)
    const packages = new Set<string>()
    const found = new Set<string>()
    const add = (file: string) => {
        if (seen.has(file)) return
        seen.add(file)
        queue.push(file)
    }
    while (queue.length > 0) {
        const file = queue.pop() as string
        let text: string
        try {
            text = readFileSync(file, 'utf8')
        } catch {
            continue
        }
        for (const [, pkg, module] of text.matchAll(IMPORT)) if (!/\.(?:css|json|js)$/.test(module)) found.add(`${pkg}/${module}`)
        for (const [, spec] of text.matchAll(RELATIVE)) {
            const next = sourceOf(file, spec)
            if (next !== undefined) add(next)
        }
        for (const [, name] of text.matchAll(BARE)) {
            if (isLibrary(name) || packages.has(name)) continue
            packages.add(name)
            const dir = packageDir(file, name)
            if (dir !== undefined && drawsTheLibrary(dir)) for (const next of codeUnder(dir, INSTALLED, skip)) add(next)
        }
    }
    return [...found].sort()
}

/**
 * A stylesheet with the core's `styles.css` import replaced by `styles-base.css` and the `@import`s
 * in `lists`, and every add-on's `styles.css` import taken out; undefined, and left as it is, when it
 * does not import the core's `styles.css`.
 */
export function leanStylesheet(css: string, lists: readonly string[]): string | undefined {
    if (![...css.matchAll(STYLES_IMPORT)].some(([, pkg]) => pkg === CORE)) return undefined
    return css.replace(STYLES_IMPORT, (_line: string, pkg: string) =>
        pkg === CORE
            ? [`@import '${CORE}/styles-base.css';`, ...lists.map((list) => `@import '${list}';`)].map((at) => `${at}\n`).join('')
            : '',
    )
}

/**
 * The plugin: put it before `tailwindcss()` in `plugins`. In the dev server a change to the app's
 * code that adds or drops an import of the library writes the stylesheet again.
 */
export function sokkelStyles(options: SokkelStylesOptions = {}): Plugin {
    let config: ResolvedConfig | undefined
    let modules: string[] | undefined
    // The stylesheets this plugin rewrote, so the dev server sends them again when the modules change.
    const rewritten = new Set<string>()
    const dirs = () => (options.dirs ?? ['.']).map((dir) => (isAbsolute(dir) ? dir : resolve(config?.root ?? '.', dir)))
    const scan = () => importedModules(dirs(), new Set(config === undefined ? [] : [resolve(config.root, config.build.outDir)]))
    const clean = (id: string) => id.replace(/\?.*$/, '')
    return {
        name: 'sokkel-ui:styles',
        enforce: 'pre',
        configResolved(resolved) {
            config = resolved
        },
        buildStart() {
            modules = scan()
        },
        transform: {
            order: 'pre',
            async handler(code, id) {
                const file = clean(id)
                if (!file.endsWith('.css') || /[?&](?:raw|url|inline)\b/.test(id)) return
                modules ??= scan()
                const lists: string[] = []
                const addons = new Set<string>()
                for (const module of modules) {
                    const [, pkg, path] = /^(@winterop-com\/[^/]+)\/(.+)$/.exec(module) ?? []
                    if (pkg === undefined) continue
                    if (pkg !== CORE) addons.add(pkg)
                    const list = `${pkg}/sources/${path}.css`
                    const resolved = await this.resolve(list, id)
                    if (resolved !== null && existsSync(clean(resolved.id))) lists.push(list)
                }
                // A library's styles.css imported from the app's code is the module itself: the core's
                // is rewritten whole, and an add-on's left empty.
                const styles = async (pkg: string) => {
                    const resolved = await this.resolve(`${pkg}/styles.css`, id)
                    return resolved !== null && clean(resolved.id) === file
                }
                let lean: string | undefined
                if (await styles(CORE)) lean = [`@import './base.css';`, ...lists.map((list) => `@import '${list}';`)].join('\n') + '\n'
                else if ((await Promise.all([...addons].map(styles))).some(Boolean)) lean = '\n'
                else if (!file.includes('/node_modules/')) lean = leanStylesheet(code, lists)
                if (lean === undefined) return
                rewritten.add(file)
                return { code: lean, map: null }
            },
        },
        handleHotUpdate({ file, server }) {
            if (!CODE.test(file) || modules === undefined) return
            const next = scan()
            if (next.join('\n') === modules.join('\n')) return
            modules = next
            const stale = [...rewritten].flatMap((path) => [...(server.moduleGraph.getModulesByFile(path) ?? [])])
            for (const module of stale) server.moduleGraph.invalidateModule(module)
            if (stale.length > 0) server.ws.send({ type: 'full-reload' })
        },
    }
}
