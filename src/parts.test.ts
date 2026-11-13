import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { COMMAND_PALETTE_WORDS } from '@winterop-com/sokkel-ui/CommandPalette'
import { DataTable, DATA_TABLE_WORDS, type DataColumn, type DataTableProps } from '@winterop-com/sokkel-ui/DataTable'
import { FIELD_WORDS } from '@winterop-com/sokkel-ui/Field'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { ISSUE_WORDS, IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { PAGE_HEADER_WORDS } from '@winterop-com/sokkel-ui/PageHeader'
import { PAGE_STATE_WORDS } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { RAIL_WORDS } from '@winterop-com/sokkel-ui/Rail'
import { SETTINGS_DIALOG_WORDS } from '@winterop-com/sokkel-ui/SettingsDialog'
import { SHELL_WORDS } from '@winterop-com/sokkel-ui/Shell'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TOP_BAR_WORDS } from '@winterop-com/sokkel-ui/TopBar'

/**
 * sokkel-ui against the sokkel-design contract. `design/` holds the contract's parts and patterns
 * at the commit `design/pin.json` names (`bun run design` keeps it), and each spec is checked
 * against what can be read from the components without a browser: drawn by React on the server, or
 * read from their sources. For each part:
 *
 *   words     every word the spec lists is the component's English default, and every default is in the spec
 *   options   each option's values are the component's variant keys or prop values, no more and no fewer
 *   sizes     each size's lengths are the tokens and steps its classes use (heights by density token)
 *   paints    each state's ground, edge, ink, rule, ring, radius, text and opacity are the classes the
 *             state's selector picks, with the cascade's own precedence, in light and in dark
 *   keys      each binding is handled where the source shows it
 *
 * Where the code and the spec differ, the spec's `drift` entries for sokkel-ui say so on purpose:
 * `DRIFT` names the checks each entry covers, and a covered check that no longer differs fails, so
 * fixed drift leaves the spec. `PENDING` holds differences where the spec is to change, until the
 * pin moves past the change. Anything else that differs fails. What cannot be read without a
 * browser is said beside each part, with the reason, rather than passed in silence.
 */

const ROOT = join(__dirname, '..')
const CORE = join(ROOT, 'packages', 'core', 'src')

function source(path: string): string {
    return readFileSync(join(CORE, path), 'utf8')
}

// The contract

type Length = number | string | { regular: number; compact: number }

interface Ring {
    color: string
    width: number
    offset?: number
    inset?: 'start' | 'all'
    dark?: { color: string }
}

interface Paint {
    ground?: string
    edge?: string
    ink?: string
    rule?: string
    mark?: string
    placeholder?: string
    ring?: Ring
    text?: string
    weight?: number
    radius?: string
    opacity?: number
    underline?: boolean
    note?: string
    dark?: Paint
}

interface Effect {
    piece?: string
    opacity?: number
    offsetY?: number
    ring?: Ring
    focusable?: boolean
    presses?: boolean
    cursor?: string
}

interface Spec {
    id: string
    kind: 'part' | 'pattern'
    options?: Record<string, { values?: string[]; default?: unknown; context?: string }>
    sizes?: Record<string, Record<string, Length | null | undefined>>
    states: Record<string, { status?: 'today' | 'proposed'; effect?: Effect }>
    variants?: Record<string, Record<string, Paint>>
    pieces?: Record<string, Record<string, Paint>>
    keyboard: { keys: string[]; does: string; when?: string }[]
    words: Record<string, string | { one: string; other: string }>
    routes?: Record<string, string>
    drift?: { renderer: string; what: string; spec: string; today: string }[]
}

const DESIGN = join(ROOT, 'design')
const index = JSON.parse(readFileSync(join(DESIGN, 'index.json'), 'utf8')) as {
    parts: { id: string; file: string }[]
    patterns: { id: string; file: string }[]
}
const SPECS = new Map<string, Spec>(
    [...index.parts, ...index.patterns].map((entry) => [entry.id, JSON.parse(readFileSync(join(DESIGN, entry.file), 'utf8')) as Spec]),
)

// The tokens the classes name, read from the core's styles

const STYLES = readdirSync(join(CORE, 'styles'))
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(join(CORE, 'styles', name), 'utf8'))
    .join('\n')
const COLORS = new Set([...STYLES.matchAll(/--color-([a-z0-9-]+):/g)].map((match) => match[1]))
const SPACING = new Set([...STYLES.matchAll(/--spacing-([a-z0-9-]+):/g)].map((match) => match[1]))
/** Each text size and role: its size, line height and weight as tokens.css writes them. */
const TEXT = new Map<string, { size: string; leading?: string; weight?: string; tracking?: string }>()
for (const match of STYLES.matchAll(/--text-([a-z0-9]+(?:-[a-z0-9]+)*)(--line-height|--font-weight|--letter-spacing)?: ([^;]+);/g)) {
    const [, name, part, value] = match
    const entry = TEXT.get(name) ?? { size: '' }
    if (part === undefined) entry.size = value
    else if (part === '--line-height') entry.leading = value
    else if (part === '--font-weight') entry.weight = value
    else entry.tracking = value
    TEXT.set(name, entry)
}
const WEIGHTS: Record<string, number> = { 'font-normal': 400, 'font-medium': 500, 'font-semibold': 600, 'font-bold': 700 }

// Drawing a component on the server, and finding its elements

interface El {
    tag: string
    attrs: Record<string, string>
    text: string
    parent: El | undefined
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" }
const decode = (text: string) => text.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => ENTITIES[entity])

/** Every element of server-drawn markup, in document order, with its attributes, its text and its parent. */
function parse(html: string): El[] {
    const all: El[] = []
    const open: El[] = []
    for (const match of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g)) {
        const [, closing, tag, attributes, selfClosing, text] = match
        if (text !== undefined) {
            for (const element of open) element.text += decode(text)
        } else if (closing === '/') {
            while (open.length > 0 && open.pop()?.tag !== tag);
        } else {
            const attrs = Object.fromEntries(
                [...attributes.matchAll(/\s+([^\s=>/]+)(?:="([^"]*)")?/g)].map(([, name, value]) => [name, decode(value ?? '')]),
            )
            const element: El = { tag, attrs, text: '', parent: open.at(-1) }
            all.push(element)
            if (selfClosing !== '/') open.push(element)
        }
    }
    return all
}

function draw<P extends object>(component: ComponentType<P>, props: P, ...children: ReactNode[]): El[] {
    return parse(renderToStaticMarkup(createElement(component, props, ...children)))
}

const classesOf = (element: El | undefined) => element?.attrs.class ?? ''

function ancestors(element: El): string[] {
    const found: string[] = []
    for (let up = element.parent; up !== undefined; up = up.parent) found.push(classesOf(up))
    return found
}

