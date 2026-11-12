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
/** The research stories draw options to pick from, rejected looks included, so only the rules for every file hold there. */
const STORIES = ALL.filter((path) => path.includes('/src/stories/') && !path.includes('/src/stories/research/'))

interface Rule {
    name: string
    pattern: RegExp
    /** Where the rule holds. */
    in: string[]
    /** A line the rule does not judge, such as a picture drawn as SVG data. */
    skipLine?: (line: string) => boolean
    /** Files the rule does not judge, each with the reason. */
    except?: Record<string, string>
}

const picture = (line: string) => /data:|<svg|<rect|<circle|<path|<g |<text |<line|<polyline|stop-color|fill=|stroke=/.test(line)

const RULES: Rule[] = [
    { name: 'a text size set by hand instead of a text token', pattern: /text-\[[0-9.]+(px|rem|em)\]/, in: ALL },
    { name: 'a font size set by hand', pattern: /fontSize:\s*[0-9]/, in: ALL },
    { name: 'raw black or white instead of a color token', pattern: /\b(text|bg|border|fill|stroke|ring)-(white|black)\b/, in: ALL },
    {
        name: 'a hex color outside a picture',
        pattern: /#[0-9a-fA-F]{6}\b/,
        in: ALL,
        skipLine: picture,
        except: {
            'packages/charts/src/look.ts': 'the gray a chart falls back to when a canvas cannot resolve a token',
            'src/stories/fixtures/photos.ts': 'pictures drawn as SVG data',
            'src/stories/fixtures/portraits.ts': 'portraits drawn as SVG data',
        },
    },
    { name: 'a selector reaching into a component from a story', pattern: /\[&[_>]/, in: STORIES },
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
        in: Object.values(SOURCES).flat(),
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
        // size (flex-1, shrink-0, a width) is not a layout and stays allowed.
        pattern:
            /className=\{?(?:cn\((?:[^"'`(),]+,\s*)*)?["'`][^"'`]*(?<![\w-])(?:[\w-]+:)*(?:flex|inline-flex|grid|inline-grid|flex-col(?:-reverse)?|flex-row(?:-reverse)?|flex-wrap|grid-cols-[^\s"'`]+|grid-rows-[^\s"'`]+|gap-[^\s"'`]+|space-[xy]-[^\s"'`]+)(?=[\s"'`])/,
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
        pattern: /<p\b[^>]*text-(destructive|critical-ink|critical)\b|<FieldError\b/,
        in: STORIES,
    },
]

/** A component file: a `.tsx` in a package, outside the core's hooks and helpers, that exports a component. */
const COMPONENTS = Object.values(SOURCES)
    .flat()
    .filter((path) => path.endsWith('.tsx') && !/\/packages\/core\/src\/(hooks|lib)\//.test(path))
    .filter((path) => /export (function|const) [A-Z]/.test(readFileSync(path, 'utf8')))

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
            return built.replace('*', subpath.slice(prefix.length, subpath.length - suffix.length))
        }
    }
    return undefined
}

/** Every script, test and stylesheet under `dir` that may import a package path, outside installed and built folders. */
function importers(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (['node_modules', 'dist', 'target'].includes(name)) return []
        if (statSync(path).isDirectory()) return importers(path)
        return /\.(tsx?|css)$/.test(name) ? [path] : []
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
                for (const match of readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*\(?\s*'(\.{1,2}\/[^'?]*)/g)) {
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

    it('export every package path the packages, stories, examples, tools and docs import', () => {
        const unexported: string[] = []
        for (const path of IMPORTERS) {
            const text = readFileSync(path, 'utf8')
            for (const match of text.matchAll(/(?:from|import|mock)\s*\(?\s*['"](@winterop-com\/sokkel-ui[^'"]*)['"]/g)) {
                if (exported(match[1]) === undefined) unexported.push(`${relative(ROOT, path)}: ${match[1]}`)
            }
        }
        // A path a doc names in code, quotes or backticks; a placeholder such as `<name>` or `*`, or a folder, names no one module.
        for (const path of DOCS) {
            for (const match of readFileSync(path, 'utf8').matchAll(/[`'"](@winterop-com\/sokkel-ui(?:-[a-z]+)?\/[^`'"\s]+)[`'"]/g)) {
                if (/[<*{$]|\/$/.test(match[1])) continue
                if (exported(match[1]) === undefined) unexported.push(`${relative(ROOT, path)}: ${match[1]}`)
            }
        }
        expect(unexported, unexported.join('\n')).toEqual([])
    })
})

describe('the components', () => {
    it('export the type of their props as `<Component>Props`, beside them', () => {
        const missing: string[] = []
        for (const path of Object.values(SOURCES).flat()) {
            if (!path.endsWith('.tsx')) continue
            const source = readFileSync(path, 'utf8')
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
    it('show every component, itself or through the component it is a part of', () => {
        const stories = files(join(ROOT, 'src/stories'))
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n')
        const unseen = COMPONENTS.filter((path) => {
            const module = specifier(path)
            if (stories.includes(`'${module}'`)) return false
            const name = module.split('/').pop() ?? module
            return !COMPONENTS.some((other) => other !== path && readFileSync(other, 'utf8').includes(`/${name}'`))
        }).map((path) => relative(ROOT, path))
        expect(unseen, unseen.join('\n')).toEqual([])
    })
})

describe('the chart stories', () => {
    it('name every chart kind, so a search of the catalog for it finds it', () => {
        const kinds = [...readFileSync(join(ROOT, 'packages/charts/src/kinds/index.ts'), 'utf8').matchAll(/^\s+(\w+): \{ build/gm)].map(
            (match) => match[1],
        )
        expect(kinds.length).toBeGreaterThan(10)
        // What the sidebar search reads: each section's title and each story's name, written as one word.
        const names = files(join(ROOT, 'src/stories/charts'))
            .map((path) => readFileSync(path, 'utf8'))
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
                readFileSync(path, 'utf8')
                    .split('\n')
                    .forEach((line, index) => {
                        if (rule.skipLine?.(line) === true) return
                        if (rule.pattern.test(line)) found.push(`${file}:${String(index + 1)}: ${line.trim().slice(0, 140)}`)
                    })
            }
            expect(found, found.join('\n')).toEqual([])
        })
    }
})
