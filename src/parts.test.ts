import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CalendarClock, Folder, Play, Server, Workflow } from 'lucide-react'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import {
    COMMAND_PALETTE_WORDS,
    CommandPalette,
    PALETTE_SEARCH_WORDS,
    type CommandPaletteProps,
    type PaletteCommand,
} from '@winterop-com/sokkel-ui/CommandPalette'
import { DataTable, DATA_TABLE_WORDS, headEntered, headStep, type DataColumn, type DataTableProps } from '@winterop-com/sokkel-ui/DataTable'
import { DIALOG_SHELL_WORDS } from '@winterop-com/sokkel-ui/DialogShell'
import { FIELD_WORDS } from '@winterop-com/sokkel-ui/Field'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { ISSUE_WORDS, IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { PageHeader, PAGE_HEADER_WORDS, type PageHeaderProps } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState, PAGE_STATE_WORDS, type PageStateProps } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DialogFooter, DialogHeader } from '@winterop-com/sokkel-ui/primitives/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Kbd } from '@winterop-com/sokkel-ui/primitives/kbd'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    type SelectTriggerProps,
} from '@winterop-com/sokkel-ui/primitives/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, RAIL_WORDS, type RailGroup, type RailProps } from '@winterop-com/sokkel-ui/Rail'
import { Section, type SectionProps } from '@winterop-com/sokkel-ui/Section'
import { SelectField, type SelectFieldProps } from '@winterop-com/sokkel-ui/SelectField'
import { ProblemLine } from '@winterop-com/sokkel-ui/ProseText'
import { SettingRow } from '@winterop-com/sokkel-ui/SettingRow'
import { SETTINGS_DIALOG_WORDS } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Shell, SHELL_WORDS, type ShellProps } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem, StatusLine, type StatusLineProps } from '@winterop-com/sokkel-ui/StatusLine'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { ThemePicker, type ThemePickerProps } from '@winterop-com/sokkel-ui/ThemePicker'
import { TopBar, TOP_BAR_WORDS, type TopBarProps } from '@winterop-com/sokkel-ui/TopBar'

/**
 * sokkel-ui against the sokkel-design contract. `design/` holds the contract's parts and patterns
 * at the commit `design/pin.json` names (`bun run design` keeps it), and each spec is checked
 * against what can be read from the components without a browser: drawn by React on the server, or
 * read from their sources. For each part:
 *
 *   words     every word the spec lists is the component's English default, and every default is in the spec;
 *             a word said as a function says what each of the spec's samples says (zero, one, many, each value it interpolates)
 *   options   each option's values are the component's variant keys or prop values, no more and no fewer
 *   sizes     each size's lengths are the tokens and steps its classes use (heights by density token)
 *   paints    each state's ground, edge, ink, rule, ring, radius, text and opacity are the classes the
 *             state's selector picks, with the cascade's own precedence, in light and in dark
 *   keys      each binding is handled where the source shows it
 *   layout    each length a part's layout gives that its classes or its source show
 *
 * Where the code and the spec differ, the spec's `drift` entries for sokkel-ui say so on purpose:
 * `DRIFT` names the checks each entry covers, and a covered check that no longer differs fails, so
 * fixed drift leaves the spec. `PENDING` holds differences where the spec is to change, until the
 * pin moves past the change. Anything else that differs fails. What cannot be read without a
 * browser is said beside each part, with the reason, rather than passed in silence.
 */

// The palette's dialog opens in a portal, which a server drawing leaves out: its box is drawn in place, with the classes the palette gives it.
vi.mock('@winterop-com/sokkel-ui/primitives/command', async (original) => {
    const module = await original<typeof import('@winterop-com/sokkel-ui/primitives/command')>()
    const react = await import('react')
    return {
        ...module,
        CommandDialog: ({ children, className }: { children: ReactNode; className?: string }) =>
            react.createElement('div', { 'data-slot': 'dialog-content', className }, children),
    }
})

const ROOT = join(__dirname, '..')
const CORE = join(ROOT, 'packages', 'core', 'src')

function source(path: string): string {
    return readFileSync(join(CORE, path), 'utf8')
}

/** The look every popup wears (`lib/popup`), laid under the popup's own classes. */
const POPUP_LOOK = /export const POPUP = '([^']+)'/.exec(source('lib/popup.ts'))?.[1] ?? ''

/** The busy wait a part holds for: `busy-release` when its `busyRelease` defaults to the token's generated constant. */
const BUSY_WAIT = /export const BUSY_RELEASE = (\d+)\b/.exec(source('lib/durations.ts'))?.[1]
const busyReleaseIn = (text: string, anchor: string) =>
    defaultIn(text, anchor, 'busyRelease') === 'BUSY_RELEASE' &&
    /'busy-release'/.test(readFileSync(join(ROOT, 'scripts', 'build-tokens.ts'), 'utf8'))
        ? 'busy-release'
        : undefined