/** The quoted string that follows the anchors, each found after the one before, in a source: classes no server drawing reaches. */
function literalAfter(text: string, ...anchors: string[]): string {
    let at = 0
    for (const anchor of anchors) {
        const found = text.indexOf(anchor, at)
        if (found < 0) return ''
        at = found + anchor.length
    }
    return /(['"])((?:(?!\1).)*)\1/.exec(text.slice(at))?.[2] ?? ''
}

// Classes, and what the cascade picks from them

interface Utility {
    mods: string[]
    name: string
    important: boolean
}

/** A class split into its variants and its utility, at the colons outside brackets. */
function utility(token: string): Utility {
    const parts: string[] = []
    let depth = 0
    let start = 0
    for (let at = 0; at < token.length; at += 1) {
        const char = token[at]
        if (char === '[' || char === '(') depth += 1
        else if (char === ']' || char === ')') depth -= 1
        else if (char === ':' && depth === 0) {
            parts.push(token.slice(start, at))
            start = at + 1
        }
    }
    const name = token.slice(start)
    return { mods: parts, name: name.replace(/^!|!$/g, ''), important: name.startsWith('!') || name.endsWith('!') }
}

/** Variants that hold wherever the part is drawn: a guard that only turns a state off, or a selector that reaches the piece itself. */
const GUARDS = new Set(['not-aria-disabled', 'not-aria-[haspopup]', '[&>:first-child]', '[&>[data-track]>*]'])

/**
 * Where a piece is drawn in one state: its classes as layers (a later layer wins a tie, as a part
 * laid over a primitive does), the variants the state turns on, and the classes of the elements
 * around it, which pass their ink down.
 */
interface Where {
    layers: string[]
    on: string[]
    around?: string[]
    /** The classes of the piece's mark (its icon), for a paint that colors it. */
    mark?: string
    /** Whether the drawn element takes focus: no `disabled` attribute and not taken out of the tab order. */
    focusable?: boolean
}

interface Skip {
    skip: string
}

const skip = (reason: string): Skip => ({ skip: reason })
const isSkip = (value: unknown): value is Skip => typeof value === 'object' && value !== null && 'skip' in value

type Reader = (name: string) => string | undefined

/**
 * The value the cascade gives a property: of the classes whose every variant is on, the one with
 * the most variants (as many selectors, as much weight), an important one over all, and a later
 * layer, then a later class, on a tie.
 */
function resolve(layers: readonly string[], on: readonly string[], read: Reader): string | undefined {
    const active = new Set(on)
    let best: { score: number; layer: number; at: number; value: string } | undefined
    layers.forEach((classes, layer) => {
        classes
            .split(/\s+/)
            .filter(Boolean)
            .forEach((token, at) => {
                const { mods, name, important } = utility(token)
                const value = read(name)
                if (value === undefined || !mods.every((mod) => active.has(mod) || GUARDS.has(mod))) return
                // The dark variant is the stylesheet's own, written after Tailwind's: it wins a tie with one of those.
                const score = (important ? 1000 : 0) + mods.length + (mods.includes('dark') ? 0.5 : 0)
                if (best === undefined || score >= best.score) best = { score, layer, at, value }
            })
    })
    return best?.value
}

/** A color class's value in the contract's grammar: `primary/80`, `mix(a, b 5%)`, `mix-oklab(a 8%, b)`, `none`. */
function color(value: string): string | undefined {
    if (value === 'transparent') return 'none'
    if (value === 'inherit' || value === 'current') return 'inherit'
    const oklch = /^\[color-mix\(in_oklch,var\(--([a-z0-9-]+)\),var\(--([a-z0-9-]+)\)_(\d+)%\)\]$/.exec(value)
    if (oklch !== null) return `mix(${oklch[1]}, ${oklch[2]} ${oklch[3]}%)`
    const oklab = /^\[color-mix\(in_oklab,var\(--([a-z0-9-]+)\)_(\d+)%,var\(--([a-z0-9-]+)\)\)\]$/.exec(value)
    if (oklab !== null) return `mix-oklab(${oklab[1]} ${oklab[2]}%, ${oklab[3]})`
    const token = /^([a-z][a-z0-9-]*)(\/\d+)?$/.exec(value)
    return token !== null && COLORS.has(token[1]) ? value : undefined
}

const prefixed =
    (...prefixes: string[]): Reader =>
    (name) => {
        const prefix = prefixes.find((one) => name.startsWith(one))
        return prefix === undefined ? undefined : color(name.slice(prefix.length))
    }

/** A length class's value in the contract's grammar: px, `density.<name>` or a length token. */
function length(value: string): string | undefined {
    if (value === 'px') return '1'
    if (/^\d+(\.\d+)?$/.test(value)) return String(Number(value) * 4)
    const density = /^\(--density-([a-z0-9-]+)\)$/.exec(value)
    if (density !== null) return `density.${density[1]}`
    const token = /^\(--([a-z0-9-]+)\)$/.exec(value)
    if (token !== null) return token[1]
    const px = /^\[(\d+(?:\.\d+)?)px\]$/.exec(value)
    if (px !== null) return px[1]
    const rem = /^\[(\d+(?:\.\d+)?)rem\]$/.exec(value)
    if (rem !== null) return String(Number(rem[1]) * 16)
    return SPACING.has(value) ? `spacing-${value}` : undefined
}

const lengthOf =
    (...prefixes: string[]): Reader =>
    (name) => {
        const prefix = prefixes.find((one) => name.startsWith(one))
        return prefix === undefined ? undefined : length(name.slice(prefix.length))
    }

const READ = {
    ground: prefixed('bg-'),
    edge: prefixed('border-'),
    rule: prefixed('border-b-', 'border-t-', 'border-'),
    ink: prefixed('text-'),
    ringColor: (name: string) =>
        prefixed('ring-', 'outline-')(name) ?? /^shadow-\[inset_\d+px_0_0_var\(--([a-z0-9-]+)\)\]$/.exec(name)?.[1],
    ringWidth: (name: string) => {
        if (name === 'ring' || name === 'outline') return '1'
        const inset = /^shadow-\[inset_(\d+)px_0_0_var\(--[a-z0-9-]+\)\]$/.exec(name)
        if (inset !== null) return inset[1]
        return /^(?:ring|outline)-(\d+)$/.exec(name)?.[1]
    },
    ringOffset: (name: string) => /^(?:ring|outline)-offset-(\d+)$/.exec(name)?.[1],
    opacity: (name: string) => {
        const match = /^opacity-(\d+)$/.exec(name)
        return match === null ? undefined : String(Number(match[1]) / 100)
    },
    underline: (name: string) => (name === 'underline' ? 'true' : name === 'no-underline' ? 'false' : undefined),
    radius: (name: string) => {
        if (name.startsWith('rounded-[min(var(--control-radius),')) return 'radius-control'
        const match = /^rounded-(control|surface|xs|sm|md|lg|xl|none|full)$/.exec(name)
        return match === null ? undefined : `radius-${match[1]}`
    },
    radiusMax: (name: string) => /^rounded-\[min\(var\(--control-radius\),(\d+)px\)\]$/.exec(name)?.[1],
    weight: (name: string) => (name in WEIGHTS ? String(WEIGHTS[name]) : /^font-\[number:var\(--([a-z0-9-]+)\)\]$/.exec(name)?.[1]),
    size: (name: string) => {
        const match = /^text-(.+)$/.exec(name)
        if (match === null) return undefined
        if (TEXT.has(match[1])) return match[1]
        return match[1].startsWith('[length:') ? match[1] : undefined
    },
    cursor: (name: string) => /^cursor-([a-z-]+)$/.exec(name)?.[1],
    translateY: (name: string) => (name === 'translate-y-px' ? '1' : lengthOf('translate-y-')(name)),
    height: lengthOf('h-', 'size-'),
    minHeight: lengthOf('min-h-'),
    width: lengthOf('w-', 'size-'),
    minWidth: lengthOf('min-w-'),
    padX: lengthOf('px-'),
    padY: lengthOf('py-'),
    padStart: lengthOf('pl-'),
    padEnd: lengthOf('pr-'),
    gap: lengthOf('gap-'),
    square: lengthOf('size-'),
} satisfies Record<string, Reader>

/** The ink a piece wears: its own, else the nearest ink around it, else what the page gives (`inherit`). */
function inkOf(where: Where, on: string[]): string {
    const own = resolve(where.layers, on, READ.ink)
    if (own !== undefined) return own
    for (const classes of where.around ?? []) {
        const passed = resolve([classes], on.includes('dark') ? ['dark'] : [], READ.ink)
        if (passed !== undefined) return passed
    }
    return 'inherit'
}

/**
 * The text role the classes set: a role's own class, or a size and weight that are a role's (a
 * size with no weight of its own takes the weight around it). Given the role the spec wants, a
 * size that makes it is named by it.
 */
function roleOf(where: Where, on: string[], wanted: string): string {
    const size = resolve(where.layers, on, READ.size)
    if (size === undefined) return 'none'
    const entry = TEXT.get(size)
    if (entry?.weight !== undefined && !size.startsWith('[')) return `text.${size}`
    const weight =
        resolve(where.layers, on, READ.weight) ??
        (where.around ?? []).map((classes) => resolve([classes], [], READ.weight)).find((one) => one !== undefined) ??
        '400'
    const role = wanted.replace(/^text\./, '')
    const target = TEXT.get(role)
    const makes =
        target !== undefined &&
        target.tracking === undefined &&
        target.size === `var(--text-${size})` &&
        target.leading === `var(--text-${size}--line-height)` &&
        (target.weight ?? '400') === weight
    return makes ? wanted : `text-${size} at ${weight}`
}

// Checks

interface Check {
    key: string
    spec: string
    found: string
    same: boolean
}

const check = (key: string, spec: unknown, found: string | undefined, same?: boolean): Check => {
    const said = typeof spec === 'string' ? spec : JSON.stringify(spec)
    const shown = found ?? 'nothing'
    return { key, spec: said, found: shown, same: same ?? said === shown }
}

/** A color the spec names against the class found: `none` and `inherit` are no class at all, and a parts token's fallback is the theme's. */
function sameColor(spec: string, found: string | undefined): boolean {
    if (spec === 'none') return found === undefined || found === 'none'
    if (spec === 'inherit') return found === undefined || found === 'inherit'
    return spec.split('|')[0] === found
}

const COLOR_KEYS = ['ground', 'edge', 'rule', 'ink', 'placeholder'] as const

function colorFound(key: (typeof COLOR_KEYS)[number], where: Where, on: string[]): string | undefined {
    if (key === 'ink') return inkOf(where, on)
    if (key === 'placeholder') return resolve(where.layers, [...on, 'placeholder'], READ.ink)
    return resolve(where.layers, on, READ[key])
}

function ringChecks(key: string, ring: Ring, where: Where): Check[] {
    const light = resolve(where.layers, where.on, READ.ringColor)
    const dark = resolve(where.layers, [...where.on, 'dark'], READ.ringColor)
    const checks = [
        { ...check(`${key}.color`, ring.color, light), same: sameColor(ring.color, light) },
        check(`${key}.width`, String(ring.width), resolve(where.layers, where.on, READ.ringWidth)),
    ]
    if (ring.offset !== undefined)
        checks.push(check(`${key}.offset`, String(ring.offset), resolve(where.layers, where.on, READ.ringOffset)))
    if (ring.dark !== undefined || dark !== light) {
        const wanted = ring.dark?.color ?? ring.color
        checks.push({ ...check(`${key}.color (dark)`, wanted, dark), same: sameColor(wanted, dark) })
    }
    return checks
}

/** What a paint asks of a piece in one state, against the classes that state picks. */
function paintChecks(key: string, paint: Paint, where: Where): Check[] {
    const checks: Check[] = []
    for (const name of COLOR_KEYS) {
        const wanted = paint[name]
        const light = colorFound(name, where, where.on)
        const dark = colorFound(name, where, [...where.on, 'dark'])
        if (wanted !== undefined) checks.push({ ...check(`${key}.${name}`, wanted, light), same: sameColor(wanted, light) })
        const wantedDark = paint.dark?.[name] ?? wanted
        if (wantedDark !== undefined && (paint.dark?.[name] !== undefined || dark !== light)) {
            checks.push({ ...check(`${key}.${name} (dark)`, wantedDark, dark), same: sameColor(wantedDark, dark) })
        }
    }
    if (paint.mark !== undefined) {
        const found = where.mark === undefined ? undefined : resolve([where.mark], where.on, READ.ink)
        checks.push({ ...check(`${key}.mark`, paint.mark, found), same: sameColor(paint.mark, found) })
    }
    if (paint.ring !== undefined) checks.push(...ringChecks(`${key}.ring`, paint.ring, where))
    if (paint.radius !== undefined) checks.push(check(`${key}.radius`, paint.radius, resolve(where.layers, where.on, READ.radius)))
    if (paint.opacity !== undefined)
        checks.push(check(`${key}.opacity`, String(paint.opacity), resolve(where.layers, where.on, READ.opacity)))
    if (paint.underline !== undefined) {
        checks.push(check(`${key}.underline`, String(paint.underline), resolve(where.layers, where.on, READ.underline) ?? 'false'))
    }
    if (paint.weight !== undefined) checks.push(check(`${key}.weight`, String(paint.weight), resolve(where.layers, where.on, READ.weight)))
    if (paint.text !== undefined) checks.push(check(`${key}.text`, paint.text, roleOf(where, where.on, paint.text)))
    return checks
}

function effectChecks(key: string, effect: Effect, where: Where): Check[] {
    const checks: Check[] = []
    if (effect.opacity !== undefined)
        checks.push(check(`${key}.opacity`, String(effect.opacity), resolve(where.layers, where.on, READ.opacity)))
    if (effect.offsetY !== undefined)
        checks.push(check(`${key}.offsetY`, String(effect.offsetY), resolve(where.layers, where.on, READ.translateY)))
    if (effect.cursor !== undefined) checks.push(check(`${key}.cursor`, effect.cursor, resolve(where.layers, where.on, READ.cursor)))
    if (effect.ring !== undefined) checks.push(...ringChecks(`${key}.ring`, effect.ring, where))
    if (effect.focusable !== undefined && where.focusable !== undefined) {
        checks.push(check(`${key}.focusable`, String(effect.focusable), String(where.focusable)))
    }
    return checks
}

/** Whether a drawn element takes focus. */
const focusable = (element: El | undefined) => element !== undefined && !('disabled' in element.attrs) && element.attrs.tabindex !== '-1'

/** The values a sample fills a word's slots with. */
const FILL: Record<string, string | number> = {
    count: 3,
    from: 1,
    to: 50,
    total: 120,
    page: 2,
    pages: 5,
    place: 2,
    column: 'Name',
    row: 'nightly-export',
    section: 'General',
}
const filled = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? FILL[name]))

