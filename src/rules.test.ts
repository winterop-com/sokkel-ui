import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ADDONS, exportedComponents, exportProblems, importPath, manifestOf, PACKAGES, type PackageDir } from '../scripts/components-index'

/**
 * The library's rules, checked on every source file: sizes and colors come from tokens, and the
 * stories build from components, so a fix in a component reaches every example and an example
 * never grows its own version of a part. A rule an example cannot keep calls for a component or
 * an option on one, not an exception here.
 */

const ROOT = join(__dirname, '..')

/** A file's text, read once and shared by every test that reads it. */
const TEXTS = new Map<string, string>()
function text(path: string): string {
    let found = TEXTS.get(path)
    if (found === undefined) {
        found = readFileSync(path, 'utf8')
        TEXTS.set(path, found)
    }
    return found
}

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return files(path)
        return /\.(tsx|ts)$/.test(name) && !name.endsWith('.test.ts') ? [path] : []
    })
}

/**
 * The packages, as `scripts/components-index.ts` lists them: the core, the engine add-ons (and media),
 * and the domain add-ons, each of which stands on the core alone. A new domain package is one more
 * name in its `DOMAIN_ADDONS`.
 */
const CORE = 'core'
const NAMES: Record<string, string> = Object.fromEntries(
    PACKAGES.map((name) => [name, name === CORE ? '@winterop-com/sokkel-ui' : `@winterop-com/sokkel-ui-${name}`]),
)
const SOURCES: Record<string, string[]> = Object.fromEntries(PACKAGES.map((name) => [name, files(join(ROOT, 'packages', name, 'src'))]))

const ALL = [...files(join(ROOT, 'src')), ...Object.values(SOURCES).flat()]
const STORIES = ALL.filter((path) => path.includes('/src/stories/'))
/** What is drawn: every file but the DOM tests, which feed a literal color, size or markup in as data. */
const DRAWN = ALL.filter((path) => !path.endsWith('.test.tsx'))

interface Rule {
    name: string
    pattern: RegExp
    /** Where the rule holds. */
    in: string[]
    /** A line the rule does not judge, such as a picture drawn as SVG data, by the line and its file's path from the root. */
    skipLine?: (line: string, file: string) => boolean
    /** Files the rule does not judge, each with the reason. */
    except?: Record<string, string>
}

/** A line of a picture drawn as SVG in the stories' data; a package draws in tokens, its pictures included. */
const picture = (line: string, file: string) =>
    file.startsWith('src/') && /data:|<svg|<rect|<circle|<path|<g |<text |<line|<polyline|stop-color|fill=|stroke=/.test(line)

/**
 * The `--color-*` names every stylesheet carries: those in tokens.css's static theme blocks. Any
 * other exists only once a class uses it, so a CSS color given as a value takes the raw token.
 */
const KEPT_COLORS = [...text(join(ROOT, 'packages/core/src/styles/tokens.css')).matchAll(/@theme[^{]*\bstatic\s*\{([^}]*)\}/g)].flatMap(
    (block) => [...block[1].matchAll(/--color-([\w-]+):/g)].map((name) => name[1]),
)