/** Whether a part closes only as `letsGo` (or `closing`, which reads it) says while busy, after `useBusyRelease`'s wait. */
const releasedBy = (text: string) => /useBusyRelease\(/.test(text) && /(letsGo|closing)\(/.test(text)

/** The elevation a part's classes put under it, by its token: `shadow-pop` is elevation-pop, `shadow-dialog` elevation-dialog. */
const elevationOf = (layers: readonly string[], on: readonly string[] = []) =>
    resolve(layers, on, (name) => {
        const token = /^shadow-(pop|dialog|none)$/.exec(name)?.[1]
        return token === undefined ? undefined : token === 'none' ? 'none' : `elevation-${token}`
    }) ?? 'none'

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
    layout?: Record<string, Length | { value: Length; note?: string }>
    states: Record<string, { status?: 'today' | 'proposed'; effect?: Effect }>
    variants?: Record<string, Record<string, Paint>>
    pieces?: Record<string, Record<string, Paint>>
    keyboard: { keys: string[]; does: string; when?: string }[]
    words: Record<string, string | { one: string; other: string }>
    samples?: Record<string, { with: Record<string, string | number | boolean>; says: string }[]>
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
/** Colors set as plain custom properties, with no class of their own: read where a part paints with `var()`, such as a gradient's dots. */
const RAW_COLORS = new Set([...STYLES.matchAll(/^\s+--([a-z0-9-]+): #[0-9a-f]{3,8};/gm)].map((match) => match[1]))
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
    if (token !== null && COLORS.has(token[1])) return value
    const raw = /^\(--([a-z0-9-]+)\)$/.exec(value)
    return raw !== null && RAW_COLORS.has(raw[1]) ? raw[1] : undefined
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

/** The ring widths the theme names (`ring-focus`, `outline-focus`), by the token each stands for. */
const RING_WIDTHS: Record<string, string> = { focus: 'focus-ring-width', invalid: 'invalid-ring-width' }

const READ = {
    ground: prefixed('bg-'),
    edge: prefixed('border-'),
    rule: prefixed('border-b-', 'border-t-', 'border-', 'divide-'),
    /** A rule drawn with no color class of its own: its width alone. */
    ruleWidth: (name: string) => (/^(?:border|border-[tblrxy]|divide-[xy])$/.test(name) ? '1' : undefined),
    ink: prefixed('text-'),
    ringColor: (name: string) =>
        prefixed('ring-', 'outline-')(name) ?? /^shadow-\[inset_\d+px_0_0_var\(--([a-z0-9-]+)\)\]$/.exec(name)?.[1],
    ringWidth: (name: string) => {
        if (name === 'ring' || name === 'outline') return '1'
        const inset = /^shadow-\[inset_(\d+)px_0_0_var\(--[a-z0-9-]+\)\]$/.exec(name)
        if (inset !== null) return inset[1]
        const token = /^(?:ring|outline)-(focus|invalid)$/.exec(name)?.[1]
        if (token !== undefined) return RING_WIDTHS[token]
        return /^(?:ring|outline)-(\d+)$/.exec(name)?.[1]
    },
    ringOffset: (name: string) =>
        /^(?:ring|outline)-offset-focus$/.test(name) ? 'focus-ring-offset' : /^(?:ring|outline)-offset-(\d+)$/.exec(name)?.[1],
    opacity: (name: string) => {
        if (name === 'opacity-disabled') return 'disabled-opacity'
        const match = /^opacity-(\d+)$/.exec(name)
        return match === null ? undefined : String(Number(match[1]) / 100)
    },
    underline: (name: string) => (name === 'underline' ? 'true' : name === 'no-underline' ? 'false' : undefined),
    radius: (name: string) => {
        if (name.startsWith('rounded-[min(var(--control-radius),')) return 'radius-control'
        const match = /^rounded-(control|surface|mini|xs|sm|md|lg|xl|none|full)$/.exec(name)
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
    pad: lengthOf('p-'),
    padStart: lengthOf('pl-'),
    padEnd: lengthOf('pr-'),
    gap: lengthOf('gap-'),
    gapX: lengthOf('gap-x-'),
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

/** The color base.css gives every border that names none of its own. */
const BORDER = /\*\s*\{\s*@apply border-([a-z-]+)\s/.exec(STYLES)?.[1]

function colorFound(key: (typeof COLOR_KEYS)[number], where: Where, on: string[]): string | undefined {
    if (key === 'ink') return inkOf(where, on)
    if (key === 'rule')
        return resolve(where.layers, on, READ.rule) ?? (resolve(where.layers, on, READ.ruleWidth) === undefined ? undefined : BORDER)
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
    query: 'harbor',
    reason: 'The search timed out',
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
const SOURCES_FOR_TYPES = [
    source('components/shell-context.ts'),
    source('components/TopBar.tsx'),
    source('components/Field.tsx'),
    source('components/Rail.tsx'),
    source('components/StatusLine.tsx'),
    source('components/Section.tsx'),
    source('components/PageState.tsx'),
    source('components/SettingRow.tsx'),
    source('components/CommandPalette.tsx'),
]

/** The string values a prop takes, read from its declaration (or the type it names) in a source: an interface, or a type that adds to another. */
function propValues(text: string, props: string, prop: string): string[] {
    const start = [`export interface ${props}`, `export type ${props} =`].map((head) => text.indexOf(head)).find((at) => at >= 0)
    if (start === undefined) return []
    const body = text.slice(start)
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
            return { layers: [POPUP_LOOK, popup, own], on: [] }
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
            // The head the keys chose takes the focus on its sorter, which wears the button's focus look.
            const on = state === 'hover' ? ['hover'] : state === 'headActive+focus' ? ['focus-visible'] : []
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
        'ArrowUp (the table view, a sortable head drawn)': () =>
            headEntered(['name', 'state'], 'state') === 'state' &&
            headEntered(['name', 'state'], undefined) === 'name' &&
            /ArrowUp: \(\) => \{[\s\S]*?activeIndex <= 0 && showHeads \? headEntered\(sortHeads, sort\?\.column\)/.test(DATA_TABLE)
                ? true
                : 'Up from the first row does not enter the head row on the sorted head, else the first',
        'ArrowLeft, ArrowRight (in the head row)': () => {
            const left = headStep(['name', 'state', 'took'], 'state', 'ArrowLeft')
            const right = headStep(['name', 'state', 'took'], 'took', 'ArrowRight')
            return JSON.stringify([left, right]) === JSON.stringify([{ head: 'name' }, { head: 'took' }])
                ? true
                : `the arrows choose ${JSON.stringify([left, right])}`
        },
        'Enter, Space (in the head row)': () =>
            JSON.stringify(['Enter', ' '].map((key) => headStep(['name', 'state'], 'state', key))) ===
                JSON.stringify([{ sort: 'state' }, { sort: 'state' }]) &&
            /if \(keyHead !== undefined\) \{[\s\S]*?nextSort\(column\)/.test(DATA_TABLE)
                ? true
                : "Enter or Space in the head row does not turn the head's order",
        'ArrowDown (in the head row)': () =>
            headStep(['name', 'state'], 'state', 'ArrowDown') === 'rows' &&
            /step === 'rows'\) \{\s+setHeadAt\(undefined\)\s+moveTo\(0\)/.test(DATA_TABLE)
                ? true
                : 'Down in the head row does not go back to the first row',
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

// What a part's layout gives, against what its classes or its source show

/** A layout length as the spec gives it, bare or with a note. */
function layoutValue(spec: Spec | undefined, key: string): string {
    const given = spec?.layout?.[key]
    const value = typeof given === 'object' && given !== null && 'value' in given ? given.value : given
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** One check per layout key the reader knows; a key it does not know fails, so none passes in silence. */
function layoutChecks(id: string, readers: Record<string, () => string | undefined>): Check[] {
    const spec = SPECS.get(id)
    return Object.keys(spec?.layout ?? {}).map((key) => {
        const read = readers[key] as (() => string | undefined) | undefined
        return check(`layout.${key}`, layoutValue(spec, key), read === undefined ? 'a layout length parts.test cannot read' : read())
    })
}

/** The first match's group in a source, as a number of px: a spacing step, a rem or a plain number. */
const numberIn = (text: string, pattern: RegExp, unit: 'px' | 'step' | 'rem' = 'px') => {
    const found = pattern.exec(text)?.[1]
    if (found === undefined) return undefined
    return String(Number(found) * (unit === 'step' ? 4 : unit === 'rem' ? 16 : 1))
}

/** The motion token a `duration-<name>` class in a source names (`duration-fast` is motion-fast), or a plain number of ms. */
const durationIn = (text: string, pattern: RegExp) => {
    const found = pattern.exec(text)?.[1]
    if (found === undefined) return undefined
    return /^\d+$/.test(found) ? found : `motion-${found}`
}

/** A class's length on an element, read with one of the length readers. */
const lengthOn = (element: El | undefined, read: Reader) => (element === undefined ? undefined : resolve([classesOf(element)], [], read))

/** Whether an element stands inside another. */
function within(element: El, root: El): boolean {
    for (let up = element.parent; up !== undefined; up = up.parent) if (up === root) return true
    return false
}

/** The icon an element draws: its first svg. */
const iconOf = (elements: El[], element: El | undefined) =>
    element === undefined ? undefined : elements.find((one) => one.tag === 'svg' && within(one, element))

/** The variants each state of a frame part turns on; a state a drawing reaches turns none on. */
const FRAME_ON: Record<string, string[]> = {
    hover: ['hover', 'group-hover/entry', 'group-hover/handle'],
    focus: ['focus-visible', 'group-focus-visible/handle'],
    dragging: ['group-data-dragging/handle'],
    open: ['data-popup-open', 'group-data-popup-open/entry'],
    phone: ['max-md'],
}
const frameOn = (state: string) => state.split('+').flatMap((one) => FRAME_ON[one] ?? [])

function at(element: El | undefined, state = 'rest'): Where | undefined {
    return element === undefined ? undefined : { layers: [classesOf(element)], on: frameOn(state), around: ancestors(element) }
}

/** A value made the first time it is asked for, and kept. */
function once<T>(make: () => T): () => T {
    let made: { value: T } | undefined
    return () => (made ??= { value: make() }).value
}

// Rail

/** The collapsed rail's tooltip: the library's own box, when the rail draws its tips with `TooltipContent`. */
const railTip = () => (/function Tip\([\s\S]*?<TooltipContent side="right"/.test(RAIL) ? TOOLTIP_BOX : '')

const RAIL = source('components/Rail.tsx')
const RESIZE_HANDLE = source('components/ResizeHandle.tsx')

const PLACES: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#/runs', active: true, count: 3 },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#/schedules' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#/jobs', unread: true },
            {
                id: 'services',
                label: 'Services',
                icon: Server,
                href: '#/services',
                entries: [
                    { id: 'api', label: 'api', href: '#/services/api' },
                    { id: 'worker', label: 'worker', href: '#/services/worker' },
                ],
            },
            {
                id: 'projects',
                label: 'Projects',
                icon: Folder,
                entries: [
                    { id: 'harbor', label: 'harbor', href: '#/projects/harbor' },
                    { id: 'juniper', label: 'juniper', href: '#/projects/juniper' },
                ],
            },
        ],
    },
]
/** Places with a line under each label, the active one among them. */
const DESCRIBED: RailGroup[] = [
    {
        id: 'places',
        entries: [
            { id: 'runs', label: 'Runs', description: 'Every run, newest first', icon: Play, href: '#/runs', active: true },
            { id: 'schedules', label: 'Schedules', description: 'When each job starts', icon: CalendarClock, href: '#/schedules' },
        ],
    },
]
/** A parent with a page of its own, unfolded over the active entry. */
const HOLDING: RailGroup[] = [
    {
        id: 'build',
        entries: [
            {
                id: 'services',
                label: 'Services',
                icon: Server,
                href: '#/services',
                entries: [
                    { id: 'api', label: 'api', href: '#/services/api', active: true },
                    { id: 'worker', label: 'worker', href: '#/services/worker' },
                ],
            },
        ],
    },
]

const rail = (props: Partial<RailProps> = {}) =>
    draw(Rail, { name: 'Tidevann', mark: 'T', markHref: '#/', groups: PLACES, onCollapsedChange: () => undefined, foot: 'ada', ...props })
/** The drawings most checks read, each made once. */
const RAILS = once(() => ({ expanded: rail(), collapsed: rail({ collapsed: true }), strip: rail({ variant: 'strip' }) }))
/** An expanded entry's row, by its label: the row that draws the start bar. */
const railRow = (elements: El[], label: string) =>
    elements.find((element) => classesOf(element).includes('border-l-2') && element.text.startsWith(label))
/** A collapsed rail's entry, named by its label: a link, or a parent's button. */
const iconEntry = (elements: El[], label: string) =>
    elements.find((element) => (element.tag === 'a' || element.tag === 'button') && element.attrs['aria-label'] === label)
const railHead = (elements: El[]) => elements.find((element) => classesOf(element).split(' ').includes('h-shell-top'))
const railMark = (elements: El[]) =>
    elements.find((element) => element.tag === 'span' && classesOf(element).includes('size-8') && classesOf(element).includes('bg-primary'))
const collapseControl = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === RAIL_WORDS.collapse)
/** A collapsed rail's mark, the control that expands it. */
const expandControl = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === RAIL_WORDS.expand)
const groupTitle = (elements: El[]) => byText(elements, 'p', 'Operate')
const railEdge = (elements: El[]) => elements.find((element) => element.attrs.role === 'separator')
const stripEntry = (elements: El[], label: string) =>
    elements.find((element) => element.tag === 'a' && classesOf(element).includes('group/entry') && element.text.endsWith(label))
const stripTile = (elements: El[], label: string) => {
    const entry = stripEntry(elements, label)
    return elements.find((element) => element.parent === entry && classesOf(element).includes('size-9'))
}
/** The foot cell the rail draws in its own column; the docked one is drawn into the shell's foot row, a portal no server drawing reaches. */
const footCell = (elements: El[]) =>
    elements.find((element) => element.parent?.tag === 'aside' && classesOf(element).includes('h-shell-foot'))

const RAIL_ADAPTER: Adapter = {
    wordObjects: { RAIL_WORDS },
    complete: ['RAIL_WORDS'],
    words: {
        collapse: 'RAIL_WORDS.collapse',
        expand: 'RAIL_WORDS.expand',
        resize: 'RAIL_WORDS.resize',
        unread: 'RAIL_WORDS.unread',
        places: 'RAIL_WORDS.places',
    },
    options: { variant: propValues(RAIL, 'RailProps', 'variant'), view: propValues(RAIL, 'RailProps', 'view') },
    size: (size, key) => {
        const { expanded, collapsed, strip } = RAILS()
        // An expanded row's pad is its start bar and its start pad against its end pad, which `more` reads.
        if (key === 'padX' && (size === 'entry' || size === 'describedEntry')) return skip('read in more: the bar and pl against pr')
        const drawn: Record<string, [El[], El | undefined]> = {
            head: [expanded, railHead(expanded)],
            mark: [expanded, railMark(expanded)],
            collapse: [expanded, collapseControl(expanded)],
            entry: [expanded, railRow(expanded, 'Schedules')],
            describedEntry: (() => {
                const elements = rail({ groups: DESCRIBED })
                return [elements, railRow(elements, 'Schedules')] as [El[], El | undefined]
            })(),
            iconEntry: [collapsed, iconEntry(collapsed, 'Schedules')],
            groupTitle: [expanded, groupTitle(expanded)],
            chevronButton: [expanded, expanded.find((element) => element.tag === 'button' && classesOf(element).includes('right-1'))],
            footCell: [expanded, footCell(expanded)],
            edge: [expanded, railEdge(expanded)],
            strip: [strip, strip.find((element) => element.tag === 'aside')],
            stripTile: [strip, stripTile(strip, 'Schedules')],
        }
        // The collapsed rail's tooltip is the library's, in a portal a server drawing leaves out: its box's classes are read from the source.
        if (size === 'tooltip') return { layers: [railTip()], on: [] }
        const [elements, element] = drawn[size] ?? [[], undefined]
        return key === 'icon' ? pieceWhere(iconOf(elements, element)) : pieceWhere(element)
    },
    paint: (_, name, state) => {
        const { expanded, collapsed, strip } = RAILS()
        const active = state.startsWith('active')
        switch (name) {
            case 'frame':
                return at(
                    expanded.find((element) => element.tag === 'aside'),
                    state,
                )
            case 'head':
                return at(railHead(expanded), state)
            case 'mark':
                return at(state === 'focus' ? expandControl(collapsed) : railMark(expanded), state)
            case 'name':
                return at(byText(expanded, 'span', 'Tidevann'), state)
            case 'home':
                return at(
                    expanded.find((element) => element.tag === 'a' && element.parent === railHead(expanded)),
                    state,
                )
            case 'collapse':
                return at(collapseControl(expanded), state)
            case 'groupTitle':
                return at(groupTitle(expanded), state)
            case 'groupRule':
                return at(
                    collapsed.find((element) => classesOf(element).includes('h-px') && classesOf(element).includes('bg-border-strong')),
                    state,
                )
            case 'entry':
                if (state.startsWith('holding')) return at(railRow(rail({ groups: HOLDING }), 'Services'), state)
                return at(railRow(expanded, active ? 'Runs' : 'Schedules'), state)
            case 'description':
                return at(byText(rail({ groups: DESCRIBED }), 'span', active ? 'Every run, newest first' : 'When each job starts'), state)
            case 'count':
                return at(
                    expanded.find((element) => classesOf(element).includes('tabular-nums') && classesOf(element).includes('ml-auto')),
                    state,
                )
            case 'cornerCount':
                return at(
                    collapsed.find((element) => element.attrs['data-tone'] !== undefined),
                    state,
                )
            case 'unreadDot':
                return at(
                    expanded.find((element) => element.attrs.role === 'img' && element.attrs['aria-label'] === RAIL_WORDS.unread),
                    state,
                )
            case 'chevron':
                return at(
                    expanded.find((element) => element.tag === 'svg' && classesOf(element).includes('transition-transform')),
                    state,
                )
            case 'chevronButton':
                return at(
                    expanded.find((element) => element.tag === 'button' && classesOf(element).includes('right-1')),
                    state,
                )
            case 'iconEntry':
                return at(iconEntry(collapsed, active ? 'Runs' : state === 'open' ? 'Projects' : 'Schedules'), state)
            case 'tooltip':
                // Opened in a portal, which a server drawing leaves out: its classes are read from the source.
                return { layers: [railTip()], on: frameOn(state) }
            case 'edge':
                return at(
                    expanded.find((element) => element.parent?.attrs.role === 'separator'),
                    state,
                )
            case 'footCell':
                // Docked, the cell is drawn into the shell's foot row through a portal: its classes are read from the source.
                if (state === 'docked') return { layers: [literalAfter(RAIL, 'createPortal(', 'className=')], on: [] }
                return at(footCell(expanded), state)
            case 'stripEntry':
                return at(stripEntry(strip, active ? 'Runs' : 'Schedules'), state)
            case 'stripTile':
                return at(stripTile(strip, active ? 'Runs' : 'Schedules'), state)
            default:
                return undefined
        }
    },
    effect: () => skip('the rail states no effects'),
    keys: {
        Tab: () => {
            const elements = RAILS().expanded
            const home = elements.find((element) => element.tag === 'a' && element.parent === railHead(elements))
            const entry = railRow(elements, 'Schedules')
            const reached = [home, collapseControl(elements), entry, railEdge(elements)].every(focusable)
            return reached && entry?.tag === 'a' && entry.attrs.href !== undefined
                ? true
                : 'the home link, the collapse control, an entry or the edge is out of the tab order'
        },
        Enter: () => {
            const { expanded: elements, collapsed } = RAILS()
            const parent = elements.find((element) => element.tag === 'button' && element.text.startsWith('Projects'))
            const flyout = iconEntry(collapsed, 'Projects')
            return railRow(elements, 'Schedules')?.tag === 'a' && parent?.attrs['aria-expanded'] !== undefined && flyout?.tag === 'button'
                ? true
                : 'an entry is not a link, or a parent not a button'
        },
        'ArrowRight (a folded parent in the expanded rail)': () =>
            /event\.key === 'ArrowRight' && !inside && !open\) \{\s+event\.preventDefault\(\)\s+onOpen\(true\)/.test(RAIL)
                ? true
                : 'no ArrowRight unfolds a parent',
        'ArrowLeft (an unfolded parent in the expanded rail, or one of its entries)': () =>
            /event\.key === 'ArrowLeft' && \(open \|\| inside\)\) \{\s+event\.preventDefault\(\)\s+onOpen\(false\)\s+if \(inside\) control\.current\?\.focus\(\)/.test(
                RAIL,
            )
                ? true
                : 'no ArrowLeft folds a parent and goes back to its row',
        'Enter, Space, ArrowRight (collapsed, with onCollapsedChange)': () =>
            /event\.key !== 'Enter' && event\.key !== ' ' && event\.key !== forward/.test(RESIZE_HANDLE) &&
            /onExpand=\{collapsed \? \(\) => setCollapsed\(false\) : undefined\}/.test(RAIL)
                ? true
                : "the collapsed rail's edge does not expand on Enter, Space and the arrow",
        "ArrowLeft, ArrowRight, Home, End, Enter (the expanded rail's edge has focus)": () =>
            /event\.key === forward\) step\(16\)\s+else if \(event\.key === back\) step\(-16\)/.test(RESIZE_HANDLE) &&
            /event\.key === 'Home'\) onSize\(min\)/.test(RESIZE_HANDLE) &&
            /event\.key === 'End'\) onSize\(max\)/.test(RESIZE_HANDLE) &&
            /event\.key === 'Enter' && \(onReset !== undefined \|\| reset !== undefined\)\) restore\(\)/.test(RESIZE_HANDLE)
                ? true
                : "the rail's edge misses an arrow, Home, End or Enter",
        'Alt+ArrowUp, Alt+ArrowDown (a group with onReorder, inside RailDrops)': () =>
            /!event\.altKey \|\| \(event\.key !== 'ArrowUp' && event\.key !== 'ArrowDown'\)/.test(source('components/RailDrops.tsx'))
                ? true
                : 'no Alt with the arrows moves an entry',
        Escape: skip("a flyout is Base UI's popover and the drawer the shell's overlay, both closing on Escape in a browser"),
    },
    more: () => {
        const spec = SPECS.get('rail')
        const { expanded, collapsed, strip } = RAILS()
        const row = railRow(expanded, 'Schedules')
        // The start pad holds the active bar: the bar's width and pl, against pr at the end.
        const inset = (element: El | undefined) => {
            const classes = classesOf(element)
            const start =
                Number(/(?:^|\s)border-l-(\d+)(?:\s|$)/.exec(classes)?.[1] ?? 0) +
                Number(length(/(?:^|\s)pl-([\d.]+)(?:\s|$)/.exec(classes)?.[1] ?? '0'))
            const end = Number(length(/(?:^|\s)pr-([\d.]+)(?:\s|$)/.exec(classes)?.[1] ?? '0'))
            return start === end ? String(start) : `${String(start)} at the start, ${String(end)} at the end`
        }
        const pads = ['entry', 'describedEntry'].map((size) =>
            check(
                `sizes.${size}.padX`,
                String(spec?.sizes?.[size]?.padX),
                inset(size === 'entry' ? row : railRow(rail({ groups: DESCRIBED }), 'Schedules')),
            ),
        )
        const nav = expanded.find((element) => element.tag === 'nav')
        const title = groupTitle(expanded)
        const child = railRow(rail({ groups: HOLDING }), 'api')
        const corner = (side: 'l' | 'r') => {
            const found = new RegExp(`(?:^|\\s)rounded-${side}-(\\w+)(?:\\s|$)`).exec(classesOf(row))?.[1]
            return found === undefined ? undefined : `radius-${found}`
        }
        return [
            ...pads,
            ...layoutChecks('rail', {
                width: () => numberIn(RAIL, /defaultSize = (\d+),/),
                minWidth: () => numberIn(RAIL, /minSize = (\d+),/),
                maxWidth: () => numberIn(RAIL, /maxSize = (\d+),/),
                collapsedWidth: () => {
                    const found = /'w-\[calc\(([\d.]+)rem\+(\d+)px\)\]'/.exec(RAIL)
                    return found === null ? undefined : String(Number(found[1]) * 16 + Number(found[2]))
                },
                groupPadX: () => lengthOn(nav, READ.padX),
                entryGap: () => lengthOn(nav, READ.gap),
                groupTitleTop: () => lengthOn(title, lengthOf('pt-')),
                groupTitleBottom: () => lengthOn(title, lengthOf('pb-')),
                groupTitleLine: () => {
                    // The collapsed rule's line is the title's: text-xs's line height.
                    const line = /h-\(--text-xs--line-height\) w-full items-center/.test(RAIL) ? TEXT.get('xs')?.leading : undefined
                    return line === undefined ? undefined : String(Number(/^([\d.]+)rem$/.exec(line)?.[1]) * 16)
                },
                untitledTop: () =>
                    lengthOn(
                        rail({ groups: DESCRIBED }).find((element) => element.tag === 'nav'),
                        lengthOf('pt-'),
                    ),
                placesBottom: () =>
                    lengthOn(
                        expanded.find((element) => element.attrs['data-rail-places'] !== undefined),
                        lengthOf('pb-'),
                    ),
                entryCornerStart: () => corner('l'),
                entryCornerEnd: () => corner('r'),
                activeBar: () => /(?:^|\s)border-l-(\d+)(?:\s|$)/.exec(classesOf(row))?.[1],
                childInsetIcon: () => lengthOn(child, READ.padStart),
                childInsetText: () => numberIn(RAIL, /inset === 'icon' \? 'pl-[\d.]+' : 'pl-([\d.]+)'/, 'step'),
                cornerCount: () =>
                    lengthOn(
                        collapsed.find((element) => element.attrs['data-tone'] !== undefined),
                        READ.height,
                    ),
                unreadDot: () =>
                    lengthOn(
                        expanded.find((element) => element.attrs.role === 'img'),
                        READ.square,
                    ),
                resizeStep: () => numberIn(RESIZE_HANDLE, /event\.key === forward\) step\((\d+)\)/),
                edgeLine: () =>
                    lengthOn(
                        expanded.find((element) => element.parent?.attrs.role === 'separator'),
                        READ.width,
                    ),
                flyoutMinWidth: () => numberIn(RAIL, /className="w-auto min-w-(\d+) /, 'step'),
                flyoutGap: () => numberIn(RAIL, /function RailFlyout[\s\S]*?sideOffset=\{(\d+)\}/),
                tooltipGap: () => numberIn(RAIL, /function Tip[\s\S]*?sideOffset=\{(\d+)\}/),
                stripGap: () =>
                    lengthOn(
                        strip.find((element) => element.tag === 'nav'),
                        READ.gap,
                    ),
                stripLabel: () => {
                    const size = /["']max-w-full truncate px-0\.5 text-(2xs)["']/.exec(RAIL)?.[1]
                    const rem = size === undefined ? undefined : /^([\d.]+)rem$/.exec(TEXT.get(size)?.size ?? '')?.[1]
                    return rem === undefined ? undefined : String(Number(rem) * 16)
                },
                trafficLights: () => (/ps-\(--spacing-traffic-lights\)/.test(RAIL) ? 'spacing-traffic-lights' : undefined),
                widthEase: () => durationIn(RAIL, /transition-\[width\] duration-(\w+)/),
            }),
        ]
    },
}

// Top bar

const TOP_BAR = source('components/TopBar.tsx')
const CRUMBS = [{ label: 'harbor', href: '#/harbor' }, { label: 'Runs', href: '#/runs' }, { label: 'Run 1842' }]
const NEW = createElement('button', { type: 'button' }, 'New')
const FIELD_GIVEN = createElement('input', { 'aria-label': 'Find a run' })

const topBar = (props: Partial<TopBarProps> = {}) =>
    draw(TopBar, { trail: CRUMBS, onSearch: () => undefined, shortcut: 'Ctrl K', actions: NEW, ...props })
/** The top bar in a shell, as an app draws it: in the shell's bar, under the frame's ink. */
const shell = (props: Partial<ShellProps> = {}) => draw(Shell, { rail: null, children: 'Run 1842', ...props })
const framedBar = (props: Partial<TopBarProps> = {}) =>
    shell({ top: createElement(TopBar, { trail: CRUMBS, onSearch: () => undefined, ...props }) })
const BARS = once(() => ({ bar: topBar(), framed: framedBar() }))
const paletteButton = (elements: El[], word: string) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === word)
const menuButton = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === SHELL_WORDS.menu)

const TOP_BAR_ADAPTER: Adapter = {
    wordObjects: { TOP_BAR_WORDS },
    complete: ['TOP_BAR_WORDS'],
    words: { search: 'TOP_BAR_WORDS.search', palette: 'TOP_BAR_WORDS.palette', trail: 'TOP_BAR_WORDS.trail' },
    options: { trailEnds: propValues(TOP_BAR, 'TopBarProps', 'trailEnds') },
    size: (size, key) => {
        const { bar, framed } = BARS()
        const beside = topBar({ search: FIELD_GIVEN })
        const drawn: Record<string, [El[], El | undefined, string[]?]> = {
            bar: [framed, framed.find((element) => element.tag === 'header')],
            content: [bar, bar[0]],
            menu: [framed, menuButton(framed)],
            mark: [
                topBar({ mark: 'T' }),
                topBar({ mark: 'T' }).find((element) => element.tag === 'span' && classesOf(element).includes('size-7')),
            ],
            search: [beside, beside.find((element) => element.tag === 'div' && classesOf(element).includes('w-56'))],
            trail: [bar, bar.find((element) => element.tag === 'ol')],
            chevron: [bar, bar.find((element) => element.tag === 'li' && element.attrs['aria-hidden'] !== undefined)],
            backChevron: [
                [],
                topBar({ trailEnds: 'ancestor', trail: CRUMBS.slice(0, 2) }).find(
                    (element) => element.tag === 'svg' && classesOf(element).includes('md:hidden'),
                ),
            ],
            // From md the button is 224 wide with no field beside it, and as wide as its keys beside one.
            palette: [bar, paletteButton(bar, TOP_BAR_WORDS.search), key === 'width' ? ['md'] : []],
            paletteBesideField: [beside, paletteButton(beside, TOP_BAR_WORDS.palette), ['md']],
            keys: [bar, bar.find((element) => element.attrs['data-slot'] === 'kbd')],
            actions: [bar, bar.find((element) => element.tag === 'div' && classesOf(element).includes('gap-1.5'))],
        }
        const [elements, element, on = []] = drawn[size] ?? [[], undefined]
        if (key === 'icon') return size === 'backChevron' ? pieceWhere(element) : pieceWhere(iconOf(elements, element))
        return element === undefined ? undefined : { ...pieceWhere(element), layers: [classesOf(element)], on }
    },
    paint: (_, name, state) => {
        const { bar, framed } = BARS()
        switch (name) {
            case 'bar':
                return at(
                    framed.find((element) => element.tag === 'header'),
                    state,
                )
            case 'menu':
                return at(menuButton(framed), state)
            case 'mark':
                return at(
                    topBar({ mark: 'T' }).find((element) => element.tag === 'span' && classesOf(element).includes('size-7')),
                    state,
                )
            case 'crumb':
                if (state === 'current') return at(framed.find((element) => element.attrs['aria-current'] === 'page'))
                return at(byText(framed, 'a', 'harbor'), state)
            case 'chevron':
                return at(
                    framed.find((element) => element.tag === 'svg' && element.parent?.tag === 'li'),
                    state,
                )
            case 'backChevron':
                return at(
                    topBar({ trailEnds: 'ancestor', trail: CRUMBS.slice(0, 2) }).find(
                        (element) => element.tag === 'svg' && classesOf(element).includes('md:hidden'),
                    ),
                    state,
                )
            case 'palette':
                return at(paletteButton(bar, TOP_BAR_WORDS.search), state)
            case 'keys':
                return at(
                    bar.find((element) => element.attrs['data-slot'] === 'kbd'),
                    state,
                )
            default:
                return undefined
        }
    },
    effect: () => skip('the top bar states no effects'),
    keys: {
        Tab: () => {
            const elements = framedBar({ search: FIELD_GIVEN, actions: NEW })
            const order = [
                menuButton(elements),
                elements.find((element) => element.tag === 'input'),
                byText(elements, 'a', 'harbor'),
                paletteButton(elements, TOP_BAR_WORDS.palette),
                byText(elements, 'button', 'New'),
            ].map((element) => (element === undefined ? -1 : elements.indexOf(element)))
            return order.every((place, index) => place >= 0 && (index === 0 || place > order[index - 1]))
                ? true
                : `drawn in another order: ${order.join(', ')}`
        },
        '/ (a search field that binds it, focus outside a field)': () =>
            /key: '\/'/.test(source('components/SearchField.tsx')) ? true : 'the search field is not focused by /',
        "Enter, Space (the palette's button has focus)": () =>
            paletteButton(topBar(), TOP_BAR_WORDS.search)?.attrs.type === 'button' ? true : "the palette's button is not a native button",
    },
    more: () => {
        const shellSource = source('components/Shell.tsx')
        const beside = topBar({ search: FIELD_GIVEN })
        const field = beside.find((element) => element.tag === 'div' && classesOf(element).includes('w-56'))
        return layoutChecks('top-bar', {
            searchWidthLg: () => (field === undefined ? undefined : resolve([classesOf(field)], ['lg'], READ.width)),
            searchWidthMax: () => lengthOn(field, lengthOf('max-w-')),
            panelToggleRoom: () => numberIn(shellSource, /!stripping && 'pr-(\d+)'/, 'step'),
            trafficLights: () =>
                /lights && 'ps-\(--spacing-traffic-lights\)/.test(source('components/AppBar.tsx')) ? 'spacing-traffic-lights' : undefined,
            // The phone query stands one px under the md breakpoint, which tokens.json defines for both the classes and the script.
            phoneBelow: () =>
                /MOBILE_QUERY = `\(max-width: \$\{String\(BREAKPOINTS\.md - 1\)\}px\)`/.test(source('hooks/use-mobile.ts')) &&
                /max-md:hidden/.test(TOP_BAR)
                    ? 'breakpoint-md'
                    : undefined,
        })
    },
}

// Status line

const STATUS_LINE = source('components/StatusLine.tsx')
const FACTS = [
    createElement(StatusItem, { key: 'run', label: 'run', code: true, children: 'run_01JCF8Q2' }),
    createElement(StatusItem, { key: 'step', children: 'step 3 of 5' }),
]
const statusLine = (props: Partial<StatusLineProps> = {}) =>
    draw(StatusLine, { note: 'import-orders is running', children: FACTS, ...props })
const STATUS_TONES: Record<string, StatusLineProps['tone']> = { rest: 'quiet', toneLive: 'live', toneWarn: 'warn', toneError: 'error' }

const STATUS_LINE_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: { tone: propValues(STATUS_LINE, 'StatusLineProps', 'tone') },
    size: (size) => {
        const line = statusLine({ live: true })
        const drawn: Record<string, El | undefined> = {
            strip: line[0],
            note: line.find((element) => element.parent === line[0] && element.tag === 'span'),
            liveDot: line.find((element) => classesOf(element).includes('bg-current') && classesOf(element).includes('relative')),
            facts: line.find((element) => classesOf(element).includes('max-w-[70%]')),
            item: line.find((element) => element.tag === 'span' && classesOf(element).includes('gap-1.5')),
        }
        return pieceWhere(drawn[size])
    },
    paint: (_, name, state) => {
        const line = statusLine()
        switch (name) {
            case 'strip':
                return at(line[0])
            case 'note': {
                const toned = statusLine({ tone: STATUS_TONES[state] })
                return at(toned.find((element) => element.parent === toned[0] && element.tag === 'span'))
            }
            case 'liveDot':
                return at(
                    statusLine({ live: state === 'live' }).find(
                        (element) => classesOf(element).includes('bg-current') && classesOf(element).includes('relative'),
                    ),
                )
            case 'facts':
                return at(line.find((element) => classesOf(element).includes('max-w-[70%]')))
            case 'item': {
                const value = state === 'code' ? 'run_01JCF8Q2' : 'step 3 of 5'
                return at(line.find((element) => element.text === value && classesOf(element).includes('truncate')))
            }
            case 'itemLabel':
                return at(byText(line, 'span', 'run'))
            default:
                return undefined
        }
    },
    effect: () => skip('the status line states no effects'),
    keys: {},
}

// Page header

const PAGE_HEADER = source('components/PageHeader.tsx')
const RUN = createElement('button', { type: 'button' }, 'Run')
const header = (props: Partial<PageHeaderProps> = {}) =>
    draw(PageHeader, {
        title: 'Nightly export',
        code: 'nightly-export',
        count: '5 jobs',
        description: "Exports the day's orders from harbor to the archive.",
        meta: 'Owned by grace',
        trail: [{ label: 'Jobs', href: '#/jobs' }],
        onBack: () => undefined,
        actions: RUN,
        ...props,
    })
/** The drawings most checks read, each made once: every line of the title block, and the same with an aside. */
const HEADERS = once(() => ({ full: header(), aside: header({ aside: 'L' }) }))
const headerRow = (elements: El[]) => elements.find((element) => classesOf(element).includes('justify-between'))
const titleBlock = (elements: El[]) => {
    const row = headerRow(elements)
    return row === undefined ? undefined : elements.find((element) => element.parent === row)
}
const backButton = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === PAGE_HEADER_WORDS.back)
const crumbLink = (elements: El[]) => elements.find((element) => element.tag === 'a' && element.parent?.tag === 'li')
const headerTitle = (elements: El[]) => elements.find((element) => element.tag === 'h1')
const headerCode = (elements: El[]) => elements.find((element) => element.tag === 'p' && element.attrs.title === 'nightly-export')
const headerDescription = (elements: El[]) => elements.find((element) => classesOf(element).includes('max-w-prose'))
const headerMeta = (elements: El[]) => byText(elements, 'div', 'Owned by grace')

const PAGE_HEADER_ADAPTER: Adapter = {
    wordObjects: { PAGE_HEADER_WORDS },
    complete: ['PAGE_HEADER_WORDS'],
    words: {
        back: 'PAGE_HEADER_WORDS.back',
        trail: 'PAGE_HEADER_WORDS.trail',
        more: 'PAGE_HEADER_WORDS.more',
        moreWays: 'PAGE_HEADER_WORDS.moreWays',
    },
    options: {},
    size: (size) => {
        const { full, aside } = HEADERS()
        const drawn: Record<string, El | undefined> = {
            header: headerRow(full),
            titleRow: headerTitle(full)?.parent,
            back: backButton(full),
            aside: titleBlock(aside),
            trail: full.find((element) => element.tag === 'ol'),
            chevron: full.find((element) => element.tag === 'svg' && element.parent?.tag === 'li'),
            meta: headerMeta(full),
            actions: full.find((element) => element.attrs['data-slot'] === 'page-header-actions'),
        }
        // The back button sizes its icon from its own classes, as every button does; the chevron has a size of its own.
        return pieceWhere(drawn[size])
    },
    paint: (_, name, state) => {
        const { full } = HEADERS()
        const drawn: Record<string, El | undefined> = {
            title: headerTitle(full),
            count: full.find((element) => classesOf(element).includes('tabular-nums')),
            code: headerCode(full),
            description: headerDescription(full),
            meta: headerMeta(full),
            crumb: crumbLink(full),
            chevron: full.find((element) => element.tag === 'svg' && element.parent?.tag === 'li'),
            back: backButton(full),
        }
        return name in drawn ? at(drawn[name], state) : undefined
    },
    effect: () => skip('the page header states no effects'),
    keys: {
        Tab: () => {
            const elements = header()
            const order = [backButton(elements), crumbLink(elements), byText(elements, 'button', 'Run')]
            const places = order.map((element) => (element === undefined ? -1 : elements.indexOf(element)))
            const reached =
                order.every(focusable) && places.every((place, index) => place >= 0 && (index === 0 || place > places[index - 1]))
            return reached ? true : `drawn in another order, or out of the tab order: ${places.join(', ')}`
        },
        'Enter, Space (the back button has focus)': () =>
            backButton(header())?.attrs.type === 'button' ? true : 'the back button is not a native button',
    },
    more: () => {
        const { full } = HEADERS()
        // The container sizes the header's queries name are Tailwind's own.
        const containers = readFileSync(join(ROOT, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8')
        const lg = /--container-lg: ([\d.]+)rem;/.exec(containers)?.[1]
        return layoutChecks('page-header', {
            rowGap: () => lengthOn(headerRow(full), lengthOf('gap-y-')),
            descriptionTop: () => lengthOn(headerDescription(full), lengthOf('mt-')),
            metaTop: () => lengthOn(headerMeta(full), lengthOf('mt-')),
            metaRowGap: () => lengthOn(headerMeta(full), lengthOf('gap-y-')),
            fillFrom: () => (/@lg\/page-header:flex-nowrap/.test(PAGE_HEADER) && lg !== undefined ? String(Number(lg) * 16) : undefined),
            actionsMin: () => numberIn(PAGE_HEADER, /flex-\[1_1_(\d+)rem\] items-center justify-end/, 'rem'),
            titleMin: () => numberIn(PAGE_HEADER, /@lg\/page-header:min-w-(\d+)/, 'step'),
            describedTitleBasis: () => numberIn(PAGE_HEADER, /'flex-\[1_1_(\d+)rem\]'/, 'rem'),
        })
    },
}

// Section

const SECTION = source('components/Section.tsx')
const section = (props: Partial<SectionProps> = {}) => draw(Section, { title: 'Steps', children: 'fetch, transform, validate', ...props })
/** The drawings the checks read, each made once. */
const SECTIONS = once(() => ({
    boxed: section({ meta: '5', actions: RUN }),
    described: section({ description: 'What runs, in order' }),
    critical: section({ tone: 'critical' }),
    graph: section({ tone: 'graph' }),
    flat: section({ variant: 'flat', meta: '5' }),
    flatCritical: section({ variant: 'flat', tone: 'critical' }),
}))
const sectionBox = (elements: El[]) => elements.find((element) => element.tag === 'section')
const sectionHead = (elements: El[]) => elements.find((element) => element.tag === 'header')
const sectionTitle = (elements: El[]) => elements.find((element) => element.tag === 'h2')
const sectionBody = (elements: El[]) => elements.find((element) => element.tag === 'div' && element.parent?.tag === 'section')

const SECTION_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: { variant: propValues(SECTION, 'SectionProps', 'variant'), tone: propValues(SECTION, 'SectionProps', 'tone') },
    size: (size) => {
        const { boxed, described, critical, flat } = SECTIONS()
        const drawn: Record<string, El | undefined> = {
            head: sectionHead(boxed),
            describedHead: sectionHead(described),
            flatHead: sectionHead(flat),
            titleLine: sectionTitle(boxed)?.parent?.parent,
            mark: critical.find((element) => element.tag === 'svg'),
            actions: boxed.find((element) => classesOf(element).includes('ml-auto')),
            body: sectionBody(boxed),
        }
        return pieceWhere(drawn[size])
    },
    paint: (_, name, state) => {
        const { boxed, described, critical, graph, flat, flatCritical } = SECTIONS()
        const toned = state === 'toneCritical'
        switch (name) {
            case 'box':
                return at(sectionBox(toned ? critical : boxed))
            case 'head':
                return at(sectionHead(boxed))
            case 'flatHead':
                return at(sectionHead(toned ? flatCritical : flat))
            case 'mark':
                return at(critical.find((element) => element.tag === 'svg'))
            case 'title':
                return at(sectionTitle(boxed))
            case 'flatTitle':
                return at(sectionTitle(flat))
            case 'meta':
                return at(byText(boxed, 'span', '5'))
            case 'description':
                return at(byText(described, 'p', 'What runs, in order'))
            case 'body': {
                const body = sectionBody(graph)
                if (body === undefined) return undefined
                // The dots are a gradient of a color the classes name with var(): read as the mark's ink.
                const dot = /radial-gradient\(circle,var\(--([a-z0-9-]+)\)/.exec(classesOf(body))?.[1]
                const where = at(body)
                return where === undefined ? undefined : { ...where, mark: dot === undefined ? undefined : `text-(--${dot})` }
            }
            default:
                return undefined
        }
    },
    effect: () => skip('the section states no effects'),
    keys: {},
    more: () => {
        const { boxed, critical, flat } = SECTIONS()
        const title = sectionTitle(boxed)
        return layoutChecks('section', {
            flatGap: () => lengthOn(sectionBox(flat), READ.gap),
            titleMetaGap: () => lengthOn(title?.parent, READ.gapX),
            titleBasis: () => lengthOn(title?.parent?.parent, lengthOf('basis-')),
            metaBasis: () => lengthOn(title, lengthOf('basis-')),
            criticalRule: () => /(?:^|\s)border-t-(\d+)(?:\s|$)/.exec(classesOf(sectionBox(critical)))?.[1],
            graphGrid: () => numberIn(SECTION, /bg-\[length:(\d+)px_\d+px\]/),
            graphDot: () => numberIn(SECTION, /var\(--panel-dot\)_(\d+)px/),
        })
    },
}

// Page state

const PAGE_STATE = source('components/PageState.tsx')
const pageState = (props: Partial<PageStateProps> = {}) => draw(PageState, { loading: false, children: 'content', ...props })
const REFUSAL: Partial<PageStateProps> = {
    status: 403,
    error: 'The token for `api` may read `orders` but not `invoices`.',
    problems: ['`owner` is not a field of a run'],
    onRetry: () => undefined,
}
/** The drawing a state (or states joined by +) takes: unframed alone is drawn as an unframed empty read. */
function stateDrawn(state: string): El[] {
    const on = new Set(state.split('+'))
    const frame = on.has('unframed') ? { frame: false } : {}
    if (on.has('loading')) return pageState({ loading: true, ...frame })
    if (on.has('failed')) return pageState({ ...REFUSAL, ...(on.has('warning') ? { tone: 'warning' as const } : {}), ...frame })
    return pageState({ empty: true, emptyMessage: 'No runs in the last 24 hours.', ...frame })
}
const stateFrame = (elements: El[]) => elements.find((element) => element.attrs['data-slot'] === 'page-state')
/** The lines under a failed read's heading, announced together. */
const stateLines = (elements: El[]) => elements.find((element) => element.attrs.role === 'alert' || element.attrs.role === 'status')
const retryButton = (elements: El[]) => elements.find((element) => element.tag === 'button' && element.text === PAGE_STATE_WORDS.retry)

const PAGE_STATE_ADAPTER: Adapter = {
    wordObjects: { PAGE_STATE_WORDS },
    complete: ['PAGE_STATE_WORDS'],
    words: {
        loading: 'PAGE_STATE_WORDS.loading',
        refused: 'PAGE_STATE_WORDS.refused',
        missing: 'PAGE_STATE_WORDS.missing',
        unreachable: 'PAGE_STATE_WORDS.unreachable',
        partRefused: 'PAGE_STATE_WORDS.partRefused',
        retry: 'PAGE_STATE_WORDS.retry',
    },
    options: {
        tone: propValues(PAGE_STATE, 'PageStateProps', 'tone'),
        headingLevel: propValues(PAGE_STATE, 'PageStateProps', 'headingLevel'),
    },
    size: (size) => {
        const loading = stateDrawn('loading')
        const failed = stateDrawn('failed')
        const drawn: Record<string, El | undefined> = {
            frame: stateFrame(loading),
            unframed: stateFrame(stateDrawn('failed+unframed')),
            spinner: loading.find((element) => element.tag === 'svg'),
            mark: failed.find((element) => element.tag === 'svg' && element.parent === stateFrame(failed)),
            lines: stateLines(failed),
            column: stateLines(failed)?.parent,
            code: failed.find((element) => element.tag === 'code'),
            retry: retryButton(failed),
        }
        return pieceWhere(drawn[size])
    },
    paint: (_, name, state) => {
        const elements = stateDrawn(state)
        const frame = stateFrame(elements)
        switch (name) {
            case 'frame':
                return at(frame)
            case 'spinner':
                return at(elements.find((element) => element.tag === 'svg'))
            case 'mark':
                return at(elements.find((element) => element.tag === 'svg' && element.parent === frame))
            case 'heading': {
                // The heading takes its size from the frame around it and its weight from its own class.
                const heading = elements.find((element) => element.parent !== undefined && element.parent === stateLines(elements))
                return heading === undefined || frame === undefined
                    ? undefined
                    : { layers: [classesOf(frame), classesOf(heading)], on: [], around: ancestors(heading) }
            }
            case 'diagnostic':
                return at(elements.find((element) => element.tag === 'div' && element.parent === stateLines(elements)))
            case 'code':
                return at(elements.find((element) => element.tag === 'code'))
            case 'problems':
                return at(elements.find((element) => element.attrs['data-slot'] === 'page-state-problems'))
            default:
                return undefined
        }
    },
    effect: () => skip('the page state states no effects'),
    keys: {
        'Tab (failed, with onRetry)': () => (focusable(retryButton(stateDrawn('failed'))) ? true : 'Try again is out of the tab order'),
        'Enter, Space (Try again has focus)': () =>
            retryButton(stateDrawn('failed'))?.attrs.type === 'button' ? true : 'Try again is not a native button',
    },
    more: () => {
        const failed = stateDrawn('failed')
        return layoutChecks('page-state', {
            markTop: () =>
                lengthOn(
                    failed.find((element) => element.tag === 'svg' && element.parent === stateFrame(failed)),
                    lengthOf('mt-'),
                ),
            problemsInset: () =>
                lengthOn(
                    failed.find((element) => element.attrs['data-slot'] === 'page-state-problems'),
                    READ.padStart,
                ),
        })
    },
}

// What the overlays share: Base UI's positions, and what a source says of a prop's default

/** Base UI's sides and alignments, which the popups' side and align take as they are. */
const ANCHORING = readFileSync(
    join(ROOT, 'packages', 'core', 'node_modules', '@base-ui', 'react', 'internals', 'useAnchorPositioning.d.ts'),
    'utf8',
)
const anchorValues = (type: 'Side' | 'Align') =>
    [...(new RegExp(`export type ${type} = ([^\\n]+)`).exec(ANCHORING)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1])
/** The values a popup's props take from Base UI's positioner, when the popup passes that prop on. */
const positionValues = (text: string, props: string, prop: 'side' | 'align') =>
    new RegExp(`export type ${props} =[^\\n]*\\n[^\\n]*Pick<[^>]*'${prop}'`).test(text)
        ? anchorValues(prop === 'side' ? 'Side' : 'Align')
        : []
/** The default a function's destructured prop takes, as its source writes it: the first one after the anchor. */
const defaultIn = (text: string, anchor: string, prop: string) =>
    new RegExp(`\\b${prop} = '?([\\w-]+)'?,`).exec(text.slice(Math.max(0, text.indexOf(anchor))))?.[1]
/** A focus put back on the trigger after a keyboard close, which the popup's source asks of Base UI. */
const focusBack = (text: string) =>
    /finalFocus=\{returnFocusOnKeyboard\}/.test(text) ? true : 'no finalFocus={returnFocusOnKeyboard}: focus is not put back on the trigger'
const BASE_UI = (part: string, does: string) => skip(`Base UI's ${part} ${does} in a browser; the server draws its popup closed`)

// Select

const SELECT = source('components/ui/select.tsx')
const SELECT_FIELD = source('components/SelectField.tsx')
const RUN_STATES = [
    { value: 'succeeded', label: 'succeeded' },
    { value: 'failed', label: 'failed' },
]
/** A bare select as the server draws it: its trigger, and a hidden input; the list is a portal it leaves out. */
const select = (trigger: Partial<SelectTriggerProps> = {}, root: { disabled?: boolean } = {}) =>
    draw(
        Select as ComponentType<object>,
        { items: RUN_STATES, defaultValue: 'failed', ...root },
        createElement(SelectTrigger, { 'aria-label': 'Run state', ...trigger }, createElement(SelectValue, { placeholder: 'Any state' })),
        createElement(SelectContent, null, createElement(SelectItem, { value: 'failed' }, 'failed')),
    )
const selectTrigger = (elements: El[]) => elements.find((element) => element.attrs['data-slot'] === 'select-trigger')
/** A field whose options lead with icons: the trigger draws the chosen one's lead as the list does. */
const selectField = (props: Partial<SelectFieldProps> = {}) =>
    draw(SelectField, {
        id: 'runs-on',
        label: 'Runs on',
        options: [
            { value: 'api', label: 'api', icon: createElement(Server) },
            { value: 'worker', label: 'worker', icon: createElement(Workflow) },
        ],
        defaultValue: 'worker',
        ...props,
    })
const optionLead = (elements: El[]) =>
    elements.find(
        (element) => element.tag === 'span' && 'aria-hidden' in element.attrs && classesOf(element).includes('text-muted-foreground'),
    )
/** A theme picker whose themes wear swatches, one of them none: its theme select draws the chosen one's swatch in the trigger. */
const themePicker = (theme: string) =>
    draw(ThemePicker, {
        value: { theme, scheme: 'light', density: 'regular', corners: 'theme', typeface: 'theme' },
        onChange: () => undefined,
        themes: [
            { value: 'tidevann', label: 'Tidevann', swatch: true },
            { value: 'plain', label: 'Plain' },
        ],
    } satisfies ThemePickerProps)
const swatchOf = (elements: El[]) =>
    elements.find((element) => element.tag === 'span' && 'aria-hidden' in element.attrs && classesOf(element).includes('w-7'))
/** The list's parts, which open in a portal no server drawing reaches: their classes are read from the source. */
const SELECT_LIST = {
    list: literalAfter(SELECT, 'data-slot="select-content"', 'className={cn('),
    row: literalAfter(SELECT, 'data-slot="select-item"', 'className={cn('),
    label: literalAfter(SELECT, '<SelectPrimitive.ItemText className={cn('),
    detailEnd: literalAfter(SELECT, '!below && <span className='),
    detailBelow: literalAfter(SELECT, 'data-slot="select-item-lines"', '<div className='),
    check: literalAfter(SELECT, '<SelectPrimitive.ItemIndicator', 'className='),
    group: literalAfter(SELECT, 'data-slot="select-group"', 'cn('),
    groupLabel: literalAfter(SELECT, 'data-slot="select-label"', 'cn('),
    separator: literalAfter(SELECT, 'data-slot="select-separator"', 'cn('),
    scrollArrow: literalAfter(SELECT, 'data-slot="select-scroll-up-button"', 'cn('),
}
/** The variants a trigger's state turns on. */
const SELECT_ON: Record<string, string[]> = {
    rest: [],
    placeholder: ['data-placeholder'],
    hover: ['hover'],
    focus: ['focus-visible'],
    open: ['data-popup-open'],
    invalid: ['aria-invalid'],
    'invalid+focus': ['aria-invalid', 'focus-visible'],
}
/** What a highlighted row turns on for itself and, past its own ink, for every element inside it. */
const HIGHLIGHTED = ['focus', '**', 'not-data-[variant=destructive]']
const rowOn = (state: string) => (state === 'highlighted' ? HIGHLIGHTED : state === 'disabled' ? ['data-disabled'] : [])

const SELECT_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        variant: propValues(SELECT, 'SelectTriggerProps', 'variant'),
        size: propValues(SELECT, 'SelectTriggerProps', 'size'),
        detailPlacement: propValues(SELECT_FIELD, 'SelectFieldProps', 'detailPlacement'),
    },
    size: (size) => {
        if (size === 'default' || size === 'sm') {
            const trigger = selectTrigger(select(size === 'sm' ? { size: 'sm' } : {}))
            return trigger === undefined
                ? undefined
                : { layers: [classesOf(trigger)], on: [`data-[size=${size}]`], around: ancestors(trigger) }
        }
        if (size === 'lead') {
            const lead = optionLead(selectField())
            return lead === undefined ? undefined : { layers: [classesOf(lead)], on: ['[&_svg]'] }
        }
        if (size === 'swatch') return pieceWhere(swatchOf(themePicker('tidevann')))
        const read: Record<string, string> = {
            row: SELECT_LIST.row,
            detail: SELECT_LIST.detailEnd,
            check: SELECT_LIST.check,
            group: SELECT_LIST.group,
            groupLabel: SELECT_LIST.groupLabel,
            scrollArrow: SELECT_LIST.scrollArrow,
        }
        return size in read ? { layers: [read[size]], on: [] } : undefined
    },
    paint: (group, name, state) => {
        if (group === 'variants') {
            const on = SELECT_ON[state]
            if (on === undefined) return skip(`no way to reach ${state} on a trigger`)
            const trigger = selectTrigger(select({ variant: name as SelectTriggerProps['variant'] }))
            return trigger === undefined ? undefined : { layers: [classesOf(trigger)], on, around: ancestors(trigger) }
        }
        switch (name) {
            case 'chevron':
                return at(select().find((element) => element.tag === 'svg'))
            case 'lead': {
                const lead = optionLead(selectField())
                return lead === undefined ? undefined : { layers: [SELECT_LIST.row, classesOf(lead)], on: rowOn(state) }
            }
            case 'swatch':
                return at(swatchOf(themePicker(state === 'noTheme' ? 'plain' : 'tidevann')))
            case 'detail':
                return { layers: [SELECT_LIST.row, SELECT_LIST.detailEnd], on: rowOn(state) }
            case 'list':
                return { layers: [POPUP_LOOK, SELECT_LIST.list], on: [] }
            case 'row':
            case 'groupLabel':
            case 'separator':
            case 'scrollArrow':
                return { layers: [SELECT_LIST[name]], on: rowOn(state) }
            default:
                return undefined
        }
    },
    effect: (state) => {
        if (state !== 'disabled') return skip(`no effect of ${state} on a trigger`)
        const trigger = selectTrigger(select({}, { disabled: true }))
        return trigger === undefined
            ? undefined
            : { layers: [classesOf(trigger)], on: ['disabled'], around: ancestors(trigger), focusable: focusable(trigger) }
    },
    keys: {
        Tab: () =>
            focusable(selectTrigger(select())) && !focusable(selectTrigger(select({}, { disabled: true })))
                ? true
                : 'the trigger is out of the tab order, or a disabled one in it',
        'Enter, Space, ArrowDown, ArrowUp (the trigger has focus)': () => {
            const trigger = selectTrigger(select())
            return trigger?.tag === 'button' && trigger.attrs.role === 'combobox' && trigger.attrs['aria-haspopup'] === 'listbox'
                ? true
                : "the trigger is not Base UI's combobox button"
        },
        'a character (the trigger has focus and the list is closed)': BASE_UI('select', 'chooses by typing on its closed trigger'),
        'ArrowDown, ArrowUp (the list is open)': BASE_UI('select', 'moves the highlight'),
        'Home, End (the list is open)': BASE_UI('select', 'moves the highlight to the ends'),
        'a character (the list is open)': BASE_UI('select', 'moves the highlight by typing'),
        'Enter, Space (a row is highlighted)': () => focusBack(SELECT),
        'Escape (the list is open)': () => focusBack(SELECT),
    },
    more: () => {
        const trigger = selectTrigger(select())
        const quiet = selectTrigger(select({ variant: 'quiet' }))
        const swatch = swatchOf(themePicker('tidevann'))
        const on = (classes: string, read: Reader) => resolve([classes], [], read)
        // A field's options led by a theme's swatch draw the theme picker's part, in that theme.
        const fieldSwatch = swatchOf(
            selectField({
                options: [
                    { value: 'workspace', label: 'As the workspace' },
                    { value: 'paper', label: 'Paper', swatch: 'paper' },
                ],
                defaultValue: 'paper',
            }),
        )
        return [
            // The list's note: elevation-pop under it, as under every popup.
            check('pieces.list.rest.elevation', 'elevation-pop', elevationOf([POPUP_LOOK, SELECT_LIST.list])),
            check(
                'options.swatch (SelectField)',
                "the theme picker's swatch, in that theme",
                fieldSwatch?.attrs['data-theme-scope'] === 'paper' && classesOf(fieldSwatch) === classesOf(swatch)
                    ? "the theme picker's swatch, in that theme"
                    : undefined,
            ),
            check('options.variant.default', 'field', defaultIn(SELECT, 'function SelectTrigger(', 'variant')),
            check('options.size.default', 'default', defaultIn(SELECT, 'function SelectTrigger(', 'size')),
            check('options.alignItemWithTrigger.default', 'true', defaultIn(SELECT, 'function SelectContent(', 'alignItemWithTrigger')),
            check('options.detailPlacement.default', 'end', defaultIn(SELECT_FIELD, 'export function SelectField(', 'detailPlacement')),
            ...layoutChecks('select', {
                triggerPadStart: () => lengthOn(trigger, READ.padStart),
                triggerPadEnd: () => lengthOn(trigger, READ.padEnd),
                quietPadStart: () => lengthOn(quiet, READ.padStart),
                quietPadEnd: () => lengthOn(quiet, READ.padEnd),
                listGap: () => numberIn(SELECT, /function SelectContent[\s\S]*?sideOffset = (\d+),/),
                listMinWidth: () => numberIn(SELECT_LIST.list, /w-\(--anchor-width\) min-w-(\d+) /, 'step'),
                listInset: () => on(SELECT_LIST.list, READ.pad) ?? on(SELECT_LIST.list, READ.padX) ?? '0',
                rowPadStart: () => on(SELECT_LIST.row, READ.padStart),
                rowPadEnd: () => on(SELECT_LIST.row, READ.padEnd),
                checkEnd: () => on(SELECT_LIST.check, lengthOf('right-')),
                leadGap: () => {
                    // In the list the label's own gap, in the trigger the value's, which the trigger gives it.
                    const list = on(SELECT_LIST.label, READ.gap)
                    const value = resolve([classesOf(trigger)], ['*', 'data-[slot=select-value]'], READ.gap)
                    return list === value ? list : `${String(list)} in the list, ${String(value)} in the trigger`
                },
                detailGap: () => on(SELECT_LIST.detailEnd, READ.padStart),
                separatorGap: () => on(SELECT_LIST.separator, lengthOf('my-')),
                swatchGap: () => lengthOn(swatch?.parent, READ.gap),
                swatchDot: () =>
                    lengthOn(
                        themePicker('tidevann').find(
                            (element) => element.parent !== undefined && classesOf(element.parent).includes('w-7'),
                        ),
                        READ.square,
                    ),
                listEase: () => durationIn(SELECT_LIST.list, /duration-(\w+)/),
            }),
        ]
    },
}

// Tooltip

const TOOLTIP = source('components/ui/tooltip.tsx')
/** The box and its arrow open in a portal no server drawing reaches: their classes are read from the source. */
const TOOLTIP_BOX = literalAfter(TOOLTIP, 'data-slot="tooltip-content"', 'className={cn(')
const TOOLTIP_ARROW = literalAfter(TOOLTIP, '<TooltipPrimitive.Arrow className=')
const tooltipTrigger = () =>
    draw(
        TooltipProvider,
        {},
        createElement(
            Tooltip,
            null,
            createElement(TooltipTrigger, null, 'Run'),
            createElement(TooltipContent, null, 'Run import-orders now'),
        ),
    ).find((element) => element.attrs['data-slot'] === 'tooltip-trigger')
const keyCap = () => draw(Kbd, { children: 'P' })[0]
/** A key cap inside the box: the box's slot it takes its look from. */
const IN_TOOLTIP = ['in-data-[slot=tooltip-content]']

const TOOLTIP_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        side: positionValues(TOOLTIP, 'TooltipContentProps', 'side'),
        align: positionValues(TOOLTIP, 'TooltipContentProps', 'align'),
    },
    size: (size) => {
        if (size === 'box') return { layers: [TOOLTIP_BOX], on: [] }
        if (size === 'arrow') return { layers: [TOOLTIP_ARROW], on: [] }
        if (size === 'keys') return pieceWhere(keyCap())
        if (size === 'trigger') return pieceWhere(tooltipTrigger())
        return undefined
    },
    paint: (_, name) => {
        if (name === 'box') return { layers: [TOOLTIP_BOX], on: [] }
        if (name === 'arrow') return { layers: [TOOLTIP_ARROW], on: [] }
        if (name === 'keys') return pieceWhere(keyCap(), IN_TOOLTIP)
        return undefined
    },
    effect: () => skip('the tooltip states no effects'),
    keys: {
        'Tab (focus reaches the trigger)': skip("Base UI's tooltip opens on focus-visible in a browser; nothing on the server shows it"),
        'Escape (the box is shown)': skip("Base UI's tooltip closes on Escape in a browser; the server draws it closed"),
    },
    more: () => {
        const containers = readFileSync(join(ROOT, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8')
        const xs = /--container-xs: ([\d.]+)rem;/.exec(containers)?.[1]
        // The library's own delay, the trigger's default with or without a provider, and the provider's when it gives none.
        const delay = numberIn(TOOLTIP, /export const TOOLTIP_DELAY = (\d+)\b/)
        const ownDefault =
            /function TooltipTrigger\(\{ className, delay, \.\.\.props \}/.test(TOOLTIP) &&
            /delay=\{delay \?\? shared\}/.test(TOOLTIP) &&
            /function TooltipProvider\(\{ delay = TOOLTIP_DELAY,/.test(TOOLTIP)
        return [
            check('options.side.default', 'top', defaultIn(TOOLTIP, 'function TooltipContent(', 'side')),
            check('options.align.default', 'center', defaultIn(TOOLTIP, 'function TooltipContent(', 'align')),
            check('options.sideOffset.default', '4', defaultIn(TOOLTIP, 'function TooltipContent(', 'sideOffset')),
            check('options.delay.default', String(SPECS.get('tooltip')?.options?.delay?.default), ownDefault ? delay : undefined),
            ...layoutChecks('tooltip', {
                maxWidth: () => (/(?:^|\s)max-w-xs(?:\s|$)/.test(TOOLTIP_BOX) && xs !== undefined ? String(Number(xs) * 16) : undefined),
                gap: () => defaultIn(TOOLTIP, 'function TooltipContent(', 'sideOffset'),
                keysPadEnd: () => resolve([TOOLTIP_BOX], ['has-data-[slot=kbd]'], READ.padEnd),
                openDelay: () => (ownDefault ? delay : "Base UI's own delay, or a provider's"),
            }),
        ]
    },
}

// Dropdown menu

const DROPDOWN = source('components/ui/dropdown-menu.tsx')
const DEFERRED_MENU = source('components/ui/deferred-menu.tsx')
/** The menu opens in a portal, and its parts load after the page is drawn: its classes are read from the source. */
const MENU = {
    popup: [POPUP_LOOK, literalAfter(DROPDOWN, 'data-slot="dropdown-menu-content"', 'className={cn(', 'POPUP,')],
    item: [literalAfter(DROPDOWN, 'const ROW_HEIGHT ='), literalAfter(DROPDOWN, 'function DropdownMenuItem(', 'ROW_HEIGHT,')],
    checkItem: [literalAfter(DROPDOWN, 'const ROW_HEIGHT ='), literalAfter(DROPDOWN, 'function DropdownMenuCheckboxItem(', 'ROW_HEIGHT,')],
    subTrigger: [literalAfter(DROPDOWN, 'const ROW_HEIGHT ='), literalAfter(DROPDOWN, 'function DropdownMenuSubTrigger(', 'ROW_HEIGHT,')],
    check: [literalAfter(DROPDOWN, 'function DropdownMenuCheckboxItem(', '<span', 'className=')],
    label: [literalAfter(DROPDOWN, 'data-slot="dropdown-menu-label"', 'cn(')],
    separator: [literalAfter(DROPDOWN, 'data-slot="dropdown-menu-separator"', 'cn(')],
    shortcut: [literalAfter(DROPDOWN, 'data-slot="dropdown-menu-shortcut"', 'cn(')],
    submenu: [literalAfter(DROPDOWN, 'data-slot="dropdown-menu-sub-content"', 'cn(')],
}
const GUTTER = literalAfter(DROPDOWN, 'const GUTTER =')
/** The menu's trigger as the server draws it: the stand-in until Base UI's menu has loaded. */
const menuTrigger = () =>
    draw(
        DropdownMenu,
        {},
        createElement(DropdownMenuTrigger, null, 'Actions'),
        createElement(DropdownMenuContent, null, createElement(DropdownMenuItem, null, 'Run')),
    ).find((element) => element.attrs['data-slot'] === 'dropdown-menu-trigger')
/** The variants a row's state turns on; a row that is not destructive says so. */
const MENU_ON: Record<string, string[]> = {
    rest: ['not-data-[variant=destructive]'],
    highlighted: ['focus', 'not-data-[variant=destructive]', 'group-focus/dropdown-menu-item'],
    destructive: ['data-[variant=destructive]', '*', '[svg]'],
    'destructive+highlighted': ['data-[variant=destructive]', 'focus'],
    disabled: ['data-disabled', 'not-data-[variant=destructive]'],
    subOpen: ['data-popup-open', 'data-open'],
}

const DROPDOWN_MENU_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        align: positionValues(DROPDOWN, 'DropdownMenuContentProps', 'align'),
        side: positionValues(DROPDOWN, 'DropdownMenuContentProps', 'side'),
        variant: propValues(DROPDOWN, 'DropdownMenuItemProps', 'variant'),
    },
    size: (size) => {
        if (size === 'trigger') return pieceWhere(menuTrigger())
        return size in MENU ? { layers: MENU[size as keyof typeof MENU], on: [] } : undefined
    },
    paint: (_, name, state) => {
        const on = MENU_ON[state]
        if (on === undefined) return skip(`no way to reach ${state} on a menu`)
        if (!(name in MENU)) return undefined
        const layers = MENU[name as keyof typeof MENU]
        return { layers, on, mark: name === 'item' ? layers[1] : undefined }
    },
    effect: () => skip('the menu states no effects'),
    keys: {
        Tab: () => (focusable(menuTrigger()) ? true : 'the trigger is out of the tab order'),
        'ArrowDown, ArrowUp, Enter, Space (the trigger has focus)': () =>
            menuTrigger()?.tag === 'button' && /const opens = event\.key === 'ArrowDown' \|\| event\.key === 'ArrowUp'/.test(DEFERRED_MENU)
                ? true
                : 'the trigger is not a native button, or the stand-in does not open on the arrows',
        'ArrowDown, ArrowUp (the menu is open)': () =>
            /function DropdownMenu\(\{ loopFocus = false,/.test(DROPDOWN) &&
            /function DropdownMenuSub\(\{ loopFocus = false,/.test(DROPDOWN)
                ? true
                : 'the menu or its submenu wraps at its ends (loopFocus)',
        'Home, End (the menu is open)': BASE_UI('menu', 'moves the highlight to the ends'),
        'a character (the menu is open)': BASE_UI('menu', 'moves the highlight by typing'),
        'Enter, Space (a row is highlighted)': BASE_UI('menu', 'does the highlighted row'),
        'ArrowRight (a submenu row is highlighted)': BASE_UI('menu', 'opens a submenu'),
        'ArrowLeft (in a submenu)': BASE_UI('menu', 'closes a submenu'),
        'Escape (the menu is open)': () => focusBack(DROPDOWN),
    },
    more: () => {
        const on = (classes: string, read: Reader) => resolve([classes], [], read)
        return [
            // The popup's note: elevation-pop under the menu and its submenus alike.
            check('pieces.popup.rest.elevation', 'elevation-pop', elevationOf(MENU.popup)),
            check('options.align.default', 'start', defaultIn(DROPDOWN, 'function DropdownMenuContent(', 'align')),
            check('options.side.default', 'bottom', defaultIn(DROPDOWN, 'function DropdownMenuContent(', 'side')),
            check('options.variant.default', 'default', defaultIn(DROPDOWN, 'function DropdownMenuItem(', 'variant')),
            ...layoutChecks('dropdown-menu', {
                gap: () => defaultIn(DROPDOWN, 'function DropdownMenuContent(', 'sideOffset'),
                minWidth: () => numberIn(MENU.popup[1], /min-w-\[max\(var\(--anchor-width\),--spacing\((\d+)\)\)\]/, 'step'),
                windowRoom: () => numberIn(MENU.popup[1], /max-w-\[calc\(100vw-(\d+)rem\)\]/, 'rem'),
                gutter: () => numberIn(GUTTER, /\*\*:data-menu-row:pl-(\d+)$/, 'step'),
                checkStart: () => on(MENU.check[0], lengthOf('left-')),
                checkItemPadEnd: () => on(MENU.checkItem[1], READ.padEnd),
                separatorGap: () => on(MENU.separator[0], lengthOf('my-')),
                submenuMinWidth: () => on(MENU.submenu[0], lengthOf('min-w-')),
                submenuGap: () => defaultIn(DROPDOWN, 'function DropdownMenuSubContent(', 'sideOffset'),
                openEase: () => durationIn(MENU.popup[1], /duration-(\w+)/),
            }),
        ]
    },
}

// What the dialogs share: Tailwind's sizes the classes name, and the dialog's box

const TAILWIND = readFileSync(join(ROOT, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8')
/** A Tailwind container or breakpoint size, in px. */
const tailwind = (kind: 'container' | 'breakpoint', name: string) => {
    const rem = new RegExp(`--${kind}-${name}: ([\\d.]+)rem;`).exec(TAILWIND)?.[1]
    return rem === undefined ? undefined : String(Number(rem) * 16)
}
/** The width a `md:max-w-<size>` class holds from 768 up, where a dialog is a box, in px. */
const widthFrom = (classes: string | undefined) => {
    const size = /(?:^|\s)md:max-w-(\w+)(?:\s|$)/.exec(classes ?? '')?.[1]
    return size === undefined ? undefined : tailwind('container', size)
}
/** The window width below which a class list's `max-sm` variants hold, in px. */
const belowSm = (classes: string) => (/(?:^|\s)max-sm:/.test(classes) ? tailwind('breakpoint', 'sm') : undefined)
/** The breakpoint below which a class list's `max-md` variants hold: `md`, which tokens.json defines for the classes. */
const belowMd = (classes: string) => (/(?:^|\s)max-md:/.test(classes) ? 'breakpoint-md' : undefined)

const DIALOG = source('components/ui/dialog.tsx')
const DIALOG_SHELL = source('components/DialogShell.tsx')
/** The dialog opens in a portal, which a server drawing leaves out: its classes are read from the sources. */
const DIALOG_PARTS = {
    backdrop: literalAfter(DIALOG, 'data-slot="dialog-overlay"', 'className={cn('),
    box: literalAfter(DIALOG, 'data-slot="dialog-content"', 'className={cn('),
    close: literalAfter(DIALOG, 'render={<Button variant="ghost" className='),
    title: literalAfter(DIALOG, 'data-slot="dialog-title"', 'cn('),
    description: literalAfter(DIALOG, 'data-slot="dialog-description"', 'cn('),
    shellBox: literalAfter(DIALOG_SHELL, '<DialogContent', 'className={cn('),
    sheet: literalAfter(DIALOG_SHELL, 'export const SHEET ='),
    fit: literalAfter(DIALOG_SHELL, 'const FIT_WIDTHS', 'sm:'),
    body: literalAfter(DIALOG_SHELL, '<div ref={body} className='),
    footer: literalAfter(DIALOG_SHELL, '<DialogFooter', 'cn('),
    note: literalAfter(DIALOG_SHELL, '{footer !== undefined && <div className='),
    verbs: literalAfter(DIALOG_SHELL, '{/* As wide as', '<div className='),
    nested: literalAfter(DIALOG_SHELL, 'export const NESTED ='),
}
/** The widths a dialog takes by name, and the classes each is drawn with. */
const DIALOG_WIDTHS = Object.fromEntries(
    [...(/const WIDTHS = \{([\s\S]*?)\} as const/.exec(DIALOG_SHELL)?.[1] ?? '').matchAll(/\n\s+(\w+): '([^']+)'/g)].map((match) => [
        match[1],
        match[2],
    ]),
)
/** The footer band as the primitive draws it, outside any dialog. */
const footerBand = () => classesOf(draw(DialogFooter, {}, 'Done')[0])
/** The corner close: a ghost button at icon-sm, placed in the box's corner. */
const cornerClose = () => {
    const drawn = button({ variant: 'ghost', size: 'icon-sm' })
    return { layers: [classesOf(firstButton(drawn)), DIALOG_PARTS.close], on: [] as string[] }
}
/** The confirm a dialog draws with a reason or busy, as the dialog hands them to its button. */
const confirmWhere = (state: 'shut' | 'busy') => {
    const handed = state === 'shut' ? /reason=\{confirm\.why\}/.test(DIALOG_SHELL) : /busy=\{busy\}/.test(DIALOG_SHELL)
    if (!handed) return undefined
    return buttonWhere(button(state === 'shut' ? { reason: 'The name is unchanged.' } : { busy: true }), 'disabled')
}

const DIALOG_ADAPTER: Adapter = {
    wordObjects: { DIALOG_SHELL_WORDS },
    complete: ['DIALOG_SHELL_WORDS'],
    words: {
        cancel: 'DIALOG_SHELL_WORDS.cancel',
        back: 'DIALOG_SHELL_WORDS.back',
        close: 'DIALOG_SHELL_WORDS.close',
        stopWaiting: 'DIALOG_SHELL_WORDS.stopWaiting',
    },
    options: {
        width: Object.keys(DIALOG_WIDTHS),
        phone: propValues(DIALOG_SHELL, 'DialogShellProps', 'phone'),
    },
    size: (size, key) => {
        if (['sm', 'md', 'lg', 'xl', 'full'].includes(size)) return skip('read in more: the width a name holds from 640 up')
        const read: Record<string, Where | undefined> = {
            box: { layers: [DIALOG_PARTS.box, DIALOG_PARTS.shellBox], on: [] },
            header: pieceWhere(draw(DialogHeader, {}, 'Rename')[0]),
            title: { layers: [DIALOG_PARTS.title], on: [] },
            description: { layers: [DIALOG_PARTS.description], on: [] },
            close: cornerClose(),
            body: { layers: [DIALOG_PARTS.body], on: [] },
            footer: { layers: [footerBand(), DIALOG_PARTS.footer], on: [] },
            note: { layers: [DIALOG_PARTS.note], on: [] },
            verbs: { layers: [DIALOG_PARTS.verbs], on: [] },
        }
        // The close's icon is the button's own, sized by its classes as every button's is.
        if (size === 'close' && key === 'icon') return { ...cornerClose(), on: [] }
        return read[size]
    },
    paint: (_, name, state) => {
        switch (name) {
            case 'backdrop':
                return { layers: [DIALOG_PARTS.backdrop], on: [] }
            case 'box':
                return {
                    layers: [DIALOG_PARTS.box, DIALOG_PARTS.shellBox, ...(state === 'phone' ? [DIALOG_PARTS.sheet] : [])],
                    on: state === 'phone' ? ['max-md'] : [],
                }
            case 'nestedShade':
                return { layers: [DIALOG_PARTS.nested], on: state === 'nested' ? ['data-nested-dialog-open', 'after'] : [] }
            case 'title':
                return { layers: [DIALOG_PARTS.title], on: [] }
            case 'description':
                return { layers: [DIALOG_PARTS.description], on: [] }
            case 'footer':
                return { layers: [footerBand(), DIALOG_PARTS.footer], on: [] }
            case 'note':
                return { layers: [DIALOG_PARTS.note], on: [] }
            default:
                return undefined
        }
    },
    effect: (state) => {
        if (state === 'shut' || state === 'busy') return confirmWhere(state)
        return skip(`no effect of ${state} on the confirm`)
    },
    keys: {
        Tab: BASE_UI('dialog', 'holds focus inside'),
        'Escape (dismissible, and not busy or busy past busy-release)': () =>
            /const asked = closing\(busy, released, details\.reason\)/.test(DIALOG_SHELL) &&
            /if \(!next && \(!dismissible \|\| asked === 'held'\)\) return/.test(DIALOG_SHELL) &&
            /const released = useBusyRelease\(busy, busyRelease\)/.test(DIALOG_SHELL) &&
            releasedBy(DIALOG_SHELL)
                ? true
                : 'Escape is not held while the dialog cannot be dismissed, or while busy before the wait',
        'Enter (the confirm has focus (initialFocus confirm opens on it), not shut or busy)': () =>
            firstButton(button())?.tag === 'button' && /initialFocus === 'confirm' \? verb/.test(DIALOG_SHELL)
                ? true
                : 'the confirm is not a native button, or initialFocus confirm does not focus it',
    },
    more: () => {
        const close = cornerClose().layers[1]
        const inset = (side: 'top' | 'right') => resolve([close], [], lengthOf(`${side}-`))
        return [
            ...['sm', 'md', 'lg', 'xl'].map((size) =>
                check(`sizes.${size}.width`, String(SPECS.get('dialog')?.sizes?.[size]?.width), widthFrom(DIALOG_WIDTHS[size])),
            ),
            // A boxed dialog stands on elevation-dialog; a full-screen sheet has none.
            check('pieces.box.rest.elevation', 'elevation-dialog', elevationOf([DIALOG_PARTS.box, DIALOG_PARTS.shellBox])),
            check(
                'pieces.box.phone.elevation',
                'none',
                elevationOf([DIALOG_PARTS.box, DIALOG_PARTS.shellBox, DIALOG_PARTS.sheet], ['max-md']),
            ),
            // A fit dialog, as ConfirmDialog is, stays a box below md at its width, inside the window's margins.
            check(
                'options.phone (fit)',
                'sm 384 below md too',
                /^max-md:max-w-\[min\(24rem,calc\(100%-2rem\)\)\]$/.test(DIALOG_PARTS.fit) &&
                    /phone === 'sheet' \? SHEET : FIT_WIDTHS\[width\]/.test(DIALOG_SHELL)
                    ? 'sm 384 below md too'
                    : undefined,
            ),
            check('options.width.default', 'md', defaultIn(DIALOG_SHELL, 'export function DialogShell(', 'width')),
            check('options.busyRelease.default', String(SPECS.get('dialog')?.options?.busyRelease?.default), BUSY_WAIT),
            check('options.phone.default', 'sheet', defaultIn(DIALOG_SHELL, 'export function DialogShell(', 'phone')),
            check('options.dismissible.default', 'true', defaultIn(DIALOG_SHELL, 'export function DialogShell(', 'dismissible')),
            check(
                'options.closeOnOutsidePress.default',
                'true',
                defaultIn(DIALOG_SHELL, 'export function DialogShell(', 'closeOnOutsidePress'),
            ),
            // ConfirmDialog is the dialog at sm, sized to its content on a phone.
            check(
                'options.width (ConfirmDialog)',
                'sm, phone fit',
                /export function ConfirmDialog[\s\S]*?width="sm"\s+phone="fit"/.test(DIALOG_SHELL) ? 'sm, phone fit' : undefined,
            ),
            check(
                'words.close (the corner close)',
                'words.close',
                /closeLabel=\{words\.close\}/.test(DIALOG_SHELL) ? 'words.close' : undefined,
            ),
            ...layoutChecks('dialog', {
                windowRoom: () => numberIn(DIALOG_PARTS.box, /max-w-\[calc\(100%-(\d+)rem\)\]/, 'rem'),
                heightRoom: () => numberIn(DIALOG_PARTS.shellBox, /max-h-\[calc\(100svh-(\d+)rem\)\]/, 'rem'),
                closeInset: () =>
                    inset('top') === inset('right') ? inset('top') : `${String(inset('top'))} down, ${String(inset('right'))} in`,
                closeRoom: () => numberIn(DIALOG_SHELL, /parts\.close \? 'pr-(\d+)'/, 'step'),
                busyRelease: () => busyReleaseIn(DIALOG_SHELL, 'export function DialogShell('),
                phoneBelow: () => belowMd(DIALOG_PARTS.sheet),
                openEase: () => durationIn(DIALOG_PARTS.box, /duration-(\w+)/),
            }),
        ]
    },
}

// Settings dialog

const SETTINGS = source('components/SettingsDialog.tsx')
const SETTINGS_PARTS = source('components/settings-parts.tsx')
const SETTING_ROW = source('components/SettingRow.tsx')
/** The settings dialog opens in a portal, and its navigation is a private module: its classes are read from the sources. */
const SETTINGS_LOOK = {
    box: literalAfter(SETTINGS, '<DialogContent', 'className={cn('),
    sheet: /NESTED,\s*SHEET\b/.test(SETTINGS) ? DIALOG_PARTS.sheet : '',
    head: literalAfter(SETTINGS, '<div className='),
    column: literalAfter(SETTINGS, '<nav', 'cn('),
    pane: literalAfter(SETTINGS, 'ref={pane}', 'cn('),
    heading: literalAfter(SETTINGS, '<h2 className='),
    noMatch: literalAfter(SETTINGS, 'shown === undefined ? (', '<p className='),
    footer: literalAfter(SETTINGS, '<DialogFooter className='),
    saved: literalAfter(SETTINGS, '<div role="status" className='),
    group: literalAfter(SETTINGS_PARTS, '<div key={group.id} className='),
    groupTitle: literalAfter(SETTINGS_PARTS, '{group.title !== undefined && <div className='),
    entry: literalAfter(SETTINGS_PARTS, '<button', 'cn('),
    entryInDialog: literalAfter(SETTINGS_PARTS, '<button', '? ['),
    entryShown: literalAfter(SETTINGS_PARTS, '<button', '? [', 'chosen', '? '),
    entryRest: literalAfter(SETTINGS_PARTS, '<button', '? [', 'chosen', '? ', ': '),
    entryIcon: literalAfter(SETTINGS_PARTS, '<Icon className='),
    chevron: literalAfter(SETTINGS_PARTS, '<ChevronRight className='),
    lead: literalAfter(SETTINGS_PARTS, '{section.lead !== undefined && <div className='),
    rows: literalAfter(SETTINGS_PARTS, 'const rows = (', '<div className='),
}
const SETTINGS_BOX = [DIALOG_PARTS.box, SETTINGS_LOOK.box]
/** An entry in the dialog's column: from 768 (`md`) it is marked and hovered; below it, a finger-tall row of the list. */
const entryWhere = (state: string): Where => {
    const shown = state === 'shown'
    const layers = [SETTINGS_LOOK.entry, SETTINGS_LOOK.entryInDialog, shown ? SETTINGS_LOOK.entryShown : SETTINGS_LOOK.entryRest]
    const on: Record<string, string[]> = { hover: ['md', 'hover'], focus: ['md', 'focus-visible'], phoneList: [] }
    return { layers, on: on[state] ?? ['md'] }
}
/** A setting's row, with a note: the row, the grid that places its control, its title, description and note. */
const SETTING = once(() => {
    const elements = draw(SettingRow, {
        title: 'Theme',
        description: 'The colors of surfaces',
        note: 'Applies on this device',
        control: 'x',
    })
    const row = elements.find((element) => element.attrs['data-slot'] === 'setting-row')
    return {
        row,
        grid: elements.find((element) => element.parent === row),
        title: byText(elements, 'div', 'Theme'),
        description: byText(elements, 'div', 'The colors of surfaces'),
        note: byText(elements, 'div', 'Applies on this device'),
    }
})

const SETTINGS_DIALOG_ADAPTER: Adapter = {
    wordObjects: { SETTINGS_DIALOG_WORDS },
    complete: ['SETTINGS_DIALOG_WORDS'],
    words: {
        title: 'SETTINGS_DIALOG_WORDS.title',
        search: 'SETTINGS_DIALOG_WORDS.search',
        searchLabel: 'SETTINGS_DIALOG_WORDS.searchLabel',
        clear: 'SETTINGS_DIALOG_WORDS.clear',
        noMatch: 'SETTINGS_DIALOG_WORDS.noMatch',
        saved: 'SETTINGS_DIALOG_WORDS.saved',
        done: 'SETTINGS_DIALOG_WORDS.done',
        reset: 'SETTINGS_DIALOG_WORDS.reset',
        resetSection: ['SETTINGS_DIALOG_WORDS.resetSection', (said: (section: string) => string, fill) => said(String(fill.section))],
        resetSectionDetail: [
            'SETTINGS_DIALOG_WORDS.resetSectionDetail',
            (said: (section: string) => string, fill) => said(String(fill.section)),
        ],
        resetAll: 'SETTINGS_DIALOG_WORDS.resetAll',
        resetAllDetail: 'SETTINGS_DIALOG_WORDS.resetAllDetail',
        resetConfirm: 'SETTINGS_DIALOG_WORDS.resetConfirm',
        cancel: 'SETTINGS_DIALOG_WORDS.cancel',
        close: 'SETTINGS_DIALOG_WORDS.close',
        back: 'SETTINGS_DIALOG_WORDS.back',
    },
    options: {
        phoneStart: propValues(SETTINGS, 'SettingsDialogProps', 'phoneStart'),
        resetScope: propValues(SETTINGS, 'SettingsDialogProps', 'resetScope'),
        layout: propValues(SETTING_ROW, 'SettingRowProps', 'layout'),
    },
    size: (size, key) => {
        const setting = SETTING()
        if (size === 'box' && (key === 'width' || key === 'height')) return skip('read in more: its width from 640 up and its height clamp')
        if (size === 'entry' && key === 'icon') return { layers: [SETTINGS_LOOK.entryIcon], on: [] }
        const read: Record<string, Where | undefined> = {
            box: { layers: SETTINGS_BOX, on: [] },
            head: { layers: [SETTINGS_LOOK.head], on: [] },
            title: { layers: [DIALOG_PARTS.title], on: [] },
            close: /<DialogClose render=\{<Button variant="ghost" size="icon-sm"/.test(SETTINGS) ? cornerClose() : undefined,
            column: { layers: [SETTINGS_LOOK.column], on: ['md'] },
            groupTitle: { layers: [SETTINGS_LOOK.groupTitle], on: [] },
            entry: entryWhere('rest'),
            pane: { layers: [SETTINGS_LOOK.pane], on: ['md'] },
            heading: { layers: [SETTINGS_LOOK.heading], on: [] },
            row: pieceWhere(key === 'gap' ? setting.grid : setting.row),
            rowTitle: pieceWhere(setting.title),
            rowDescription: pieceWhere(setting.description),
            rowNote: pieceWhere(setting.note),
            footer: { layers: [footerBand(), SETTINGS_LOOK.footer], on: [] },
            saved: { layers: [SETTINGS_LOOK.saved], on: [] },
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const setting = SETTING()
        switch (name) {
            case 'box':
                return { layers: SETTINGS_BOX, on: [] }
            case 'head':
                return { layers: [SETTINGS_LOOK.head], on: [] }
            case 'title':
                return { layers: [DIALOG_PARTS.title], on: [] }
            case 'column':
                return { layers: [SETTINGS_LOOK.column], on: ['md'] }
            case 'groupTitle':
                return { layers: [SETTINGS_LOOK.groupTitle], on: [] }
            case 'entry':
                return entryWhere(state)
            case 'chevron':
                return { layers: [SETTINGS_LOOK.chevron], on: [] }
            case 'heading':
                return { layers: [SETTINGS_LOOK.heading], on: [] }
            case 'lead':
                return { layers: [SETTINGS_LOOK.lead], on: [] }
            case 'rowTitle':
                return pieceWhere(setting.title)
            case 'rowDescription':
                return pieceWhere(setting.description)
            case 'rowNote':
                return pieceWhere(setting.note)
            case 'rowRule':
                return { layers: [SETTINGS_LOOK.rows], on: [] }
            case 'noMatch':
                return { layers: [SETTINGS_LOOK.noMatch], on: [] }
            case 'footer':
                return { layers: [footerBand(), SETTINGS_LOOK.footer], on: [] }
            case 'saved':
                return { layers: [SETTINGS_LOOK.saved], on: [] }
            default:
                return undefined
        }
    },
    effect: () => skip('the settings dialog states no effects'),
    keys: {
        Tab: BASE_UI('dialog', 'holds focus inside'),
        'Enter, Space (an entry has focus)': () =>
            /<button\s+key=\{section\.id\}\s+type="button"/.test(SETTINGS_PARTS) &&
            /onClick=\{\(\) => onChoose\(section\.id\)\}/.test(SETTINGS_PARTS)
                ? true
                : 'an entry is not a native button that chooses its section',
        'Escape (no layer is open over it)': BASE_UI('dialog', 'closes on Escape'),
    },
    more: () => {
        const setting = SETTING()
        const route = SPECS.get('settings-dialog')?.routes?.settings ?? ''
        return [
            check('sizes.box.width', '896', widthFrom(SETTINGS_LOOK.box)),
            // The settings dialog stands on elevation-dialog as every boxed dialog does; its sheet below md has none.
            check('pieces.box.rest.elevation', 'elevation-dialog', elevationOf(SETTINGS_BOX)),
            // A phone's view is decided at the same line: the search takes focus from md up.
            check(
                'layout.phoneBelow (focus)',
                'breakpoint-md',
                /matchMedia\('\(min-width: 48rem\)'\)/.test(SETTINGS) ? 'breakpoint-md' : undefined,
            ),
            check('sizes.box.height', '704', numberIn(SETTINGS_LOOK.box, /h-\[min\((\d+)rem,/, 'rem')),
            check('options.phoneStart.default', 'list', defaultIn(SETTINGS, 'export function SettingsDialog(', 'phoneStart')),
            check('options.resetScope.default', 'section', defaultIn(SETTINGS, 'export function SettingsDialog(', 'resetScope')),
            check('options.layout.default', 'auto', defaultIn(SETTING_ROW, 'export function SettingRow(', 'layout')),
            check(
                'states.noReset',
                'no Reset to defaults for a section with reset false',
                /if \(!all && \(section === undefined \|\| section\.reset === false\)\) return null/.test(SETTINGS_PARTS)
                    ? 'no Reset to defaults for a section with reset false'
                    : undefined,
            ),
            check(
                'states.confirming',
                'a ConfirmDialog with a destructive resetConfirm',
                /<ConfirmDialog[\s\S]*?label: say\.resetConfirm,\s+destructive: true/.test(SETTINGS_PARTS)
                    ? 'a ConfirmDialog with a destructive resetConfirm'
                    : undefined,
            ),
            check('routes.settings', route, route.startsWith('#/settings') && typeof useOverlayRoute === 'function' ? route : undefined),
            ...layoutChecks('settings-dialog', {
                windowRoom: () => numberIn(DIALOG_PARTS.box, /max-w-\[calc\(100%-(\d+)rem\)\]/, 'rem'),
                heightRoom: () => numberIn(SETTINGS_LOOK.box, /calc\(100svh-(\d+)rem\)/, 'rem'),
                groupTitleBelow: () => resolve([SETTINGS_LOOK.groupTitle], [], lengthOf('pb-')),
                entryGap: () => resolve([SETTINGS_LOOK.group], [], READ.gap),
                headingBelow: () => resolve([SETTINGS_LOOK.heading], [], lengthOf('pb-')),
                descriptionTop: () => lengthOn(setting.description, lengthOf('mt-')),
                noteTop: () => lengthOn(setting.note, lengthOf('mt-')),
                controlTop: () => numberIn(SETTING_ROW, /layout !== 'trailing' && 'mt-(\d+)'/, 'step'),
                trailingFrom: () => (/@lg:grid-cols-/.test(SETTING_ROW) ? tailwind('container', 'lg') : undefined),
                phoneBelow: () => belowMd(SETTINGS_LOOK.sheet),
                phoneHeadStart: () => resolve([SETTINGS_LOOK.head], ['max-md'], READ.padStart),
                sectionsBetween: () => resolve([SETTINGS_LOOK.column], [], READ.gap),
            }),
        ]
    },
}

// Command palette

const PALETTE = source('components/CommandPalette.tsx')
const COMMAND = source('components/ui/command.tsx')
const onSelect = () => undefined
/** One group of commands, the second a group of one: each piece a row draws, and a disabled row. */
const PALETTE_GROUPS: CommandPaletteProps['groups'] = [
    {
        title: 'Go to',
        commands: [
            { id: 'runs', label: 'Runs', icon: Play, hint: 'every run', keys: ['G', 'R'], onSelect },
            { id: 'nightly-export', label: 'nightly-export', icon: Workflow, code: 'job_01', meta: '4m 12s', onSelect },
            { id: 'send-digest', label: 'send-digest', icon: Workflow, disabled: 'Paused by ada', onSelect },
        ],
    },
    { title: 'Create', commands: [{ id: 'new-job', label: 'New job', kind: 'Form', keys: ['N'], onSelect }] },
]
const palette = (props: Partial<CommandPaletteProps> = {}) =>
    draw(CommandPalette, { open: true, onOpenChange: () => undefined, groups: PALETTE_GROUPS, ...props })
/** The palette open on one command, as the server draws it. */
const paletteWith = (command: Omit<PaletteCommand, 'id' | 'onSelect'>) =>
    palette({ groups: [{ title: 'Jobs', commands: [{ id: 'job', onSelect, ...command }] }] })
const PALETTES = once(() => ({
    full: palette({ description: 'Choose a run', foot: { name: 'Tidevann' } }),
    empty: palette({ groups: [] }),
}))
const bySlot = (elements: El[], slot: string) => elements.find((element) => element.attrs['data-slot'] === slot)
const paletteRow = (elements: El[], label: string) =>
    elements.find((element) => element.attrs['data-slot'] === 'command-item' && element.text.startsWith(label))
/** A span by its text: the row's hint, code or meta. */
const spanOf = (elements: El[], text: string) => byText(elements, 'span', text)
/** The palette's box: the dialog's, the palette's dialog, the box the mock draws, and the command root inside it. */
const paletteBox = (elements: El[]) => [
    DIALOG_PARTS.box,
    literalAfter(COMMAND, '<DialogContent', 'className={cn('),
    classesOf(bySlot(elements, 'dialog-content')),
    classesOf(bySlot(elements, 'command')),
]
/** A row is always in the palette's dialog. */
const IN_DIALOG = ['in-data-[slot=dialog-content]']
const PALETTE_ON: Record<string, string[]> = {
    rest: IN_DIALOG,
    active: [...IN_DIALOG, 'data-selected', '*', '[svg]'],
    disabled: [...IN_DIALOG, 'data-[disabled=true]'],
}
/** A row's quiet words, while their row is the active one: the row's group, which they take the highlight's ink from. */
const QUIET_ON = (state: string) => (state === 'active' ? ['group-data-selected/command-item'] : [])
/** A group title takes its look from its group's classes for the heading cmdk draws. */
const GROUP_TITLE = ['**', '[[cmdk-group-heading]]']
const TONE_STATES = new Set(['critical', 'warning', 'good', 'info'])
/** The palette's tones, read through the type it takes them from. */
const paletteTones = () =>
    /export type PaletteTone = SearchDetailTone/.test(PALETTE)
        ? [...(/export type SearchDetailTone = ([^\n]+)/.exec(source('components/Search.tsx'))?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
              (match) => match[1],
          )
        : []
/** What the palette draws while a command runs, and once one is refused: read from the source, as no server drawing runs one. */
const RUNNING = [
    literalAfter(COMMAND, 'data-slot="command-shortcut"', 'cn('),
    literalAfter(PALETTE, '{running ? (', '<CommandShortcut className='),
]
const refusal = once(() =>
    draw(ProblemLine, { className: literalAfter(PALETTE, '<ProblemLine className='), children: 'Only an owner can rerun' }),
)

const COMMAND_PALETTE_ADAPTER: Adapter = {
    wordObjects: { COMMAND_PALETTE_WORDS, PALETTE_SEARCH_WORDS },
    complete: ['COMMAND_PALETTE_WORDS', 'PALETTE_SEARCH_WORDS'],
    words: {
        placeholder: 'COMMAND_PALETTE_WORDS.placeholder',
        empty: 'COMMAND_PALETTE_WORDS.empty',
        title: 'COMMAND_PALETTE_WORDS.title',
        close: 'COMMAND_PALETTE_WORDS.close',
        open: 'COMMAND_PALETTE_WORDS.open',
        palette: 'COMMAND_PALETTE_WORDS.palette',
        sequence: 'COMMAND_PALETTE_WORDS.sequence',
        running: 'COMMAND_PALETTE_WORDS.running',
        refused: 'COMMAND_PALETTE_WORDS.refused',
        stopWaiting: 'COMMAND_PALETTE_WORDS.stopWaiting',
        searching: 'PALETTE_SEARCH_WORDS.searching',
        searchFailed: ['PALETTE_SEARCH_WORDS.failed', (said: (reason: string) => string, fill) => said(String(fill.reason))],
        retry: 'PALETTE_SEARCH_WORDS.retry',
        seeAll: ['PALETTE_SEARCH_WORDS.seeAll', (said: (query: string) => string, fill) => said(String(fill.query))],
    },
    options: {
        metaTone: paletteTones(),
        tone: /\btone\?: PaletteTone/.test(PALETTE) ? paletteTones() : [],
        filter: propValues(PALETTE, 'CommandPaletteProps', 'filter'),
        width: propValues(PALETTE, 'CommandPaletteProps', 'width'),
    },
    size: (size, key) => {
        const { full, empty } = PALETTES()
        if ((size === 'box' || size === 'md' || size === 'lg') && key === 'width')
            return skip('read in more: the width a name holds from 640 up')
        const searchIcon = full.find((element) => element.tag === 'svg' && classesOf(element).includes('lucide-search'))
        const runs = paletteRow(full, 'Runs')
        const read: Record<string, Where | undefined> = {
            box: { layers: paletteBox(full), on: [] },
            search:
                key === 'icon'
                    ? pieceWhere(searchIcon)
                    : { layers: [classesOf(bySlot(full, 'input-group')), classesOf(bySlot(full, 'command-input'))], on: [] },
            group: pieceWhere(bySlot(full, 'command-group')),
            groupTitle: { layers: [classesOf(bySlot(full, 'command-group'))], on: GROUP_TITLE },
            row: runs === undefined ? undefined : { layers: [classesOf(runs)], on: IN_DIALOG },
            hint: pieceWhere(spanOf(full, 'every run')),
            code: pieceWhere(spanOf(full, 'job_01')),
            meta: pieceWhere(spanOf(full, '4m 12s')),
            keys: pieceWhere(full.find((element) => element.parent?.attrs['data-slot'] === 'command-shortcut' && element.tag === 'span')),
            spinner: /<Spinner aria-label=\{words\.running\} \/>/.test(PALETTE)
                ? { layers: [literalAfter(source('components/ui/spinner.tsx'), 'className={cn(')], on: [] }
                : undefined,
            refusal: key === 'icon' ? pieceWhere(iconOf(refusal(), refusal()[0])) : pieceWhere(refusal()[0]),
            empty: pieceWhere(bySlot(empty, 'command-empty')),
            foot: pieceWhere(byText(full, 'span', 'Tidevann')?.parent),
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const { full, empty } = PALETTES()
        const toned = TONE_STATES.has(state) ? (state as PaletteCommand['tone']) : undefined
        switch (name) {
            case 'box':
                return { layers: paletteBox(full), on: [] }
            case 'description':
                return pieceWhere(byText(full, 'p', 'Choose a run'))
            case 'search':
                return { layers: [classesOf(bySlot(full, 'input-group')), classesOf(bySlot(full, 'command-input'))], on: [] }
            case 'searchIcon':
                return pieceWhere(full.find((element) => element.tag === 'svg' && classesOf(element).includes('lucide-search')))
            case 'groupTitle':
                return { layers: [classesOf(bySlot(full, 'command-group'))], on: GROUP_TITLE }
            case 'separator':
                return pieceWhere(bySlot(full, 'command-separator'))
            case 'row': {
                const row = paletteRow(full, state === 'disabled' ? 'send-digest' : 'Runs')
                return row === undefined
                    ? undefined
                    : { layers: [classesOf(row)], on: PALETTE_ON[state] ?? IN_DIALOG, around: ancestors(row) }
            }
            case 'icon': {
                const row = paletteRow(full, 'Runs')
                const icon = iconOf(full, row)
                return row === undefined || icon === undefined
                    ? undefined
                    : { layers: [classesOf(row), classesOf(icon)], on: PALETTE_ON[state] ?? IN_DIALOG, around: ancestors(icon) }
            }
            case 'hint':
                return pieceWhere(spanOf(paletteWith({ label: 'Runs', hint: 'every run', tone: toned }), 'every run'), QUIET_ON(state))
            case 'code':
                return pieceWhere(spanOf(full, 'job_01'), QUIET_ON(state))
            case 'meta':
                if (state === 'twoLine') {
                    // A two-line row's meta is the search result's quiet fact at its end.
                    const two = paletteWith({ label: 'import-orders', detail: 'harbor', meta: 'no upload step' })
                    return pieceWhere(spanOf(two, 'no upload step'))
                }
                return pieceWhere(
                    spanOf(paletteWith({ label: 'import-orders', meta: 'no upload step', metaTone: toned }), 'no upload step'),
                    QUIET_ON(state),
                )
            case 'kind':
                return pieceWhere(spanOf(full, 'Form'), QUIET_ON(state))
            case 'keys':
                return pieceWhere(bySlot(full, 'kbd'))
            case 'spinner':
                return { layers: RUNNING, on: [] }
            case 'refusal':
                return pieceWhere(refusal()[0])
            case 'empty':
                return pieceWhere(bySlot(empty, 'command-empty'))
            case 'foot':
                return pieceWhere(byText(full, 'span', 'Tidevann')?.parent)
            default:
                return undefined
        }
    },
    effect: (state) => {
        if (state !== 'disabled') return skip(`no effect of ${state} on a row`)
        const row = paletteRow(PALETTES().full, 'send-digest')
        return row === undefined ? undefined : { layers: [classesOf(row)], on: PALETTE_ON.disabled }
    },
    keys: {
        'Mod+K': () => {
            const opens = /key, mod: true, alsoCtrl: true, inFields: true/.test(source('hooks/use-palette-shortcut.ts'))
            // An open palette closes itself on the same keys, in a Shell or not, held while a command runs.
            const closes =
                /id: 'palette-close',\s+key: 'k',\s+mod: true,\s+alsoCtrl: true,\s+inFields: true,\s+inDialogs: true,\s+disabled: !open,\s+run: \(\) => close\(false\)/.test(
                    PALETTE,
                )
            return opens && closes ? true : `usePaletteShortcut opens ${String(opens)}, the open palette closes ${String(closes)}`
        },
        'a character (the palette is open)': () =>
            bySlot(PALETTES().full, 'command-input')?.tag === 'input' ? true : "the search is not cmdk's input",
        'ArrowDown, ArrowUp (the palette is open)': () => {
            if (/\bloop\b/.test(PALETTE) || /\bloop\b/.test(COMMAND)) return 'the palette loops at its ends'
            // cmdk's Ctrl+N, Ctrl+J, Ctrl+P and Ctrl+K are off, so Ctrl+K is the palette's key alone.
            return /function Command\(\{ className, vimBindings = false,/.test(COMMAND) && /vimBindings=\{vimBindings\}/.test(COMMAND)
                ? true
                : "cmdk's own Ctrl keys move the active row"
        },
        'Home, End (the palette is open)': skip('cmdk moves the active row to the ends in a browser; the server draws none active'),
        'Enter (a row is active and no command is running, or Stop waiting is active)': () =>
            /if \(busy !== undefined\) return/.test(PALETTE) && /value="stop-waiting" forceMount onSelect=\{stopWaiting\}/.test(PALETTE)
                ? true
                : 'a choice made while a command runs is not ignored, or Stop waiting does not close',
        'Escape (the palette is open, and no command is running or it has run busy-release)': () =>
            /if \(!next && !letsGo\(busy !== undefined, released, details\?\.reason\)\) return/.test(PALETTE) &&
            /onOpenChange=\{close\}/.test(PALETTE) &&
            releasedBy(PALETTE)
                ? true
                : 'a running command does not hold the palette open until the wait',
    },
    more: () => {
        const { full } = PALETTES()
        const meta = spanOf(full, '4m 12s')
        return [
            check('sizes.box.width', '384', widthFrom(classesOf(bySlot(full, 'dialog-content')))),
            // The palette's box is a boxed dialog's: elevation-dialog under it.
            check('pieces.box.rest.elevation', 'elevation-dialog', elevationOf(paletteBox(full))),
            check('sizes.md.width', '512', widthFrom(classesOf(bySlot(palette({ width: 'md' }), 'dialog-content')))),
            check('sizes.lg.width', '672', widthFrom(classesOf(bySlot(palette({ width: 'lg' }), 'dialog-content')))),
            check('options.filter.default', 'fuzzy', defaultIn(PALETTE, 'export function CommandPalette(', 'filter')),
            check('options.busyRelease.default', String(SPECS.get('command-palette')?.options?.busyRelease?.default), BUSY_WAIT),
            check('options.width.default', 'sm', defaultIn(PALETTE, 'export function CommandPalette(', 'width')),
            check('options.wrap.default', 'false', defaultIn(PALETTE, 'export function CommandPalette(', 'wrap')),
            check(
                'states.busy',
                'the palette open, the row busy, until the promise settles',
                /busy: \(pending\) => setBusy\(pending \? rowValue\(command\) : undefined\)/.test(PALETTE) &&
                    /aria-busy=\{running \|\| undefined\}/.test(PALETTE)
                    ? 'the palette open, the row busy, until the promise settles'
                    : undefined,
            ),
            check(
                'states.refused',
                "the rejection's words, else words.refused, under the rows",
                /refused: \(reason\) => setRefusal\(reason \?\? words\.refused\)/.test(PALETTE)
                    ? "the rejection's words, else words.refused, under the rows"
                    : undefined,
            ),
            ...layoutChecks('command-palette', {
                listMaxHeight: () => numberIn(classesOf(bySlot(full, 'command-list')), /max-h-\[min\((\d+)rem,/, 'rem'),
                listBottom: () => lengthOn(bySlot(full, 'command-list'), lengthOf('pb-')),
                searchInset: () => lengthOn(bySlot(full, 'command-input-wrapper'), READ.pad),
                labelGap: () => lengthOn(spanOf(full, 'every run')?.parent, READ.gapX),
                metaGap: () => lengthOn(meta?.parent, READ.gapX),
                kindGap: () => lengthOn(spanOf(full, 'Form')?.parent, READ.gap),
                metaFoldBelow: () => belowSm(classesOf(meta?.parent)),
                widthFrom: () => (/(?:^|\s)md:max-w-/.test(classesOf(bySlot(full, 'dialog-content'))) ? 'breakpoint-md' : undefined),
                busyRelease: () => busyReleaseIn(PALETTE, 'export function CommandPalette('),
            }),
        ]
    },
}

// Shell

const SHELL = source('components/Shell.tsx')
const SHELL_SPEC_ROUTE = () => SPECS.get('shell')?.routes?.settings ?? ''
/** A shell with a side panel, and the panel's toggle in it. */
const withPanel = (open: boolean) => {
    const elements = shell({ top: 'Runs', panel: 'Details', panelOpen: open })
    return { elements, toggle: elements.find((element) => element.tag === 'button' && element.attrs['aria-pressed'] !== undefined) }
}

const SHELL_ADAPTER: Adapter = {
    wordObjects: { SHELL_WORDS },
    complete: ['SHELL_WORDS'],
    words: {
        menu: 'SHELL_WORDS.menu',
        close: 'SHELL_WORDS.close',
        showPanel: 'SHELL_WORDS.showPanel',
        hidePanel: 'SHELL_WORDS.hidePanel',
        panelTabs: 'SHELL_WORDS.panelTabs',
        openPalette: 'SHELL_WORDS.openPalette',
        openShortcuts: 'SHELL_WORDS.openShortcuts',
    },
    options: { railMode: propValues(SHELL, 'ShellProps', 'railMode') },
    size: (size, key) => {
        if (size !== 'panelToggle')
            return skip(
                "the shell's own regions (the page, the drawer, the scroll bar) get specs of their own as egui needs them; its dialogs, settings and palette have theirs",
            )
        const { elements, toggle } = withPanel(false)
        return key === 'icon' ? pieceWhere(iconOf(elements, toggle)) : pieceWhere(toggle)
    },
    paint: (_, name, state) => {
        if (name !== 'panelToggle')
            return skip(
                "the shell's own regions (the page, the drawer, the scroll bar) get specs of their own as egui needs them; its dialogs, settings and palette have theirs",
            )
        return at(withPanel(state === 'panelOpen').toggle, state)
    },
    effect: () => skip('the shell states no effects'),
    keys: {
        "Mod+K (nothing but the top bar's search results stands over the page)": () =>
            /key: 'k',\s+mod: true,\s+alsoCtrl: true/.test(SHELL) ? true : 'the palette is not bound to Mod+K and Ctrl+K',
        '?': () => (/key: '\?'/.test(SHELL) ? true : 'the shortcuts dialog is not bound to ?'),
        Escape: skip("each layer is Base UI's (dialog, popover, menu, drawer), which closes on Escape in a browser"),
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
    rail: RAIL_ADAPTER,
    'top-bar': TOP_BAR_ADAPTER,
    'status-line': STATUS_LINE_ADAPTER,
    'page-header': PAGE_HEADER_ADAPTER,
    section: SECTION_ADAPTER,
    'page-state': PAGE_STATE_ADAPTER,
    select: SELECT_ADAPTER,
    'dropdown-menu': DROPDOWN_MENU_ADAPTER,
    tooltip: TOOLTIP_ADAPTER,
    dialog: DIALOG_ADAPTER,
    'settings-dialog': SETTINGS_DIALOG_ADAPTER,
    'command-palette': COMMAND_PALETTE_ADAPTER,
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
            // A word said as a function is called with each sample's values: zero, one and many, and what it interpolates.
            for (const sample of spec.samples?.[key] ?? []) {
                const values = Object.fromEntries(
                    Object.entries(sample.with).map(([slot, value]) => [slot, typeof value === 'boolean' ? String(value) : value]),
                )
                checks.push(check(`${name} with ${JSON.stringify(sample.with)}`, sample.says, say({ ...FILL, ...values })))
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

/** The variants a length is drawn under: inside an icon, on the hit area drawn after the part below md. */
const SIZE_ON: Record<string, string[]> = {
    icon: ["[&_svg:not([class*='size-'])]"],
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
    phoneHitArea: READ.square,
}

/** What a phone size reads below md: a least length, or an exact one, which is at least itself. */
const PHONE_READERS: Record<string, Reader> = {
    phoneMinHeight: (name) => READ.minHeight(name) ?? READ.height(name),
    phoneMinWidth: (name) => READ.minWidth(name) ?? READ.width(name),
}

/** Only the classes drawn under a variant, such as `max-md`, so a length drawn at every width is not taken for the phone's. */
const under = (layers: readonly string[], mod: string) =>
    layers.map((classes) =>
        classes
            .split(/\s+/)
            .filter((token) => utility(token).mods.includes(mod))
            .join(' '),
    )

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
            } else if (key in PHONE_READERS) found = resolve(under(where.layers, 'max-md'), [...where.on, 'max-md'], PHONE_READERS[key])
            else if (key === 'height')
                found = resolve(where.layers, where.on, READ.height) ?? resolve(where.layers, where.on, READ.minHeight)
            else if (key === 'padX') {
                // Across: px, else the same pl and pr, else a pad all round.
                found =
                    resolve(where.layers, where.on, READ.padX) ??
                    (resolve(where.layers, where.on, READ.padStart) === resolve(where.layers, where.on, READ.padEnd)
                        ? resolve(where.layers, where.on, READ.padStart)
                        : undefined) ??
                    resolve(where.layers, where.on, READ.pad)
            } else if (key === 'padY') found = resolve(where.layers, where.on, READ.padY) ?? resolve(where.layers, where.on, READ.pad)
            // A gap across: gap, else gap-x where the row's gap down differs, else the space between children.
            else if (key === 'gap')
                found =
                    resolve(where.layers, where.on, READ.gap) ??
                    resolve(where.layers, where.on, READ.gapX) ??
                    resolve(where.layers, where.on, lengthOf('space-y-', 'space-x-'))
            else {
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
        it('meets the rest of the spec', () => holds(id, 'routes.', 'layout.'))
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