// What each part's spec is checked against in sokkel-ui

/**
 * Where a spec word is in sokkel-ui: `OBJECT.key` for a word given as it is, or with what turns a
 * word given as a function into the words; a list where several parts say the same word.
 */
type WordSource = string | [string, (said: never, fill: Record<string, string | number>) => string]

interface Adapter {
    /** The objects that hold the part's English defaults, by name. */
    wordObjects: Record<string, object>
    /** The objects every one of whose words is in the spec. */
    complete: string[]
    words: Record<string, WordSource | WordSource[]>
    /** For each option with `values`, the values the component takes. */
    options: Record<string, readonly string[] | Skip>
    /** Where a size's length is drawn. */
    size: (size: string, key: string) => Where | Skip | undefined
    /** Where a variant or piece is drawn in a state. */
    paint: (group: 'variants' | 'pieces', name: string, state: string) => Where | Skip | undefined
    /** Where a state's effect is drawn. */
    effect: (state: string, piece: string | undefined) => Where | Skip | undefined
    /** For each binding (its keys, then `when`), whether the source handles it: true, or what is found instead. */
    keys: Record<string, (() => true | string) | Skip>
    /** Other checks a spec asks of this part, by key. */
    more?: () => Check[]
}

const keyName = (binding: Spec['keyboard'][number]) => `${binding.keys.join(', ')}${binding.when === undefined ? '' : ` (${binding.when})`}`

/** The keys of a `cva` variant group, read from its source. */
function variantKeys(text: string, group: string): string[] {
    const variants = text.indexOf('variants: {')
    const start = new RegExp(`\\n(\\s+)${group}: \\{`).exec(text.slice(variants))
    if (variants < 0 || start === null) return []
    const indent = start[1]
    const lines = text.slice(variants + start.index + start[0].length).split('\n')
    const keys: string[] = []
    for (const line of lines) {
        if (line.startsWith(`${indent}}`)) break
        const key = new RegExp(`^${indent}    '?([\\w-]+)'?:`).exec(line)
        if (key !== null) keys.push(key[1])
    }
    return keys
}

/** The sources whose named types a prop may take its values from. */
const SOURCES_FOR_TYPES = [source('components/shell-context.ts'), source('components/TopBar.tsx'), source('components/Field.tsx')]