const RULES: Rule[] = [
    {
        name: 'a `--color-*` name given as a color, which exists only once a class uses it, instead of the raw token',
        pattern: new RegExp(`var\\(--color-(?!(?:${KEPT_COLORS.join('|')})\\))`),
        in: ALL,
    },
    { name: 'a text size set by hand instead of a text token', pattern: /text-\[[0-9.]+(px|rem|em)\]/, in: ALL },
    { name: 'a font size set by hand', pattern: /fontSize:\s*['"`]?[0-9]/, in: ALL },
    {
        name: 'a length in pixels set by hand instead of the spacing scale or a token',
        // An arbitrary value that is a bare length (`p-[3px]`, `top-[-5px]`); a length worked out from a
        // token or the spacing scale (`calc(var(--radius)-2px)`) is derived, not set by hand.
        pattern: /-\[-?[0-9.]+px\]/,
        in: DRAWN,
    },
    { name: 'raw black or white instead of a color token', pattern: /\b(text|bg|border|fill|stroke|ring)-(white|black)\b/, in: ALL },
    {
        name: 'an invalid ring drawn at rest instead of on focus',
        // A field with an issue is marked at rest by its edge alone; the ring comes with focus, as `ISSUE_EDGE` draws it.
        pattern: /(?:^|[\s"'`])(?=[^\s"'`]*invalid)(?![^\s"'`]*focus)[^\s"'`]*:ring-(?:[1-9]|invalid(?![\w-]))/,
        in: ALL,
    },
    {
        name: 'a focus ring set by hand instead of focus-ring-width and focus-ring-offset',
        // Keyboard focus draws `outline-focus outline-offset-focus` (or `ring-focus`), so a theme sets its width and offset once.
        pattern: /(?:^|[\s"'`])[^\s"'`]*focus[^\s"'`]*:-?(?:outline|ring|outline-offset)-2(?![\w./-])/,
        in: ALL,
    },
    {
        name: 'a disabled look at an opacity set by hand instead of disabled-opacity',
        pattern: /(?:^|[\s"'`])[^\s"'`]*disabled[^\s"'`]*:opacity-50(?![\w./-])/,
        in: ALL,
    },
    {
        name: 'a stacking layer set by hand instead of a layer token',
        // The drawer, dialogs, popups and toasts stand on `z-drawer`, `z-dialog`, `z-popover` and `z-toast`, in that order.
        pattern: /(?<![\w-])z-(?:40|50)(?![\w-])/,
        in: ALL,
    },
    {
        name: 'a motion duration set by hand instead of motion-fast or motion-base',
        pattern: /(?<![\w-])duration-(?:100|200)(?![\w-])/,
        in: ALL,
    },
    {
        name: 'a Tailwind shadow instead of an elevation token',
        // shadow-surface, shadow-node, shadow-pop and shadow-dialog read the elevation tokens, which a theme sets.
        pattern: /(?<![\w-])shadow-(?:2xs|xs|sm|md|lg|xl|2xl)(?![\w-])/,
        in: ALL,
    },
    {
        name: 'an invalid look in the destructive color instead of the issue edge',
        // A refused value wears the critical tints of `lib/issue-edge`, so a bare primitive and a field agree.
        pattern: /invalid[^\s"'`]*:(?:border|ring)-destructive/,
        in: ALL,
    },
    {
        name: 'a hex color outside a picture',
        // Three, six and eight digits; four is left out, as a run's number (`#4812`) reads the same.
        pattern: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/,
        in: DRAWN,
        skipLine: picture,
        except: {
            'packages/charts/src/look.ts': 'the gray a chart falls back to when a canvas cannot resolve a token',
            'src/stories/fixtures/photos.ts': 'pictures drawn as SVG data',
            'src/stories/fixtures/portraits.ts': 'portraits drawn as SVG data',
        },
    },
    {
        name: 'a color function with fixed values instead of a color token',
        // `rgb(0 0 0 / 0.1)` or `oklch(0.7 0.15 30)`; a color worked out from a token (`oklch(from var(--primary) ...)`)
        // or from numbers the code computed (`rgb(${red} ...)`) is not set by hand.
        pattern: /(?<![a-z-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[0-9.]/,
        in: DRAWN,
        skipLine: (line, file) => picture(line, file) || /^\s*(?:\*|\/\/)/.test(line),
    },
    {
        name: 'a selector reaching into a component from a story',
        // An arbitrary child or descendant variant, a state read off a parent or a sibling, or a child or descendant star.
        pattern: /\[&[_>]|(?<![\w-])(?:[\w-]+:)*(?:group|peer)-(?:data|aria|has)-\[|(?<![\w-])(?:has|in|not)-\[|(?<=[\s"'`])\*{1,2}:[a-z]/,
        in: STORIES,
        except: {
            'src/stories/primitives/Sidebar.stories.tsx':
                "the Sidebar primitive's own stories show its collapsed state's variant, its API for a part",
        },
    },
    { name: 'an arbitrary value in a story', pattern: /\b(rounded|text|leading|tracking|font)-\[/, in: STORIES },
    {
        name: 'a raw table in a story instead of DataTable',
        pattern: /<table\b/,
        in: STORIES,
        except: { 'src/stories/primitives/Table.stories.tsx': "the Table primitive's own stories" },
    },
    {
        name: 'a table drawn by hand in a component instead of DataTable',
        pattern: /<(table|Table)\b/,
        in: Object.values(SOURCES)
            .flat()
            .filter((path) => DRAWN.includes(path)),
        except: {
            'packages/core/src/components/ui/table.tsx': 'the Table primitive itself',
            'packages/core/src/components/LogView.tsx': "a log's lines on the terminal ground, read and followed rather than listed",
        },
    },
    {
        name: 'a pill shape in a story instead of a component',
        pattern: /rounded-(full|4xl|3xl)/,
        in: STORIES,
        except: { 'src/stories/primitives/Skeleton.stories.tsx': "the Skeleton primitive's own stories show its round shapes" },
    },
    {
        name: 'raw layout in a story instead of the layout components',
        // A container drawn by hand: flex or grid, its direction, wrapping, tracks or gaps. A cell's own
        // size (flex-1, shrink-0, a width) is not a layout and stays allowed. Any string in the braces is
        // read, so a class in cn(), after a condition or in either side of a ternary is caught.
        pattern:
            /className=(?:\{(?:[^"'`{}]|["'`][^"'`]*["'`])*?)?["'`][^"'`]*(?<![\w-])(?:[\w-]+:)*(?:flex|inline-flex|grid|inline-grid|flex-col(?:-reverse)?|flex-row(?:-reverse)?|flex-wrap|grid-cols-[^\s"'`]+|grid-rows-[^\s"'`]+|gap-[^\s"'`]+|space-[xy]-[^\s"'`]+)(?=[\s"'`])/,
        in: STORIES,
    },
    {
        name: 'a core module importing an add-on package',
        // The add-ons stand on the core and never the other way round, so an app that installs only the
        // core gets all of it.
        pattern: /(?:from|import)\s*\(?\s*'@winterop-com\/sokkel-ui-/,
        in: SOURCES[CORE],
    },
    ...ADDONS.map((addon) => ({
        name: `${addon} importing another add-on package`,
        // An add-on carries one engine or one domain and stands on the core alone, so an app installs only
        // what it uses. The dashboard's chart panels sit in the charts package beside the charts they use.
        pattern: new RegExp(`(?:from|import)\\s*\\(?\\s*'@winterop-com/sokkel-ui-(?!${addon}/)`),
        in: SOURCES[addon],
    })),
    {
        name: 'a chart option built in a story instead of a chart kind',
        pattern: /<EChart\b|type: '(?:bar|line|pie|gauge|scatter|heatmap|radar|treemap|sunburst|sankey|boxplot|funnel)'/,
        in: STORIES,
    },
    {
        name: 'a message under a field instead of the issue mark',
        pattern: /<p\b[^>]*text-(destructive|critical-ink|critical)\b/,
        in: STORIES,
    },
]

/** A component file: a `.tsx` in a package, outside the core's hooks and helpers, that exports a component. */
const COMPONENTS = Object.values(SOURCES)
    .flat()
    .filter((path) => path.endsWith('.tsx') && !/\/packages\/core\/src\/(hooks|lib)\//.test(path))
    .filter((path) => /export (function|const) [A-Z]/.test(text(path)))

/** A package's `exports` map, by the package's folder name. */
const EXPORTS = Object.fromEntries(PACKAGES.map((name) => [name, manifestOf(name as PackageDir).exports]))

/** Files a package's build writes from one of its modules rather than building the module into them, by the module. */
const WRITTEN: Record<string, string> = {
    '@winterop-com/sokkel-ui/appearance.js': 'lib/appearance',
}

/** The name an app imports a package's module by, as the package's `exports` map gives it; a private module keeps its path. */
function specifier(path: string): string {
    const [, name, rest] = /\/packages\/([^/]+)\/src\/(.+)\.tsx?$/.exec(path) ?? []
    return importPath(NAMES[name], EXPORTS[name], rest) ?? `${NAMES[name]}/${rest}`
}

/**
 * Where an import of a package's path lands under its `exports` map: the target of an exact entry
 * or of a pattern whose `*` the path fills, or undefined when the map does not export the path. A
 * bundler's query after the path (`?url`) names the same file.
 */
function exported(path: string): string | undefined {
    const name = Object.entries(NAMES).find(([, full]) => path.startsWith(`${full}/`))?.[0]
    if (name === undefined) return undefined
    const subpath = `.${path.slice(NAMES[name].length).replace(/\?.*$/, '')}`
    for (const [key, target] of Object.entries(EXPORTS[name])) {
        const built = typeof target === 'string' ? target : target.import
        if (built === undefined) continue
        if (key === subpath) return built
        const star = key.indexOf('*')
        if (star < 0) continue
        const [prefix, suffix] = [key.slice(0, star), key.slice(star + 1)]
        if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length > prefix.length + suffix.length) {
            const fill = subpath.slice(prefix.length, subpath.length - suffix.length)
            // A module's list of sources is written for an exported module only.
            if (prefix === './sources/' && suffix === '.css' && EXPORTS[name][`./${fill}`] === undefined) continue
            return built.replaceAll('*', fill)
        }
    }
    return undefined
}

/**
 * Every script, test and stylesheet under `dir` that may import a package path, outside installed,
 * built and hidden folders (a shared Cargo target alone holds tens of thousands of entries).
 */
function importers(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory())
            return ['node_modules', 'dist', 'target'].includes(entry.name) || entry.name.startsWith('.') ? [] : importers(path)
        return /\.(tsx?|css)$/.test(entry.name) ? [path] : []
    })
}

/** The packages with their tests, the stories, Storybook, the examples, the tools and the root's build configs. */
const IMPORTERS = [
    ...['packages', 'src', '.storybook', 'examples', 'scripts', 'e2e'].flatMap((dir) => importers(join(ROOT, dir))),
    ...['vite.config.ts', 'vite.lib.ts', 'vitest.config.ts'].map((file) => join(ROOT, file)),
]

/** The docs an app's people and agents read paths from. */
const DOCS = ['llms.txt', 'README.md', 'examples/README.md', ...readdirSync(join(ROOT, 'docs')).map((name) => `docs/${name}`)]
    .filter((file) => /\.(md|txt)$/.test(file))
    .map((file) => join(ROOT, file))

describe('the packages', () => {
    it('are every folder in packages/', () => {
        const folders = readdirSync(join(ROOT, 'packages')).filter((name) => existsSync(join(ROOT, 'packages', name, 'package.json')))
        expect(folders.sort()).toEqual([...PACKAGES].sort())
    })

    it('import one another by name, never by a path out of their own folder', () => {
        const found: string[] = []
        for (const name of PACKAGES) {
            const own = join(ROOT, 'packages', name)
            for (const path of SOURCES[name]) {
                for (const match of text(path).matchAll(/(?:from|import)\s*\(?\s*'(\.{1,2}\/[^'?]*)/g)) {
                    if (relative(own, resolve(dirname(path), match[1])).startsWith('..')) found.push(`${relative(ROOT, path)}: ${match[1]}`)
                }
            }
        }
        expect(found, found.join('\n')).toEqual([])
    })
})

describe('the exports maps', () => {
    it('export every module that is not private, and no private one', () => {
        const problems = exportProblems()
        expect(problems, problems.join('\n')).toEqual([])
    })

    it('give every built module its declarations beside it, and a bare file only to a stylesheet, data or a written script', () => {
        const wrong: string[] = []
        for (const name of PACKAGES) {
            for (const [key, target] of Object.entries(EXPORTS[name])) {
                if (typeof target === 'string') {
                    if (!/\.(css|json)$/.test(target) && WRITTEN[`${NAMES[name]}/${key.slice(2)}`] === undefined)
                        wrong.push(`${NAMES[name]} ${key}: ${target} has no types`)
                    continue
                }
                const expected = target.import?.replace(/\.js$/, '.d.ts')
                if (target.import === undefined || !target.import.endsWith('.js') || target.types !== expected) {
                    wrong.push(`${NAMES[name]} ${key}: types ${String(target.types)}, import ${String(target.import)}`)
                }
            }
        }
        expect(wrong, wrong.join('\n')).toEqual([])
    })

    it('point every entry at a module or a file that is there', () => {
        const missing: string[] = []
        for (const name of PACKAGES) {
            const own = join(ROOT, 'packages', name)
            for (const [key, target] of Object.entries(EXPORTS[name])) {
                const built = typeof target === 'string' ? target : target.import
                if (built === undefined || built.includes('*')) continue
                // A built module is there when its source is, as is a file the build writes from a module; the build writes the rest of `dist`.
                const source = WRITTEN[`${NAMES[name]}/${key.slice(2)}`] ?? /^\.\/dist\/(.+)\.js$/.exec(built)?.[1]
                const there =
                    source === undefined
                        ? existsSync(join(own, built))
                        : ['.ts', '.tsx'].some((ext) => existsSync(join(own, 'src', `${source}${ext}`)))
                if (!there) missing.push(`${NAMES[name]} ${key}: ${built}`)
            }
        }
        expect(missing, missing.join('\n')).toEqual([])
    })

    // Reads some 1,500 files, which takes a few hundred milliseconds alone and longer than the default 5 s on a loaded machine.
    it('export every package path the packages, stories, examples, tools and docs import', { timeout: 30_000 }, () => {
        const unexported: string[] = []
        for (const path of IMPORTERS) {
            for (const match of text(path).matchAll(/(?:from|import|mock)\s*\(?\s*['"](@winterop-com\/sokkel-ui[^'"]*)['"]/g)) {
                if (exported(match[1]) === undefined) unexported.push(`${relative(ROOT, path)}: ${match[1]}`)
            }
        }
        // A path a doc names in code, quotes or backticks; a placeholder such as `<name>` or `*`, or a folder, names no one module.
        for (const path of DOCS) {
            for (const match of text(path).matchAll(/[`'"](@winterop-com\/sokkel-ui(?:-[a-z]+)?\/[^`'"\s]+)[`'"]/g)) {
                if (/[<*{$]|\/$/.test(match[1])) continue
                if (exported(match[1]) === undefined) unexported.push(`${relative(ROOT, path)}: ${match[1]}`)
            }
        }
        expect(unexported, unexported.join('\n')).toEqual([])
    })
})

/** The packages a module imports at run time, statically or by a dynamic `import()`; type-only imports leave nothing in a build. */
function runtimeImports(source: string): string[] {
    const found: string[] = []
    for (const match of source.matchAll(/^(?:import|export)\s+([^'";]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
        const clause = match[1].trim()
        if (/^type\b/.test(clause)) continue
        const named = /\{([^}]*)\}/.exec(clause)
        if (
            named !== null &&
            clause
                .replace(/\{[^}]*\}/, '')
                .replaceAll(',', '')
                .trim() === ''
        ) {
            const names = named[1]
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part !== '')
            if (names.length > 0 && names.every((name) => name.startsWith('type '))) continue
        }
        found.push(match[2])
    }
    for (const match of source.matchAll(/^import\s+['"]([^'"]+)['"]/gm)) found.push(match[1])
    for (const match of source.matchAll(/(?<!typeof\s*)\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) found.push(match[1])
    return found.map((spec) => spec.replace(/\?.*$/, ''))
}

describe('the optional peers', () => {
    it("are named in the README's table for every core module that reaches one", () => {
        const manifest = JSON.parse(text(join(ROOT, 'packages/core/package.json'))) as { peerDependenciesMeta?: Record<string, unknown> }
        const optional = Object.keys(manifest.peerDependenciesMeta ?? {})
        const source = (from: string, spec: string) =>
            ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((ext) => resolve(dirname(from), spec) + ext).find((path) => existsSync(path))
        const reached = new Map<string, ReadonlySet<string>>()
        // Every optional peer a module's imports reach, through the core's own modules; a bundler resolves a lazy import too.
        const peersOf = (path: string, seen: Set<string>): Set<string> => {
            const peers = new Set<string>()
            if (seen.has(path)) return peers
            seen.add(path)
            for (const spec of runtimeImports(text(path))) {
                if (spec.startsWith('.')) {
                    const next = source(path, spec)
                    if (next !== undefined) for (const peer of peersOf(next, seen)) peers.add(peer)
                    continue
                }
                const peer = optional.find((name) => spec === name || spec.startsWith(`${name}/`))
                if (peer !== undefined) peers.add(peer)
            }
            return peers
        }
        for (const [key, target] of Object.entries(EXPORTS[CORE])) {
            const built = typeof target === 'string' ? target : target.import
            const module = /^\.\/dist\/(.+)\.js$/.exec(built ?? '')?.[1]
            if (module === undefined || key.includes('*')) continue
            const path = source(join(ROOT, 'packages/core/src/x'), `./${module}`)
            if (path !== undefined) reached.set(key.slice(2), peersOf(path, new Set()))
        }
        // The table's rows: the modules in the first cell, the packages to install in the second.
        const rows = text(join(ROOT, 'README.md'))
            .split('\n')
            .filter((line) => line.startsWith('| `'))
            .map((line) => line.split('|').slice(1, 3))
            .map(([uses, installs]) => ({
                uses: [...uses.matchAll(/`([^`]+)`/g)].map((match) => match[1]),
                installs: new Set([...installs.matchAll(/`([^`]+)`/g)].map((match) => match[1])),
            }))
        const names = (module: string, name: string) => name === module || (name.endsWith('/*') && module.startsWith(name.slice(0, -1)))
        const unlisted: string[] = []
        for (const [module, peers] of reached) {
            const listed = rows.filter((row) => row.uses.some((name) => names(module, name)))
            for (const peer of peers) if (!listed.some((row) => row.installs.has(peer))) unlisted.push(`${module}: ${peer}`)
        }
        expect(reached.get('CodeEditor')?.has('@codemirror/view')).toBe(true)
        expect(unlisted, unlisted.join('\n')).toEqual([])
    })
})

describe('the workflows', () => {
    it('install the one Bun version .bun-version names', () => {
        const scripts = [
            ...readdirSync(join(ROOT, '.github/workflows')).map((name) => join(ROOT, '.github/workflows', name)),
            ...readdirSync(join(ROOT, 'scripts')).map((name) => join(ROOT, 'scripts', name)),
        ].filter((path) => /\.(ya?ml|sh)$/.test(path))
        const unpinned = scripts.flatMap((path) =>
            text(path)
                .split('\n')
                .filter((line) => /install -g (["']?)bun\b/.test(line) && !/bun@(\$\(cat \.bun-version\)|\$\{bun\})/.test(line))
                .map((line) => `${relative(ROOT, path)}: ${line.trim()}`),
        )
        expect(text(join(ROOT, '.bun-version')).trim()).toMatch(/^\d+\.\d+\.\d+$/)
        expect(unpinned, unpinned.join('\n')).toEqual([])
    })
})

describe('the Storybook candidates', () => {
    // scripts/import-candidates.ts names each theme it writes for the app it was taken from, and an app is never named here.
    it('are committed empty', () => {
        expect(JSON.parse(text(join(ROOT, '.storybook/candidates.json')))).toEqual([])
        expect(text(join(ROOT, '.storybook/candidates.css'))).not.toMatch(/[{}]/)
    })
})

describe('the examples', () => {
    it('name themselves before their own modules load', () => {
        const wrong = readdirSync(join(ROOT, 'examples'))
            .filter((name) => existsSync(join(ROOT, 'examples', name, 'web/src/main.tsx')))
            .flatMap((name) => {
                const main = text(join(ROOT, 'examples', name, 'web/src/main.tsx'))
                const named = main.indexOf(`configureDemo({ app: '${name}'`)
                const loaded = main.indexOf('await import(')
                const problems = [
                    ...[...main.matchAll(/^import\s+[^'"]*\bfrom\s+['"](\.[^'"]*)['"]/gm)].map(
                        ([, path]) => `imports ${path ?? ''} statically; load it with await import after configureDemo`,
                    ),
                    ...(named === -1 ? [`does not call configureDemo({ app: '${name}' })`] : []),
                    ...(loaded !== -1 && loaded < named ? ['loads its own modules before configureDemo'] : []),
                ]
                return problems.map((problem) => `examples/${name}/web/src/main.tsx ${problem}`)
            })
        expect(wrong, wrong.join('\n')).toEqual([])
    })
})

describe('the components', () => {
    it('export the type of their props as `<Component>Props`, beside them', () => {
        const missing: string[] = []
        for (const path of Object.values(SOURCES).flat()) {
            if (!path.endsWith('.tsx')) continue
            const source = text(path)
            for (const { name } of exportedComponents(source)) {
                const takesNone = new RegExp(`(?:function ${name}\\s*(?:<[^>]*>)?\\(\\s*\\)|const ${name}\\s*=\\s*\\(\\s*\\)\\s*=>)`).test(
                    source,
                )
                const exportsProps =
                    new RegExp(`^export (?:interface|type) ${name}Props\\b`, 'm').test(source) ||
                    new RegExp(`^export (?:type )?\\{[^}]*\\b${name}Props\\b[^}]*\\}`, 'm').test(source)
                if (!takesNone && !exportsProps) missing.push(`${relative(ROOT, path)}: ${name}Props`)
            }
        }
        expect(missing, missing.join('\n')).toEqual([])
    })
})

describe('the stories', () => {
    it('say what each one shows in a doc comment above its export', () => {
        const bare: string[] = []
        for (const path of files(join(ROOT, 'src/stories')).filter((file) => file.endsWith('.stories.tsx'))) {
            const lines = text(path).split('\n')
            lines.forEach((line, index) => {
                const name = /^export const (\w+)\b/.exec(line)?.[1]
                if (name === undefined) return
                let above = index - 1
                while (above >= 0 && lines[above].trim().startsWith('//')) above -= 1
                if (above < 0 || !lines[above].trim().endsWith('*/')) bare.push(`${relative(ROOT, path)}:${String(index + 1)}: ${name}`)
            })
        }
        expect(bare, bare.join('\n')).toEqual([])
    })

    it('show every component, itself or through the component it is a part of', () => {
        // Every package path a story names in quotes, and every module name a component file imports by its last segment.
        const named = new Set(
            files(join(ROOT, 'src/stories')).flatMap((path) =>
                [...text(path).matchAll(/'(@winterop-com\/[^']*)'/g)].map((match) => match[1]),
            ),
        )
        const imports = new Map(
            COMPONENTS.map((path) => [path, new Set([...text(path).matchAll(/\/([^/']*)'/g)].map((match) => match[1]))]),
        )
        const unseen = COMPONENTS.filter((path) => {
            const module = specifier(path)
            if (named.has(module)) return false
            const name = module.split('/').pop() ?? module
            return !COMPONENTS.some((other) => other !== path && imports.get(other)?.has(name) === true)
        }).map((path) => relative(ROOT, path))
        expect(unseen, unseen.join('\n')).toEqual([])
    })
})

describe('the chart stories', () => {
    it('name every chart kind, so a search of the catalog for it finds it', () => {
        const kinds = [...text(join(ROOT, 'packages/charts/src/kinds/index.ts')).matchAll(/^\s+(\w+): \{ build/gm)].map((match) => match[1])
        expect(kinds.length).toBeGreaterThan(10)
        // What the sidebar search reads: each section's title and each story's name, written as one word.
        const names = files(join(ROOT, 'src/stories/charts'))
            .map((path) => text(path))
            .flatMap((text) => [
                ...[...text.matchAll(/title: '([^']+)'/g)].map((match) => match[1]),
                ...[...text.matchAll(/^\s+name: '([^']+)'/gm)].map((match) => match[1]),
                ...[...text.matchAll(/^export const (\w+): StoryObj/gm)].map((match) => match[1]),
            ])
            .map((name) => name.toLowerCase().replaceAll(/[^a-z]/g, ''))
        const unnamed = kinds.filter((kind) => !names.some((name) => name.includes(kind.toLowerCase())))
        expect(unnamed, `chart kinds no story or section names: ${unnamed.join(', ')}`).toEqual([])
    })
})

describe('the library rules', () => {
    for (const rule of RULES) {
        it(`has no ${rule.name}`, () => {
            const found: string[] = []
            for (const path of rule.in) {
                const file = relative(ROOT, path)
                if (rule.except?.[file] !== undefined) continue
                text(path)
                    .split('\n')
                    .forEach((line, index) => {
                        if (rule.skipLine?.(line, file) === true) return
                        if (rule.pattern.test(line)) found.push(`${file}:${String(index + 1)}: ${line.trim().slice(0, 140)}`)
                    })
            }
            expect(found, found.join('\n')).toEqual([])
        })
    }
})

describe('the Playwright image CI runs in', () => {
    it('is the version of @playwright/test, so its browsers are the ones the tests expect', () => {
        const installed = (
            JSON.parse(readFileSync(join(ROOT, 'node_modules/@playwright/test/package.json'), 'utf8')) as { version: string }
        ).version
        const found: string[] = []
        for (const file of ['ci.yaml', 'screenshots.yaml']) {
            const text = readFileSync(join(ROOT, '.github/workflows', file), 'utf8')
            for (const [, version] of text.matchAll(/mcr\.microsoft\.com\/playwright:v([\d.]+)-/g)) {
                if (version !== installed)
                    found.push(
                        `.github/workflows/${file} runs Playwright's v${version} image, but @playwright/test is ${installed}: move the image's tag and digest with it`,
                    )
            }
        }
        expect(found, found.join('\n')).toEqual([])
    })
})
