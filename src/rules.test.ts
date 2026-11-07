import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

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

const ALL = files(join(ROOT, 'src'))
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
            'src/components/chart/look.ts': 'the gray a chart falls back to when a canvas cannot resolve a token',
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
        name: 'a core component reaching into the charts',
        // The charts and dashboard panels stand on the core and never the other way round, so they can
        // move into a package of their own without unpicking the core.
        pattern: /from '[./]*(?:chart|dashboard)\//,
        in: ALL.filter(
            (path) =>
                path.includes('/src/components/') &&
                !path.includes('/src/components/chart/') &&
                !path.includes('/src/components/dashboard/'),
        ),
    },
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

/** A component file: a `.tsx` under src/components that exports a component. */
const COMPONENTS = ALL.filter((path) => path.includes('/src/components/') && path.endsWith('.tsx')).filter((path) =>
    /export (function|const) [A-Z]/.test(readFileSync(path, 'utf8')),
)

describe('the stories', () => {
    it('show every component, itself or through the component it is a part of', () => {
        const stories = files(join(ROOT, 'src/stories'))
            .map((path) => readFileSync(path, 'utf8'))
            .join('\n')
        const unseen = COMPONENTS.filter((path) => {
            const module = relative(join(ROOT, 'src'), path).replace(/\.tsx$/, '')
            if (stories.includes(`/${module}'`)) return false
            const name = module.split('/').pop() ?? module
            return !COMPONENTS.some((other) => other !== path && readFileSync(other, 'utf8').includes(`/${name}'`))
        }).map((path) => relative(ROOT, path))
        expect(unseen, unseen.join('\n')).toEqual([])
    })
})

describe('the chart stories', () => {
    it('name every chart kind, so a search of the catalog for it finds it', () => {
        const kinds = [...readFileSync(join(ROOT, 'src/components/chart/kinds/index.ts'), 'utf8').matchAll(/^\s+(\w+): \{ build/gm)].map(
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