/** The string values a prop takes, read from its declaration (or the type it names) in a source. */
function propValues(text: string, props: string, prop: string): string[] {
    const body = text.slice(text.indexOf(`export interface ${props}`))
    const declared = new RegExp(`\\n\\s+${prop}\\?: ([^\\n]+)`).exec(body)?.[1] ?? ''
    const named = /^([A-Z]\w*)$/.exec(declared.trim())?.[1]
    const type =
        named === undefined
            ? declared
            : (new RegExp(`export type ${named} = ([^\\n]+)`).exec(
                  SOURCES_FOR_TYPES.find((one) => one.includes(`export type ${named} =`)) ?? '',
              )?.[1] ?? '')
    return [...type.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

// Button

const BUTTON = source('components/ui/button.tsx')
const button = (props: Parameters<typeof Button>[0] = {}) => draw(Button, props, 'Save')
const firstButton = (elements: El[]) => elements.find((element) => element.tag === 'button')

/** The variants a button's state turns on. */
const BUTTON_ON: Record<string, string[]> = {
    rest: [],
    hover: ['hover'],
    focus: ['focus-visible'],
    open: ['aria-expanded'],
    pressed: ['active'],
    invalid: ['aria-invalid'],
    'invalid+focus': ['aria-invalid', 'focus-visible'],
    disabled: ['aria-disabled'],
}

function buttonWhere(elements: El[], state: string): Where | Skip | undefined {
    const element = firstButton(elements)
    if (element === undefined) return undefined
    const on = BUTTON_ON[state]
    if (on === undefined) return skip(`no way to reach ${state} on a button`)
    return { layers: [classesOf(element)], on, around: ancestors(element), focusable: focusable(element) }
}

const BUTTON_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: { variant: variantKeys(BUTTON, 'variant'), size: variantKeys(BUTTON, 'size') },
    size: (size) => {
        const element = firstButton(button({ size: size as never }))
        return pieceWhere(element)
    },
    paint: (group, name, state) => {
        if (group === 'pieces') return name === 'container' ? buttonWhere(button(), state) : undefined
        if (name === 'icon-button') {
            const pressed = state === 'pressed'
            return buttonWhere(draw(IconButton, { label: 'Edit', pressed: pressed || undefined, children: 'E' }), pressed ? 'rest' : state)
        }
        if (name === 'destructive-hover') return buttonWhere(button({ destructiveHover: true }), state)
        return buttonWhere(button({ variant: name as never }), state)
    },
    effect: (state) => {
        if (state === 'busy') return buttonWhere(button({ busy: true }), 'disabled')
        if (state === 'disabled') return buttonWhere(button({ reason: 'Nothing to save' }), 'disabled')
        return buttonWhere(button(), state)
    },
    keys: {
        Tab: () => {
            const busy = focusable(firstButton(button({ busy: true })))
            const reasoned = focusable(firstButton(button({ reason: 'Nothing to save' })))
            const disabled = focusable(firstButton(button({ disabled: true })))
            return busy && reasoned && !disabled
                ? true
                : `focusable busy ${String(busy)}, with a reason ${String(reasoned)}, disabled ${String(disabled)}`
        },
        'Enter (enabled and not busy)': () => (firstButton(button()) !== undefined ? true : 'not a native button'),
        'Space (enabled and not busy)': () => (firstButton(button()) !== undefined ? true : 'not a native button'),
        Focus: skip('the tooltip opens on focus in a browser; nothing on the server shows it'),
    },
}

// Text field

const FIELD = source('components/Field.tsx')
const TEXT_FIELD = source('components/TextField.tsx')
const field = (props: Partial<Parameters<typeof TextField>[0]> = {}) => draw(TextField, { id: 'name', label: 'Name', ...props })
const REFUSED = { error: 'Use letters and digits' }
const WARNED = { issues: [{ tone: 'warning' as const, text: 'Longer than most' }] }
const byText = (elements: El[], tag: string, text: string) =>
    elements.find((element) => element.tag === tag && element.text === text && !classesOf(element).includes('sr-only'))

/** The state's drawing and the variants it turns on, for the control and the issue mark. */
const FIELD_STATES: Record<string, { props: Partial<Parameters<typeof TextField>[0]>; on: string[] }> = {
    rest: { props: {}, on: [] },
    hover: { props: {}, on: ['hover'] },
    focus: { props: {}, on: ['focus-visible'] },
    disabled: { props: { disabled: true }, on: ['disabled'] },
    invalid: { props: REFUSED, on: ['aria-invalid'] },
    'invalid+focus': { props: REFUSED, on: ['aria-invalid', 'focus-visible'] },
    warning: { props: WARNED, on: [] },
    'warning+focus': { props: WARNED, on: ['focus-visible'] },
    issueOpen: { props: REFUSED, on: ['data-popup-open'] },
}

function controlWhere(state: string, multiline = false): Where | Skip | undefined {
    const reached = FIELD_STATES[state]
    if (reached === undefined) return skip(`no way to reach ${state} on a text field`)
    const elements = field({ ...reached.props, multiline })
    const control = elements.find((element) => element.attrs['data-slot'] === (multiline ? 'textarea' : 'input'))
    if (control === undefined) return undefined
    return {
        layers: [classesOf(control), classesOf(control.parent)],
        on: reached.on,
        around: ancestors(control),
        focusable: focusable(control),
    }
}

function markWhere(state: string): Where | Skip | undefined {
    const reached = FIELD_STATES[state]
    if (reached === undefined) return skip(`no way to reach ${state} on the issue mark`)
    // The mark is drawn only with an issue: a refusal, unless the state is the warning's.
    const mark = field(state === 'warning' ? WARNED : REFUSED).find((element) => element.attrs['aria-haspopup'] === 'dialog')
    return mark === undefined ? undefined : { layers: [classesOf(mark)], on: reached.on, around: ancestors(mark) }
}

function pieceWhere(element: El | undefined, on: string[] = []): Where | undefined {
    return element === undefined ? undefined : { layers: [classesOf(element)], on, around: ancestors(element) }
}

const TEXT_FIELD_ADAPTER: Adapter = {
    wordObjects: { FIELD_WORDS },
    complete: ['FIELD_WORDS'],
    words: {
        required: 'FIELD_WORDS.required',
        issueCritical: 'FIELD_WORDS.issueCritical',
        issueWarning: 'FIELD_WORDS.issueWarning',
        errors: [
            'IssueCount.errors',
            (_: never, fill) => draw(IssueCount, { critical: Number(fill.count), list: [] })[0]?.attrs['aria-label'] ?? '',
        ],
        warnings: [
            'IssueCount.warnings',
            (_: never, fill) => draw(IssueCount, { critical: 0, warning: Number(fill.count), list: [] })[0]?.attrs['aria-label'] ?? '',
        ],
    },
    options: { requiredMark: propValues(TEXT_FIELD, 'TextFieldProps', 'requiredMark') },
    size: (size) => {
        const where = controlWhere('rest', size === 'multiline')
        return isSkip(where) || where === undefined ? where : { ...where, layers: [where.layers[0]] }
    },
    paint: (_, name, state) => {
        if (name === 'control') return controlWhere(state)
        if (name === 'issueMark') return markWhere(state)
        if (state !== 'rest') return skip(`no state of its own on ${name}`)
        if (name === 'label') return pieceWhere(field().find((element) => element.attrs['data-slot'] === 'label'))
        if (name === 'requiredStar') return pieceWhere(byText(field({ required: true }), 'span', '*'))
        if (name === 'requiredWord')
            return pieceWhere(byText(field({ required: true, requiredMark: 'word' }), 'span', FIELD_WORDS.required))
        if (name === 'hint') return pieceWhere(byText(field({ hint: 'ms' }), 'span', 'ms'))
        if (name === 'description')
            return pieceWhere(field({ description: 'What it asks' }).find((element) => element.attrs.id === 'name-description'))
        if (name === 'help') return pieceWhere(field({ help: 'How to answer' }).find((element) => element.attrs.id === 'name-help')?.parent)
        if (name === 'fallback')
            return pieceWhere(field({ fallback: 'Default is 30' }).find((element) => element.attrs.id === 'name-fallback')?.parent)
        if (name === 'issuePopover') {
            // The popover opens in a portal, which a server drawing leaves out: its classes are read from the sources.
            const popup = literalAfter(source('components/ui/popover.tsx'), 'data-slot="popover-content"')
            const own = literalAfter(source('components/IssueMark.tsx'), 'initialFocus={false}')
            return { layers: [popup, own], on: [] }
        }
        return undefined
    },
    effect: (state) => controlWhere(state),
    keys: {
        Tab: () => {
            const elements = field(REFUSED)
            const control = elements.find((element) => element.tag === 'input')
            const mark = elements.find((element) => element.attrs['aria-haspopup'] === 'dialog')
            return focusable(control) && focusable(mark) ? true : 'the control or the mark is out of the tab order'
        },
        'Enter (a one-line input with onEnter)': () =>
            /event\.key === 'Enter' && onEnter !== undefined\) onEnter\(\)/.test(TEXT_FIELD) ? true : 'no Enter handled for onEnter',
        'Escape (a one-line input with onEscape)': () =>
            /event\.key === 'Escape' && onEscape !== undefined\) onEscape\(\)/.test(TEXT_FIELD) ? true : 'no Escape handled for onEscape',
        'Enter, Space (the mark has focus)': () =>
            field(REFUSED).find((element) => element.attrs['aria-haspopup'] === 'dialog')?.tag === 'button'
                ? true
                : 'the mark is not a native button',
        'Escape (the popover is open)': skip("Base UI's popover closes on Escape in a browser; the server draws it closed"),
        'Click label': () =>
            /<Label[^>]*onClick=\{\(\) => focusUnlabelable\(id\)\}/.test(FIELD) ? true : 'no press on the label focuses the control',
    },
}

// Table

interface Job {
    id: string
    name: string
    state: string
}

const JOBS: Job[] = [
    { id: 'nightly-export', name: 'nightly-export', state: 'succeeded' },
    { id: 'sync-inventory', name: 'sync-inventory', state: 'failed' },
    { id: 'rebuild-index', name: 'rebuild-index', state: 'running' },
]
const COLUMNS: DataColumn<Job>[] = [
    { id: 'name', header: 'Name', width: 'minmax(12rem,1fr)', cell: (job) => job.name, sortValue: (job) => job.name },
    { id: 'state', header: 'State', width: '8rem', cell: (job) => job.state },
]
const DATA_TABLE = source('components/DataTable.tsx')
const table = (props: Partial<DataTableProps<Job>> = {}) =>
    draw(DataTable<Job>, { columns: COLUMNS, rows: JOBS, rowKey: (job) => job.id, ...props } as DataTableProps<Job>)
const rowOf = (elements: El[], key = JOBS[0].id) => elements.find((element) => element.attrs['data-row'] === key)
const FIRST = new Set([JOBS[0].id])
/** Rows drawn as cards: a box this wide stacks below the widest a server drawing assumes. */
const STACKED: Partial<DataTableProps<Job>> = { stackBelow: 5000, minWidth: 'auto' }

const HOVER = ['hover', 'group-hover/row', 'group-hover/card']
const ACTIVE_FOCUS = ['group-focus-visible/table', 'data-active']

function tableRow(state: string): Where | Skip | undefined {
    const reached: Record<string, [Partial<DataTableProps<Job>>, string[]]> = {
        rest: [{}, []],
        hover: [{}, HOVER],
        selected: [{ selectable: true, defaultSelection: FIRST }, []],
        opened: [{ onOpen: () => undefined, opened: (job) => job.id === JOBS[0].id }, []],
        'selected+hover': [{ selectable: true, defaultSelection: FIRST }, HOVER],
        'active+focus': [{}, ACTIVE_FOCUS],
        toneCritical: [{ rowTone: () => 'critical' }, []],
        toneWarning: [{ rowTone: () => 'warning' }, []],
        muted: [{ rowTone: () => 'muted' }, []],
    }
    const [props, on] = reached[state] ?? []
    if (props === undefined || on === undefined) return skip(`no way to reach ${state} on a row`)
    const row = rowOf(table(props))
    return row === undefined ? undefined : { layers: [classesOf(row)], on, around: ancestors(row) }
}

function tableCard(state: string): Where | Skip | undefined {
    const reached: Record<string, [Partial<DataTableProps<Job>>, string[]]> = {
        rest: [{}, []],
        hover: [{}, HOVER],
        selected: [{ selectable: true, defaultSelection: FIRST }, []],
        opened: [{ onOpen: () => undefined, opened: (job) => job.id === JOBS[0].id }, []],
        'active+focus': [{}, ACTIVE_FOCUS],
        toneCritical: [{ rowTone: () => 'critical' }, []],
        toneWarning: [{ rowTone: () => 'warning' }, []],
    }
    const [props, on] = reached[state] ?? []
    if (props === undefined || on === undefined) return skip(`no way to reach ${state} on a card`)
    const elements = table({ ...STACKED, ...props })
    const card = elements.find((element) => element.attrs.role === 'row' && classesOf(element).includes('group/card'))
    const face = elements.find((element) => element.parent === card)
    if (card === undefined || face === undefined) return undefined
    return { layers: [classesOf(card), classesOf(face)], on, around: ancestors(card) }
}

const TABLE_ADAPTER: Adapter = {
    wordObjects: { DATA_TABLE_WORDS, ISSUE_WORDS, PAGE_STATE_WORDS },
    complete: ['DATA_TABLE_WORDS'],
    words: {
        columns: 'DATA_TABLE_WORDS.columns',
        actions: 'DATA_TABLE_WORDS.actions',
        tableView: 'DATA_TABLE_WORDS.tableView',
        gridView: 'DATA_TABLE_WORDS.gridView',
        sort: 'DATA_TABLE_WORDS.sort',
        unsorted: 'DATA_TABLE_WORDS.unsorted',
        ascending: 'DATA_TABLE_WORDS.ascending',
        descending: 'DATA_TABLE_WORDS.descending',
        rows: ['DATA_TABLE_WORDS.rows', (said: (count: number) => string, fill) => said(Number(fill.count))],
        loaded: ['DATA_TABLE_WORDS.loaded', (said: (count: number) => string, fill) => said(Number(fill.count))],
        range: [
            'DATA_TABLE_WORDS.range',
            (said: (from: number, to: number, total: number) => string, fill) =>
                said(Number(fill.from), Number(fill.to), Number(fill.total)),
        ],
        page: [
            'DATA_TABLE_WORDS.page',
            (said: (page: number, pages: number) => string, fill) => said(Number(fill.page), Number(fill.pages)),
        ],
        perPage: 'DATA_TABLE_WORDS.perPage',
        firstPage: 'DATA_TABLE_WORDS.firstPage',
        previousPage: 'DATA_TABLE_WORDS.previousPage',
        nextPage: 'DATA_TABLE_WORDS.nextPage',
        lastPage: 'DATA_TABLE_WORDS.lastPage',
        selected: ['DATA_TABLE_WORDS.selected', (said: (count: number) => string, fill) => said(Number(fill.count))],
        clear: 'DATA_TABLE_WORDS.clear',
        selection: 'DATA_TABLE_WORDS.selection',
        selectAll: 'DATA_TABLE_WORDS.selectAll',
        selectEvery: ['DATA_TABLE_WORDS.selectEvery', (said: (count: number) => string, fill) => said(Number(fill.count))],
        allSelected: ['DATA_TABLE_WORDS.allSelected', (said: (count: number) => string, fill) => said(Number(fill.count))],
        selectRow: 'DATA_TABLE_WORDS.selectRow',
        expand: 'DATA_TABLE_WORDS.expand',
        collapse: 'DATA_TABLE_WORDS.collapse',
        loadMore: ['DATA_TABLE_WORDS.loadMore', (said: (count: number | undefined) => string) => said(undefined)],
        loadMoreCount: ['DATA_TABLE_WORDS.loadMore', (said: (count: number | undefined) => string, fill) => said(Number(fill.count))],
        loadingChildren: 'DATA_TABLE_WORDS.loadingChildren',
        resize: ['DATA_TABLE_WORDS.resize', (said: (column: string) => string, fill) => said(String(fill.column))],
        moveUp: ['DATA_TABLE_WORDS.moveUp', (said: (column: string) => string, fill) => said(String(fill.column))],
        moveDown: ['DATA_TABLE_WORDS.moveDown', (said: (column: string) => string, fill) => said(String(fill.column))],
        empty: 'DATA_TABLE_WORDS.empty',
        selectGroup: 'DATA_TABLE_WORDS.selectGroup',
        showGroup: ['DATA_TABLE_WORDS.foldGroup', (said: (folded: boolean) => string) => said(true)],
        hideGroup: ['DATA_TABLE_WORDS.foldGroup', (said: (folded: boolean) => string) => said(false)],
        groupCount: ['DATA_TABLE_WORDS.groupCount', (said: (count: number) => string, fill) => said(Number(fill.count))],
        saving: 'DATA_TABLE_WORDS.saving',
        saveFailed: 'DATA_TABLE_WORDS.saveFailed',
        notNumber: 'DATA_TABLE_WORDS.notNumber',
        moveRow: ['DATA_TABLE_WORDS.moveRow', (said: (row: string) => string, fill) => said(String(fill.row))],
        rowMoved: [
            'DATA_TABLE_WORDS.rowMoved',
            (said: (row: string, place: number, count: number) => string, fill) =>
                said(String(fill.row), Number(fill.place), Number(fill.count)),
        ],
        issueCritical: 'ISSUE_WORDS.issueCritical',
        issueWarning: 'ISSUE_WORDS.issueWarning',
        refused: 'PAGE_STATE_WORDS.refused',
        missing: 'PAGE_STATE_WORDS.missing',
        unreachable: 'PAGE_STATE_WORDS.unreachable',
        retry: 'PAGE_STATE_WORDS.retry',
    },
    options: {
        variant: propValues(DATA_TABLE, 'DataTableProps', 'variant'),
        paging: propValues(DATA_TABLE, 'DataTableProps', 'paging'),
        loadMore: propValues(DATA_TABLE, 'DataTableProps', 'loadMore'),
        stackLayout: propValues(DATA_TABLE, 'DataTableProps', 'stackLayout'),
        rowHeight: propValues(DATA_TABLE, 'DataTableProps', 'rowHeight'),
    },
    size: (size, key) => {
        const elements = table(size === 'list' ? { variant: 'list' } : {})
        const row = rowOf(elements)
        if (key === 'radius') return pieceWhere(elements[0])
        if (key === 'padX' && size === 'table') return pieceWhere(elements.find((element) => element.parent === row))
        return pieceWhere(row)
    },
    paint: (_, name, state) => {
        if (name === 'row') return tableRow(state)
        if (name === 'card') return tableCard(state)
        if (name === 'frame') return state === 'rest' ? pieceWhere(table()[0]) : skip(`no state of its own on the frame`)
        if (name === 'head') {
            const elements = table(state === 'sorted' ? { defaultSort: { column: 'name', direction: 'asc' } } : {})
            const head = elements.find((element) => element.attrs.role === 'row' && element.attrs['aria-rowindex'] === '1')
            const sorter = elements.find((element) => element.tag === 'button' && element.parent?.attrs.role === 'columnheader')
            if (head === undefined) return undefined
            const on = state === 'hover' ? ['hover'] : []
            return { layers: [classesOf(head), ...(state === 'rest' ? [] : [classesOf(sorter)])], on, around: ancestors(head) }
        }
        if (name === 'groupHead') {
            const elements = table({ groupBy: (job: Job) => job.state })
            return pieceWhere(elements.find((element) => element.attrs.role === 'row' && element.attrs['data-group'] !== undefined))
        }
        if (name === 'cardDetail') {
            const elements = table({ ...STACKED, detail: () => 'Ran in 4 minutes', defaultExpanded: FIRST })
            return pieceWhere(
                elements.find((element) => element.text === 'Ran in 4 minutes' && classesOf(element).includes('rounded-surface')),
            )
        }
        if (name === 'placeholder')
            return pieceWhere(table({ rows: [], loading: true }).find((element) => element.attrs['data-slot'] === 'skeleton'))
        if (name === 'empty') return pieceWhere(byText(table({ rows: [] }), 'p', DATA_TABLE_WORDS.empty))
        if (name === 'failure') {
            if (state === 'rest') return skip('not drawn at rest')
            const elements = table({ error: 'The read timed out', onRetry: () => undefined })
            const state_ = elements.find((element) => element.attrs['data-slot'] === 'page-state')
            if (state_ === undefined) return undefined
            const mark = elements.find((element) => element.tag === 'svg' && element.parent === state_)
            return { layers: [classesOf(state_)], on: [], around: ancestors(state_), mark: classesOf(mark) }
        }
        if (name === 'dropLine') {
            // Drawn only while a row is dragged, which a server drawing never is: its classes are read from the source.
            return { layers: [literalAfter(DATA_TABLE, 'function RowLine', 'className={cn(')], on: [] }
        }
        return undefined
    },
    effect: () => skip('the table states no effects'),
    keys: {
        Tab: () =>
            table().find((element) => element.attrs.role === 'grid')?.attrs.tabindex === '0' ? true : 'the grid is not one tab stop',
        'ArrowDown, ArrowUp': () => moves(['ArrowDown', 'ArrowUp']),
        'PageDown, PageUp': () => moves(['PageDown', 'PageUp']),
        'Home, End': () => moves(['Home', 'End']),
        'Space (selectable, or onOpen)': () => moves(["' '"]),
        Enter: () => moves(['Enter']),
        ArrowRight: () => moves(['ArrowRight']),
        ArrowLeft: () => moves(['ArrowLeft']),
        'Alt+ArrowUp, Alt+ArrowDown (onReorder, rows drawn as given)': () =>
            /event\.altKey && \(event\.key === 'ArrowUp' \|\| event\.key === 'ArrowDown'\)/.test(DATA_TABLE)
                ? true
                : 'no Alt with the arrows',
        'Shift+Click (selectable)': () =>
            /selectable && event\.shiftKey\) toggle\(entry, true\)/.test(DATA_TABLE) ? true : 'no range on Shift and a press',
        'Mod+Click (selectable)': () =>
            /selectable && \(event\.metaKey \|\| event\.ctrlKey\)\) toggle\(entry, false\)/.test(DATA_TABLE)
                ? true
                : 'no row on Ctrl or Cmd and a press',
        'ArrowLeft, ArrowRight, Enter (a handle has focus)': () => {
            const handle = source('components/ResizeHandle.tsx')
            return /'ArrowRight'/.test(handle) && /'ArrowLeft'/.test(handle) && /event\.key === 'Enter'/.test(handle)
                ? true
                : 'the handle misses a key'
        },
        'Enter, F2, a character (editing)': () => {
            const editing = source('components/table-editing.tsx')
            // A typed character opening the editor is a press a browser makes; Enter and F2 are read here.
            return /\bF2: /.test(editing) && /Enter/.test(editing) ? true : 'the editor misses Enter or F2'
        },
    },
}

/** Whether the table's key map moves on each key. */
function moves(keys: string[]): true | string {
    const map = DATA_TABLE.slice(
        DATA_TABLE.indexOf('const moves: Record<string, () => void> = {'),
        DATA_TABLE.indexOf('const move = moves[event.key]'),
    )
    const missing = keys.filter((key) => !new RegExp(`\\n\\s+${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: \\(\\) =>`).test(map))
    return missing.length === 0 ? true : `no ${missing.join(', ')} in the table's key map`
}

// Shell

const SHELL = source('components/Shell.tsx')
const SHELL_SPEC_ROUTE = () => SPECS.get('shell')?.routes?.settings ?? ''

const SHELL_ADAPTER: Adapter = {
    wordObjects: {
        SHELL_WORDS,
        RAIL_WORDS,
        TOP_BAR_WORDS,
        PAGE_HEADER_WORDS,
        COMMAND_PALETTE_WORDS,
        SETTINGS_DIALOG_WORDS,
        PAGE_STATE_WORDS,
    },
    complete: ['SHELL_WORDS', 'RAIL_WORDS', 'TOP_BAR_WORDS', 'PAGE_HEADER_WORDS', 'PAGE_STATE_WORDS'],
    words: {
        menu: 'SHELL_WORDS.menu',
        close: 'SHELL_WORDS.close',
        showPanel: 'SHELL_WORDS.showPanel',
        hidePanel: 'SHELL_WORDS.hidePanel',
        panelTabs: 'SHELL_WORDS.panelTabs',
        openPalette: 'SHELL_WORDS.openPalette',
        openShortcuts: 'SHELL_WORDS.openShortcuts',
        railCollapse: 'RAIL_WORDS.collapse',
        railExpand: 'RAIL_WORDS.expand',
        railResize: 'RAIL_WORDS.resize',
        unread: 'RAIL_WORDS.unread',
        places: 'RAIL_WORDS.places',
        search: 'TOP_BAR_WORDS.search',
        palette: 'TOP_BAR_WORDS.palette',
        trail: ['TOP_BAR_WORDS.trail', 'PAGE_HEADER_WORDS.trail'],
        back: ['PAGE_HEADER_WORDS.back', 'SETTINGS_DIALOG_WORDS.back'],
        more: 'PAGE_HEADER_WORDS.more',
        moreWays: 'PAGE_HEADER_WORDS.moreWays',
        palettePlaceholder: 'COMMAND_PALETTE_WORDS.placeholder',
        settingsTitle: 'SETTINGS_DIALOG_WORDS.title',
        settingsSearch: 'SETTINGS_DIALOG_WORDS.search',
        settingsSearchLabel: 'SETTINGS_DIALOG_WORDS.searchLabel',
        settingsClear: 'SETTINGS_DIALOG_WORDS.clear',
        settingsNoMatch: 'SETTINGS_DIALOG_WORDS.noMatch',
        settingsSaved: 'SETTINGS_DIALOG_WORDS.saved',
        settingsDone: 'SETTINGS_DIALOG_WORDS.done',
        settingsReset: 'SETTINGS_DIALOG_WORDS.reset',
        settingsResetSection: [
            'SETTINGS_DIALOG_WORDS.resetSection',
            (said: (section: string) => string, fill) => said(String(fill.section)),
        ],
        settingsResetSectionDetail: [
            'SETTINGS_DIALOG_WORDS.resetSectionDetail',
            (said: (section: string) => string, fill) => said(String(fill.section)),
        ],
        settingsResetAll: 'SETTINGS_DIALOG_WORDS.resetAll',
        settingsResetAllDetail: 'SETTINGS_DIALOG_WORDS.resetAllDetail',
        settingsResetConfirm: 'SETTINGS_DIALOG_WORDS.resetConfirm',
        cancel: 'SETTINGS_DIALOG_WORDS.cancel',
        loading: 'PAGE_STATE_WORDS.loading',
        refused: 'PAGE_STATE_WORDS.refused',
        missing: 'PAGE_STATE_WORDS.missing',
        unreachable: 'PAGE_STATE_WORDS.unreachable',
        partRefused: 'PAGE_STATE_WORDS.partRefused',
        retry: 'PAGE_STATE_WORDS.retry',
    },
    options: {
        railMode: propValues(SHELL, 'ShellProps', 'railMode'),
        trailEnds: propValues(source('components/TopBar.tsx'), 'TopBarProps', 'trailEnds'),
    },
    size: () => skip("the frame's parts are drawn by Shell, Rail, TopBar and StatusLine, which get specs of their own"),
    paint: () => skip("the frame's parts are drawn by Shell, Rail, TopBar and StatusLine, which get specs of their own"),
    effect: () => skip('the shell states no effects'),
    keys: {
        "Mod+K (nothing but the top bar's search results stands over the page)": () =>
            /key: 'k',\s+mod: true,\s+alsoCtrl: true/.test(SHELL) ? true : 'the palette is not bound to Mod+K and Ctrl+K',
        '?': () => (/key: '\?'/.test(SHELL) ? true : 'the shortcuts dialog is not bound to ?'),
        '/': () => (/key: '\/'/.test(source('components/SearchField.tsx')) ? true : 'the search field is not focused by /'),
        Escape: skip("each layer is Base UI's (dialog, popover, menu, drawer), which closes on Escape in a browser"),
        'Enter, Space, ArrowRight': () =>
            /event\.key !== 'Enter' && event\.key !== ' ' && event\.key !== forward/.test(source('components/ResizeHandle.tsx'))
                ? true
                : "the collapsed rail's edge does not expand on Enter, Space and the arrow",
        'ArrowLeft, ArrowRight': () =>
            /event\.key === forward\) step\(16\)\s+else if \(event\.key === back\) step\(-16\)/.test(source('components/ResizeHandle.tsx'))
                ? true
                : "the rail's edge does not resize on the arrows",
        'G then a letter': () => {
            const shortcuts = source('lib/shortcuts.ts')
            return /\bnext\?: string/.test(shortcuts) && /SEQUENCE_TIMEOUT = 1000\b/.test(shortcuts)
                ? true
                : 'no sequence of two keys within a second'
        },
        Back: () => (typeof useOverlayRoute === 'function' ? true : 'no useOverlayRoute'),
    },
    more: () => {
        const route = SHELL_SPEC_ROUTE()
        const drawn = route.startsWith('#/settings') && typeof useOverlayRoute === 'function'
        return [check('routes.settings', route, drawn ? route : 'no useOverlayRoute to draw it over the page')]
    },
}

// Differences the contract states, and those it is to drop

/**
 * Each sokkel-ui drift entry in a spec, by its `what`, with the checks it covers: they may differ,
 * and must, or the entry is stale. A function instead says whether the difference is still there,
 * for a drift no class or word shows.
 */
const DRIFT: Record<string, Record<string, readonly string[] | (() => boolean)>> = {
    'text-field': {
        'invalid tints': [
            'pieces.control.invalid.edge (dark)',
            'pieces.control.invalid+focus.edge (dark)',
            'states.invalid+focus.effect.ring.color',
            'states.invalid+focus.effect.ring.color (dark)',
        ],
    },
    table: {
        'words formatted for one locale': () => /toLocaleString\('en-US'\)/.test(DATA_TABLE),
    },
}

/** Differences where the spec is to change, by part and check, until the pin moves past the change: spec change pending. */
const PENDING: Record<string, Record<string, string>> = {}

const ADAPTERS: Record<string, Adapter> = {
    button: BUTTON_ADAPTER,
    'text-field': TEXT_FIELD_ADAPTER,
    table: TABLE_ADAPTER,
    shell: SHELL_ADAPTER,
}

// The checks, walked from each spec

const pathOf = (where: WordSource) => (typeof where === 'string' ? where : where[0])

/** The sources a spec word is said from: one, or a list of them. */
function sourcesOf(given: WordSource | WordSource[]): WordSource[] {
    if (typeof given === 'string') return [given]
    return typeof given[1] === 'function' ? [given as WordSource] : (given as WordSource[])
}

function wordChecks(spec: Spec, adapter: Adapter): Check[] {
    const checks: Check[] = []
    const lookup = (path: string): unknown => {
        const [object, key] = path.split('.')
        return (adapter.wordObjects[object] as Record<string, unknown> | undefined)?.[key]
    }
    for (const [key, wanted] of Object.entries(spec.words)) {
        const given = adapter.words[key]
        if (given === undefined) {
            checks.push(check(`words.${key}`, wanted, 'no word in sokkel-ui that parts.test knows of'))
            continue
        }
        const sources = sourcesOf(given)
        for (const where of sources) {
            const say = (fill: Record<string, string | number>): string | undefined => {
                if (typeof where === 'string') {
                    const said = lookup(where)
                    return typeof said === 'string' ? said : undefined
                }
                const [path, turn] = where
                return turn(lookup(path) as never, fill)
            }
            // A word several parts say is checked in each, under the part's own name after the first.
            const name = where === sources[0] ? `words.${key}` : `words.${key} (${pathOf(where)})`
            if (typeof wanted === 'string') checks.push(check(name, filled(wanted, {}), say(FILL)))
            else {
                checks.push(check(`${name}.one`, filled(wanted.one, { count: 1 }), say({ ...FILL, count: 1 })))
                checks.push(check(`${name}.other`, filled(wanted.other, {}), say(FILL)))
            }
        }
    }
    const named = new Set(Object.values(adapter.words).flatMap((given) => sourcesOf(given).map(pathOf)))
    for (const object of adapter.complete) {
        for (const key of Object.keys(adapter.wordObjects[object])) {
            if (!named.has(`${object}.${key}`))
                checks.push(check(`words.${object}.${key}`, 'a word in the spec', 'a word the spec does not list'))
        }
    }
    return checks
}

function optionChecks(spec: Spec, adapter: Adapter): Check[] {
    return Object.entries(spec.options ?? {})
        .filter(([, option]) => option.values !== undefined && option.context === undefined)
        .flatMap(([name, option]) => {
            const found = adapter.options[name]
            if (isSkip(found)) return []
            if (found === undefined || found.length === 0) return [check(`options.${name}`, option.values, 'no values parts.test can read')]
            // An optional prop left out is the default, so the spec's default need not be a value of its own.
            const wanted = (option.values ?? []).filter((value) => found.includes(value) || value !== option.default)
            return [check(`options.${name}`, [...wanted].sort().join(', '), [...found].sort().join(', '))]
        })
}

/** The variants a length is drawn under: below md, inside an icon, on the hit area drawn after the part. */
const SIZE_ON: Record<string, string[]> = {
    icon: ["[&_svg:not([class*='size-'])]"],
    phoneMinHeight: ['max-md'],
    phoneMinWidth: ['max-md'],
    phoneHitArea: ['max-md', 'after'],
}

const SIZE_READERS: Record<string, Reader> = {
    height: READ.height,
    width: READ.width,
    padX: READ.padX,
    padY: READ.padY,
    gap: READ.gap,
    icon: READ.square,
    radiusMax: READ.radiusMax,
    phoneMinHeight: READ.minHeight,
    phoneMinWidth: READ.minWidth,
    phoneHitArea: READ.square,
}

function sizeChecks(spec: Spec, adapter: Adapter): Check[] {
    const checks: Check[] = []
    for (const [size, lengths] of Object.entries(spec.sizes ?? {})) {
        const keys = new Set([...Object.keys(lengths), ...('radius' in lengths ? ['radiusMax'] : [])])
        for (const key of keys) {
            if (key === 'note') continue
            const wanted = lengths[key]
            const where = adapter.size(size, key)
            if (isSkip(where)) continue
            if (where === undefined) {
                checks.push(check(`sizes.${size}.${key}`, wanted, 'not drawn'))
                continue
            }
            const expected =
                wanted === null || wanted === undefined ? 'nothing' : typeof wanted === 'object' ? JSON.stringify(wanted) : String(wanted)
            let found: string | undefined
            if (key === 'text') {
                // A size with its own text below md states its role from md up.
                const on = 'textBelowMd' in lengths ? ['md'] : where.on
                found = roleOf({ ...where, on }, on, String(wanted))
            } else if (key === 'textBelowMd') {
                const name = resolve(where.layers, [], READ.size)
                const rem = name === undefined ? undefined : /^([\d.]+)rem$/.exec(TEXT.get(name)?.size ?? '')?.[1]
                found = rem === undefined ? undefined : String(Number(rem) * 16)
            } else if (key === 'radius') found = resolve(where.layers, where.on, READ.radius)
            else if (key === 'padXWithIcon') {
                const start = resolve(where.layers, ['has-data-[icon=inline-start]'], READ.padStart)
                const end = resolve(where.layers, ['has-data-[icon=inline-end]'], READ.padEnd)
                found = start === end ? start : `${String(start)} at the start, ${String(end)} at the end`
            } else if (key === 'height')
                found = resolve(where.layers, where.on, READ.height) ?? resolve(where.layers, where.on, READ.minHeight)
            else if (key === 'padX') {
                found =
                    resolve(where.layers, where.on, READ.padX) ??
                    (resolve(where.layers, where.on, READ.padStart) === resolve(where.layers, where.on, READ.padEnd)
                        ? resolve(where.layers, where.on, READ.padStart)
                        : undefined)
            } else {
                const read = SIZE_READERS[key]
                if (read === undefined) {
                    checks.push(check(`sizes.${size}.${key}`, wanted, 'a length parts.test cannot read'))
                    continue
                }
                found = resolve(where.layers, [...where.on, ...(SIZE_ON[key] ?? [])], read)
            }
            checks.push(check(`sizes.${size}.${key}`, expected, found))
        }
    }
    return checks
}

function paintMapChecks(spec: Spec, adapter: Adapter): Check[] {
    const checks: Check[] = []
    for (const group of ['variants', 'pieces'] as const) {
        for (const [name, map] of Object.entries(spec[group] ?? {})) {
            for (const [state, paint] of Object.entries(map)) {
                const { note: _, ...painted } = paint
                if (Object.keys(painted).length === 0) continue
                if (state.split('+').some((one) => spec.states[one]?.status === 'proposed')) continue
                const key = `${group}.${name}.${state}`
                const where = adapter.paint(group, name, state)
                if (isSkip(where)) continue
                if (where === undefined) checks.push(check(key, 'drawn', 'not drawn'))
                else checks.push(...paintChecks(key, paint, where))
            }
        }
    }
    return checks
}

function effectChecksOf(spec: Spec, adapter: Adapter): Check[] {
    return Object.entries(spec.states).flatMap(([state, entry]) => {
        if (entry.effect === undefined || entry.status === 'proposed') return []
        const where = adapter.effect(state, entry.effect.piece)
        if (isSkip(where)) return []
        if (where === undefined) return [check(`states.${state}.effect`, 'drawn', 'not drawn')]
        return effectChecks(`states.${state}.effect`, entry.effect, where)
    })
}

function keyChecks(spec: Spec, adapter: Adapter): Check[] {
    return spec.keyboard.flatMap((binding) => {
        const name = keyName(binding)
        const probe = adapter.keys[name]
        if (probe === undefined)
            return [
                check(`keyboard.${name}`, binding.does, 'no probe in parts.test: say where sokkel-ui handles it, or why it cannot be read'),
            ]
        if (isSkip(probe)) return []
        const found = probe()
        return [check(`keyboard.${name}`, binding.does, found === true ? binding.does : found)]
    })
}

/** Every check of a part, made once. */
const made = new Map<string, Check[]>()
function checksOf(id: string): Check[] {
    const known = made.get(id)
    if (known !== undefined) return known
    const spec = SPECS.get(id)
    const adapter = ADAPTERS[id]
    if (spec === undefined || adapter === undefined) return []
    const all = [
        ...wordChecks(spec, adapter),
        ...optionChecks(spec, adapter),
        ...sizeChecks(spec, adapter),
        ...paintMapChecks(spec, adapter),
        ...effectChecksOf(spec, adapter),
        ...keyChecks(spec, adapter),
        ...(adapter.more?.() ?? []),
    ]
    made.set(id, all)
    return all
}

/** The checks a part's drift entries and pending spec changes allow to differ. */
function allowed(id: string): Set<string> {
    const covered = Object.values(DRIFT[id] ?? {}).flatMap((entry) => (typeof entry === 'function' ? [] : entry))
    return new Set([...covered, ...Object.keys(PENDING[id] ?? {})])
}

const said = (id: string, one: Check) => `${id} ${one.key}: the spec says ${one.spec}, sokkel-ui has ${one.found}`

/** Fails on every check of the aspects that differs, unless the spec's drift or a pending spec change allows it. */
function holds(id: string, ...aspects: string[]) {
    const allow = allowed(id)
    const differing = checksOf(id).filter((one) => aspects.some((aspect) => one.key.startsWith(aspect)) && !one.same && !allow.has(one.key))
    expect(differing.map((one) => said(id, one))).toEqual([])
}

describe('the design pin', () => {
    it('has an adapter for every part and pattern in the contract', () => {
        expect([...SPECS.keys()].filter((id) => ADAPTERS[id] === undefined)).toEqual([])
    })
})

for (const id of SPECS.keys()) {
    describe(id, () => {
        it('says the words the spec lists, and no word it does not', () => holds(id, 'words.'))
        it('takes the values each option lists', () => holds(id, 'options.'))
        it('draws each size at the lengths the spec gives', () => holds(id, 'sizes.'))
        it('paints each state as the spec does', () => holds(id, 'variants.', 'pieces.', 'states.'))
        it('handles the keys the spec binds', () => holds(id, 'keyboard.'))
        it('meets the rest of the spec', () => holds(id, 'routes.'))
        it("states its drift: each of sokkel-ui's drift entries still differs, and nothing else is allowed to", () => {
            const spec = SPECS.get(id)
            const checks = checksOf(id)
            const problems: string[] = []
            for (const entry of spec?.drift ?? []) {
                if (entry.renderer !== 'sokkel-ui') continue
                const covers = DRIFT[id]?.[entry.what]
                if (covers === undefined) {
                    problems.push(`${id} drift "${entry.what}" is not known to parts.test: name the checks it covers in DRIFT`)
                } else if (typeof covers === 'function') {
                    if (!covers()) problems.push(`${id} drift "${entry.what}" no longer differs: drop it from the spec`)
                } else {
                    for (const key of covers) {
                        const found = checks.find((one) => one.key === key)
                        if (found === undefined)
                            problems.push(`${id} drift "${entry.what}" covers ${key}, which parts.test no longer checks`)
                        else if (found.same) problems.push(`${id} drift "${entry.what}" no longer differs at ${key}: drop it from the spec`)
                    }
                }
            }
            for (const what of Object.keys(DRIFT[id] ?? {})) {
                if (!(spec?.drift ?? []).some((entry) => entry.renderer === 'sokkel-ui' && entry.what === what)) {
                    problems.push(`${id} DRIFT names "${what}", which the spec no longer lists: drop it here`)
                }
            }
            for (const key of Object.keys(PENDING[id] ?? {})) {
                const found = checks.find((one) => one.key === key)
                if (found === undefined || found.same)
                    problems.push(`${id} ${key} is pending a spec change that has landed: drop it from PENDING`)
            }
            expect(problems).toEqual([])
        })
    })
}
