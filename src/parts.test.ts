import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CalendarClock, Folder, Play, Server, Workflow } from 'lucide-react'
import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { API_LINK_WORDS, ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { ChoiceList } from '@winterop-com/sokkel-ui/ChoiceList'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { ITEM_CARD_WORDS, ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Badge, type BadgeProps } from '@winterop-com/sokkel-ui/primitives/badge'
import { SERVER_MENU_WORDS, ServerMenu } from '@winterop-com/sokkel-ui/ServerMenu'
import { SORTABLE_WORDS, SortableGrid, sortableStep } from '@winterop-com/sokkel-ui/Sortable'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { Unfoldable } from '@winterop-com/sokkel-ui/Unfoldable'
import { BOARD_CHECKLIST_WORDS, BOARD_ITEM_PANEL_WORDS, BoardChecklist, BoardItemPanel } from '@winterop-com/sokkel-ui/board/BoardItemPanel'
import { Banner, BANNER_WORDS, type BannerTone } from '@winterop-com/sokkel-ui/Banner'
import { CALL_BAR_SHORTCUTS, CALL_BAR_WORDS, CallBar, type CallBarProps } from '@winterop-com/sokkel-ui/CallBar'
import { CHART_LEGEND_WORDS, ChartLegend } from '@winterop-com/sokkel-ui-charts/ChartLegend'
import { CHART_WORDS, KINDS } from '@winterop-com/sokkel-ui-charts/kinds'
import { PANEL_WORDS } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import {
    COMMAND_PALETTE_WORDS,
    CommandPalette,
    PALETTE_SEARCH_WORDS,
    type CommandPaletteProps,
    type PaletteCommand,
} from '@winterop-com/sokkel-ui/CommandPalette'
import {
    COMPOSER_DICTATION_WORDS,
    COMPOSER_WORDS,
    Composer,
    type ComposerAttachment,
    type ComposerProps,
} from '@winterop-com/sokkel-ui/Composer'
import {
    CLIP_TIMELINE_FIT,
    CLIP_TIMELINE_WORDS,
    CLIP_TIMELINE_ZOOM,
    ClipTimeline,
    type ClipTimelineProps,
    type TimelineClip,
    type TimelineTrack,
} from '@winterop-com/sokkel-ui/ClipTimeline'
import { DataTable, DATA_TABLE_WORDS, headEntered, headStep, type DataColumn, type DataTableProps } from '@winterop-com/sokkel-ui/DataTable'
import { DASHBOARD_PANEL_WORDS, DashboardPanel, SPAN, type DashboardPanelProps } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { STAT_PANEL_WORDS, StatPanel, type StatPanelProps } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { THRESHOLD_LEGEND_WORDS, ThresholdLegend } from '@winterop-com/sokkel-ui/dashboard/ThresholdLegend'
import { CodeEditor, FOLD_KEYS, SCHEMA_WORDS, sayIssue, type CodeEditorProps } from '@winterop-com/sokkel-ui/CodeEditor'
import { COMPUTED_FIELD_WORDS, ComputedField, type ComputedFieldProps } from '@winterop-com/sokkel-ui/ComputedField'
import { DATE_FIELD_WORDS, DateField } from '@winterop-com/sokkel-ui/DateField'
import { DetailPane } from '@winterop-com/sokkel-ui/DetailPane'
import { DIALOG_SHELL_WORDS } from '@winterop-com/sokkel-ui/DialogShell'
import { EMOJI_PICKER_WORDS, EmojiPicker } from '@winterop-com/sokkel-ui/EmojiPicker'
import { Field, FIELD_WORDS } from '@winterop-com/sokkel-ui/Field'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { ISSUE_COUNT_WORDS, ISSUE_WORDS, IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { JSON_TREE_WORDS, JsonTree } from '@winterop-com/sokkel-ui/JsonTree'
import { Letter, LETTER_WORDS } from '@winterop-com/sokkel-ui/Letter'
import { MESSAGE_COMPOSER_WORDS, MessageComposer, type MessageComposerProps } from '@winterop-com/sokkel-ui/MessageComposer'
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
import {
    REACTION_BAR_WORDS,
    REACTION_CHIPS_WORDS,
    ReactionBar,
    ReactionChips,
    type ChatReaction,
    type ReactionBarProps,
} from '@winterop-com/sokkel-ui/ReactionBar'
import { Rail, RAIL_SIZE, RAIL_WORDS, type RailGroup, type RailProps } from '@winterop-com/sokkel-ui/Rail'
import { RUN_TIMELINE_WORDS, RunTimeline, type RunTimelineLane, type RunTimelineProps } from '@winterop-com/sokkel-ui/RunTimeline'
import { SECRET_FIELD_WORDS, SecretField, type SecretFieldProps } from '@winterop-com/sokkel-ui/SecretField'
import { Section, type SectionProps } from '@winterop-com/sokkel-ui/Section'
import { SelectField, type SelectFieldProps } from '@winterop-com/sokkel-ui/SelectField'
import { Problem, PROBLEM_WORDS } from '@winterop-com/sokkel-ui/Problem'
import { MARKDOWN_WORDS, PlainMarkdown } from '@winterop-com/sokkel-ui/PlainMarkdown'
import { PERIOD_PICKER_WORDS, PeriodPicker, type PeriodPickerProps } from '@winterop-com/sokkel-ui/PeriodPicker'
import { ProblemLine } from '@winterop-com/sokkel-ui/ProseText'
import { PROMPT_DIALOG_WORDS } from '@winterop-com/sokkel-ui/PromptDialog'
import { REPEATED_GROUP_WORDS, RepeatedGroup, type RepeatedGroupProps } from '@winterop-com/sokkel-ui/RepeatedGroup'
import { SettingRow } from '@winterop-com/sokkel-ui/SettingRow'
import { SETTINGS_DIALOG_WORDS } from '@winterop-com/sokkel-ui/SettingsDialog'
import { Shell, SHELL_WORDS, type ShellProps } from '@winterop-com/sokkel-ui/Shell'
import { PanelSection, SIDE_PANEL_WORDS, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusItem, StatusLine, type StatusLineProps } from '@winterop-com/sokkel-ui/StatusLine'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { ThemePicker, type ThemePickerProps } from '@winterop-com/sokkel-ui/ThemePicker'
import { TIME_FIELD_WORDS, TimeField, type TimeFieldProps } from '@winterop-com/sokkel-ui/TimeField'
import { TopBar, TOP_BAR_WORDS, type TopBarProps } from '@winterop-com/sokkel-ui/TopBar'
import { formatMessage } from '@winterop-com/sokkel-ui/lib/message-format'
import { YES_NO_FIELD_WORDS, YesNoField, type YesNoFieldProps } from '@winterop-com/sokkel-ui/YesNoField'
import { Tree, type TreeNode, type TreeProps } from '@winterop-com/sokkel-ui/Tree'
import { TREE_SELECT_WORDS, TreeSelect, type TreeSelectProps } from '@winterop-com/sokkel-ui/TreeSelect'

/**
 * sokkel-ui against the sokkel-design contract. `design/` holds the contract's parts and patterns
 * at the commit `design/pin.json` names (`bun run design` keeps it), and each spec is checked
 * against what can be read from the components without a browser: drawn by React on the server, or
 * read from their sources. For each part:
 *
 *   words     every word the spec lists is the component's English default, and every default is in the spec;
 *             a word said as a function says what each of the spec's samples says (zero, one, many, each value it interpolates)
 *   messages  each word's message id is in the packages' catalogs with the English the spec gives, and that
 *             ICU message says the word, and what each of its samples says
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
/**
 * A wait a part holds for, by its token: the token's name when the token builds its constant into
 * `lib/durations` and the part's source holds the wait by that constant (`uses`).
 */
const waitToken = (token: string, constant: string, uses: boolean) =>
    uses &&
    new RegExp(`export const ${constant} = \\d+\\b`).test(source('lib/durations.ts')) &&
    new RegExp(`duration\\('${token}'\\)`).test(readFileSync(join(ROOT, 'scripts', 'build-tokens.ts'), 'utf8'))
        ? token
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
    /** Each word's message id and its English in the catalogs, or null where the catalogs hold none. */
    messages?: Record<string, { id: string; en: string; with?: Record<string, unknown> } | null>
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
const WEIGHTS: Record<string, number> = {
    'font-normal': 400,
    'font-medium': 500,
    'font-semibold': 600,
    'font-bold': 700,
}

// Drawing a component on the server, and finding its elements

interface El {
    tag: string
    attrs: Record<string, string>
    text: string
    parent: El | undefined
}

const ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#39;': "'",
}
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
    return {
        mods: parts,
        name: name.replace(/^!|!$/g, ''),
        important: name.startsWith('!') || name.endsWith('!'),
    }
}

/** Variants that hold wherever the part is drawn: a guard that only turns a state off, or a selector that reaches the piece itself. */
const GUARDS = new Set([
    'not-aria-disabled',
    'not-aria-[haspopup]',
    '[&>:first-child]',
    '[&>:first-child:not([data-field-edge=own])]',
    '[&>[data-track]>*]',
])

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
const RING_WIDTHS: Record<string, string> = {
    focus: 'focus-ring-width',
    invalid: 'invalid-ring-width',
}

const READ = {
    ground: prefixed('bg-'),
    edge: prefixed('border-'),
    rule: prefixed('border-b-', 'border-t-', 'border-l-', 'border-', 'divide-'),
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
        /^-?(?:ring|outline)-offset-focus(?:-inset)?$/.test(name) ? 'focus-ring-offset' : /^(?:ring|outline)-offset-(\d+)$/.exec(name)?.[1],
    /** Whether an outline is drawn inside the box (`outline-offset-focus-inset`, or a negative `-outline-offset-focus`) or outside it. */
    ringInset: (name: string) =>
        /^(?:(?:ring|outline)-offset-focus-inset|-(?:ring|outline)-offset-focus)$/.test(name)
            ? 'all'
            : /^(?:ring|outline)-offset-/.test(name)
              ? 'outside'
              : undefined,
    opacity: (name: string) => {
        if (name === 'opacity-disabled') return 'disabled-opacity'
        const match = /^opacity-(\d+)$/.exec(name)
        return match === null ? undefined : String(Number(match[1]) / 100)
    },
    underline: (name: string) => (name === 'underline' ? 'true' : name === 'no-underline' ? 'false' : undefined),
    radius: (name: string) => {
        if (name.startsWith('rounded-[min(var(--control-radius),')) return 'radius-control'
        const match = /^rounded-(control|surface|composer|chip|mini|xs|sm|md|lg|xl|none|full)$/.exec(name)
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
    padStart: lengthOf('pl-', 'ps-'),
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
 * size that makes it is named by it. A plain size (`text.2xs`, `text.emoji`) is a role of its own,
 * at 400 unless the paint names its weight (`plainWeight`).
 */
function roleOf(where: Where, on: string[], wanted: string, plainWeight = '400'): string {
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
    const plain = role === size && target !== undefined && target.weight === undefined && target.tracking === undefined
    return makes || (plain && weight === plainWeight) ? wanted : `text-${size} at ${weight}`
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
        {
            ...check(`${key}.color`, ring.color, light),
            same: sameColor(ring.color, light),
        },
        check(`${key}.width`, String(ring.width), resolve(where.layers, where.on, READ.ringWidth)),
    ]
    if (ring.offset !== undefined) {
        checks.push(check(`${key}.offset`, String(ring.offset), resolve(where.layers, where.on, READ.ringOffset)))
        checks.push(check(`${key}.inset`, ring.inset ?? 'outside', resolve(where.layers, where.on, READ.ringInset)))
    }
    if (ring.dark !== undefined || dark !== light) {
        const wanted = ring.dark?.color ?? ring.color
        checks.push({
            ...check(`${key}.color (dark)`, wanted, dark),
            same: sameColor(wanted, dark),
        })
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
        if (wanted !== undefined)
            checks.push({
                ...check(`${key}.${name}`, wanted, light),
                same: sameColor(wanted, light),
            })
        const wantedDark = paint.dark?.[name] ?? wanted
        if (wantedDark !== undefined && (paint.dark?.[name] !== undefined || dark !== light)) {
            checks.push({
                ...check(`${key}.${name} (dark)`, wantedDark, dark),
                same: sameColor(wantedDark, dark),
            })
        }
    }
    if (paint.mark !== undefined) {
        const found = where.mark === undefined ? undefined : resolve([where.mark], where.on, READ.ink)
        checks.push({
            ...check(`${key}.mark`, paint.mark, found),
            same: sameColor(paint.mark, found),
        })
    }
    if (paint.ring !== undefined) checks.push(...ringChecks(`${key}.ring`, paint.ring, where))
    if (paint.radius !== undefined) checks.push(check(`${key}.radius`, paint.radius, resolve(where.layers, where.on, READ.radius)))
    if (paint.opacity !== undefined)
        checks.push(check(`${key}.opacity`, String(paint.opacity), resolve(where.layers, where.on, READ.opacity)))
    if (paint.underline !== undefined) {
        checks.push(check(`${key}.underline`, String(paint.underline), resolve(where.layers, where.on, READ.underline) ?? 'false'))
    }
    if (paint.weight !== undefined) checks.push(check(`${key}.weight`, String(paint.weight), resolve(where.layers, where.on, READ.weight)))
    if (paint.text !== undefined)
        checks.push(
            check(
                `${key}.text`,
                paint.text,
                roleOf(where, where.on, paint.text, paint.weight === undefined ? undefined : String(paint.weight)),
            ),
        )
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
    action: 'Remove',
    from: 1,
    to: 50,
    total: 120,
    done: 2,
    page: 2,
    pages: 5,
    place: 2,
    column: 'Name',
    row: 'nightly-export',
    section: 'General',
    query: 'harbor',
    reason: 'The search timed out',
    property: 'schedule',
    a: 'an',
    expected: 'object',
    values: '"daily", "weekly"',
    value: '"harbor"',
    limit: '1',
    pattern: '^[a-z-]+$',
    format: 'date',
    message: 'Must not be empty',
    language: 'JSON',
    sample: '2026-11-09',
    min: '2026-11-09',
    max: '2026-12-31',
    bound: '2026-11-09',
    lane: 'sync-inventory',
    amount: '+2h',
    label: 'harbor-wide',
    start: '00:00:04:00',
    end: '00:00:09:15',
    at: '00:00:06:00',
    length: '00:00:05:15',
    clip: 'harbor-wide',
    track: 'B-roll',
    item: 'juniper-pan',
    when: 'yesterday',
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
    return {
        layers: [classesOf(element)],
        on,
        around: ancestors(element),
        focusable: focusable(element),
    }
}

const BUTTON_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        variant: variantKeys(BUTTON, 'variant'),
        size: variantKeys(BUTTON, 'size'),
    },
    size: (size) => {
        const element = firstButton(button({ size: size as never }))
        return pieceWhere(element)
    },
    paint: (group, name, state) => {
        if (group === 'pieces') return name === 'container' ? buttonWhere(button(), state) : undefined
        if (name === 'icon-button') {
            const pressed = state === 'pressed'
            return buttonWhere(
                draw(IconButton, {
                    label: 'Edit',
                    pressed: pressed || undefined,
                    children: 'E',
                }),
                pressed ? 'rest' : state,
            )
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
const WARNED = {
    issues: [{ tone: 'warning' as const, text: 'Longer than most' }],
}
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
            (_: never, fill) =>
                draw(IssueCount, {
                    critical: 0,
                    warning: Number(fill.count),
                    list: [],
                })[0]?.attrs['aria-label'] ?? '',
        ],
    },
    options: {
        requiredMark: propValues(TEXT_FIELD, 'TextFieldProps', 'requiredMark'),
    },
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
    {
        id: 'name',
        header: 'Name',
        width: 'minmax(12rem,1fr)',
        cell: (job) => job.name,
        sortValue: (job) => job.name,
    },
    { id: 'state', header: 'State', width: '8rem', cell: (job) => job.state },
]
const DATA_TABLE = source('components/DataTable.tsx')
const table = (props: Partial<DataTableProps<Job>> = {}) =>
    draw(DataTable<Job>, {
        columns: COLUMNS,
        rows: JOBS,
        rowKey: (job) => job.id,
        ...props,
    } as DataTableProps<Job>)
const rowOf = (elements: El[], key = JOBS[0].id) => elements.find((element) => element.attrs['data-row'] === key)
const FIRST = new Set([JOBS[0].id])
/** Rows drawn as cards: a box this wide stacks below the widest a server drawing assumes. */
const STACKED: Partial<DataTableProps<Job>> = {
    stackBelow: 5000,
    minWidth: 'auto',
}

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
    return {
        layers: [classesOf(card), classesOf(face)],
        on,
        around: ancestors(card),
    }
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
        cellFocus: [
            ...(/export type CellFocus = ([^\n]+)/.exec(source('components/table-editing.tsx'))?.[1] ?? '').matchAll(/'([^']+)'/g),
        ].map((match) => match[1]),
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
            return {
                layers: [classesOf(head), ...(state === 'rest' ? [] : [classesOf(sorter)])],
                on,
                around: ancestors(head),
            }
        }
        if (name === 'groupHead') {
            const elements = table({ groupBy: (job: Job) => job.state })
            return pieceWhere(elements.find((element) => element.attrs.role === 'row' && element.attrs['data-group'] !== undefined))
        }
        if (name === 'cardDetail') {
            const elements = table({
                ...STACKED,
                detail: () => 'Ran in 4 minutes',
                defaultExpanded: FIRST,
            })
            return pieceWhere(
                elements.find((element) => element.text === 'Ran in 4 minutes' && classesOf(element).includes('rounded-surface')),
            )
        }
        if (name === 'placeholder')
            return pieceWhere(table({ rows: [], loading: true }).find((element) => element.attrs['data-slot'] === 'skeleton'))
        if (name === 'empty') return pieceWhere(byText(table({ rows: [] }), 'p', DATA_TABLE_WORDS.empty))
        if (name === 'failure') {
            if (state === 'rest') return skip('not drawn at rest')
            const elements = table({
                error: 'The read timed out',
                onRetry: () => undefined,
            })
            const state_ = elements.find((element) => element.attrs['data-slot'] === 'page-state')
            if (state_ === undefined) return undefined
            const mark = elements.find((element) => element.tag === 'svg' && element.parent === state_)
            return {
                layers: [classesOf(state_)],
                on: [],
                around: ancestors(state_),
                mark: classesOf(mark),
            }
        }
        if (name === 'dropLine') {
            // Drawn only while a row is dragged, which a server drawing never is: its classes are read from the source.
            return {
                layers: [literalAfter(DATA_TABLE, 'function RowLine', 'className={cn(')],
                on: [],
            }
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
    return element === undefined
        ? undefined
        : {
              layers: [classesOf(element)],
              on: frameOn(state),
              around: ancestors(element),
          }
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
            {
                id: 'runs',
                label: 'Runs',
                icon: Play,
                href: '#/runs',
                active: true,
                count: 3,
            },
            {
                id: 'schedules',
                label: 'Schedules',
                icon: CalendarClock,
                href: '#/schedules',
            },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            {
                id: 'jobs',
                label: 'Jobs',
                icon: Workflow,
                href: '#/jobs',
                unread: true,
            },
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
            {
                id: 'runs',
                label: 'Runs',
                description: 'Every run, newest first',
                icon: Play,
                href: '#/runs',
                active: true,
            },
            {
                id: 'schedules',
                label: 'Schedules',
                description: 'When each job starts',
                icon: CalendarClock,
                href: '#/schedules',
            },
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
    draw(Rail, {
        name: 'Tidevann',
        mark: 'T',
        markHref: '#/',
        groups: PLACES,
        onCollapsedChange: () => undefined,
        foot: 'ada',
        ...props,
    })
/** The drawings most checks read, each made once. */
const RAILS = once(() => ({
    expanded: rail(),
    collapsed: rail({ collapsed: true }),
    strip: rail({ variant: 'strip' }),
}))
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
    options: {
        variant: propValues(RAIL, 'RailProps', 'variant'),
        view: propValues(RAIL, 'RailProps', 'view'),
    },
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
                if (state === 'docked')
                    return {
                        layers: [literalAfter(RAIL, 'createPortal(', 'className=')],
                        on: [],
                    }
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
                // The widths are RAIL_SIZE's, which the rail's props default to.
                width: () => (/defaultSize = RAIL_SIZE\.default,/.test(RAIL) ? String(RAIL_SIZE.default) : undefined),
                minWidth: () => (/minSize = RAIL_SIZE\.min,/.test(RAIL) ? String(RAIL_SIZE.min) : undefined),
                maxWidth: () => (/maxSize = RAIL_SIZE\.max,/.test(RAIL) ? String(RAIL_SIZE.max) : undefined),
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
    draw(TopBar, {
        trail: CRUMBS,
        onSearch: () => undefined,
        shortcut: 'Ctrl K',
        actions: NEW,
        ...props,
    })
/** The top bar in a shell, as an app draws it: in the shell's bar, under the frame's ink. */
const shell = (props: Partial<ShellProps> = {}) => draw(Shell, { rail: null, children: 'Run 1842', ...props })
const framedBar = (props: Partial<TopBarProps> = {}) =>
    shell({
        top: createElement(TopBar, {
            trail: CRUMBS,
            onSearch: () => undefined,
            ...props,
        }),
    })
const BARS = once(() => ({ bar: topBar(), framed: framedBar() }))
const paletteButton = (elements: El[], word: string) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === word)
const menuButton = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === SHELL_WORDS.menu)

const TOP_BAR_ADAPTER: Adapter = {
    wordObjects: { TOP_BAR_WORDS },
    complete: ['TOP_BAR_WORDS'],
    words: {
        search: 'TOP_BAR_WORDS.search',
        palette: 'TOP_BAR_WORDS.palette',
        trail: 'TOP_BAR_WORDS.trail',
    },
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
    createElement(StatusItem, {
        key: 'run',
        label: 'run',
        code: true,
        children: 'run_01JCF8Q2',
    }),
    createElement(StatusItem, { key: 'step', children: 'step 3 of 5' }),
]
const statusLine = (props: Partial<StatusLineProps> = {}) =>
    draw(StatusLine, {
        note: 'import-orders is running',
        children: FACTS,
        ...props,
    })
const STATUS_TONES: Record<string, StatusLineProps['tone']> = {
    rest: 'quiet',
    toneLive: 'live',
    toneWarn: 'warn',
    toneError: 'error',
}

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
const section = (props: Partial<SectionProps> = {}) =>
    draw(Section, {
        title: 'Steps',
        children: 'fetch, transform, validate',
        ...props,
    })
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
    options: {
        variant: propValues(SECTION, 'SectionProps', 'variant'),
        tone: propValues(SECTION, 'SectionProps', 'tone'),
    },
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
                return where === undefined
                    ? undefined
                    : {
                          ...where,
                          mark: dot === undefined ? undefined : `text-(--${dot})`,
                      }
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
    if (on.has('failed'))
        return pageState({
            ...REFUSAL,
            ...(on.has('warning') ? { tone: 'warning' as const } : {}),
            ...frame,
        })
    return pageState({
        empty: true,
        emptyMessage: 'No runs in the last 24 hours.',
        ...frame,
    })
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
                    : {
                          layers: [classesOf(frame), classesOf(heading)],
                          on: [],
                          around: ancestors(heading),
                      }
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
        value: {
            theme,
            scheme: 'light',
            density: 'regular',
            corners: 'theme',
            typeface: 'theme',
        },
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
                : {
                      layers: [classesOf(trigger)],
                      on: [`data-[size=${size}]`],
                      around: ancestors(trigger),
                  }
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
                return {
                    layers: [SELECT_LIST.row, SELECT_LIST.detailEnd],
                    on: rowOn(state),
                }
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
            : {
                  layers: [classesOf(trigger)],
                  on: ['disabled'],
                  around: ancestors(trigger),
                  focusable: focusable(trigger),
              }
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
                // A tap's hold is `tapTip`'s, `TIP_HOLD` unless given, and the tooltip hands it no other.
                tapHold: () =>
                    waitToken(
                        'tip-hold',
                        'TIP_HOLD',
                        /hold: number = TIP_HOLD\)/.test(source('lib/tap-tip.ts')) && /tapTip\(\w+\)/.test(TOOLTIP),
                    ),
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
    return {
        layers: [classesOf(firstButton(drawn)), DIALOG_PARTS.close],
        on: [] as string[],
    }
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
                return {
                    layers: [DIALOG_PARTS.nested],
                    on: state === 'nested' ? ['data-nested-dialog-open', 'after'] : [],
                }
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
    const on: Record<string, string[]> = {
        hover: ['md', 'hover'],
        focus: ['md', 'focus-visible'],
        phoneList: [],
    }
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
            {
                id: 'runs',
                label: 'Runs',
                icon: Play,
                hint: 'every run',
                keys: ['G', 'R'],
                onSelect,
            },
            {
                id: 'nightly-export',
                label: 'nightly-export',
                icon: Workflow,
                code: 'job_01',
                meta: '4m 12s',
                onSelect,
            },
            {
                id: 'send-digest',
                label: 'send-digest',
                icon: Workflow,
                disabled: 'Paused by ada',
                onSelect,
            },
        ],
    },
    {
        title: 'Create',
        commands: [{ id: 'new-job', label: 'New job', kind: 'Form', keys: ['N'], onSelect }],
    },
]
const palette = (props: Partial<CommandPaletteProps> = {}) =>
    draw(CommandPalette, {
        open: true,
        onOpenChange: () => undefined,
        groups: PALETTE_GROUPS,
        ...props,
    })
/** The palette open on one command, as the server draws it. */
const paletteWith = (command: Omit<PaletteCommand, 'id' | 'onSelect'>) =>
    palette({
        groups: [{ title: 'Jobs', commands: [{ id: 'job', onSelect, ...command }] }],
    })
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
    draw(ProblemLine, {
        className: literalAfter(PALETTE, '<ProblemLine className='),
        children: 'Only an owner can rerun',
    }),
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
                    : {
                          layers: [classesOf(bySlot(full, 'input-group')), classesOf(bySlot(full, 'command-input'))],
                          on: [],
                      },
            group: pieceWhere(bySlot(full, 'command-group')),
            groupTitle: {
                layers: [classesOf(bySlot(full, 'command-group'))],
                on: GROUP_TITLE,
            },
            row: runs === undefined ? undefined : { layers: [classesOf(runs)], on: IN_DIALOG },
            hint: pieceWhere(spanOf(full, 'every run')),
            code: pieceWhere(spanOf(full, 'job_01')),
            meta: pieceWhere(spanOf(full, '4m 12s')),
            keys: pieceWhere(full.find((element) => element.parent?.attrs['data-slot'] === 'command-shortcut' && element.tag === 'span')),
            spinner: /<Spinner aria-label=\{words\.running\} \/>/.test(PALETTE)
                ? {
                      layers: [literalAfter(source('components/ui/spinner.tsx'), 'className={cn(')],
                      on: [],
                  }
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
                return {
                    layers: [classesOf(bySlot(full, 'input-group')), classesOf(bySlot(full, 'command-input'))],
                    on: [],
                }
            case 'searchIcon':
                return pieceWhere(full.find((element) => element.tag === 'svg' && classesOf(element).includes('lucide-search')))
            case 'groupTitle':
                return {
                    layers: [classesOf(bySlot(full, 'command-group'))],
                    on: GROUP_TITLE,
                }
            case 'separator':
                return pieceWhere(bySlot(full, 'command-separator'))
            case 'row': {
                const row = paletteRow(full, state === 'disabled' ? 'send-digest' : 'Runs')
                return row === undefined
                    ? undefined
                    : {
                          layers: [classesOf(row)],
                          on: PALETTE_ON[state] ?? IN_DIALOG,
                          around: ancestors(row),
                      }
            }
            case 'icon': {
                const row = paletteRow(full, 'Runs')
                const icon = iconOf(full, row)
                return row === undefined || icon === undefined
                    ? undefined
                    : {
                          layers: [classesOf(row), classesOf(icon)],
                          on: PALETTE_ON[state] ?? IN_DIALOG,
                          around: ancestors(icon),
                      }
            }
            case 'hint':
                return pieceWhere(spanOf(paletteWith({ label: 'Runs', hint: 'every run', tone: toned }), 'every run'), QUIET_ON(state))
            case 'code':
                return pieceWhere(spanOf(full, 'job_01'), QUIET_ON(state))
            case 'meta':
                if (state === 'twoLine') {
                    // A two-line row's meta is the search result's quiet fact at its end.
                    const two = paletteWith({
                        label: 'import-orders',
                        detail: 'harbor',
                        meta: 'no upload step',
                    })
                    return pieceWhere(spanOf(two, 'no upload step'))
                }
                return pieceWhere(
                    spanOf(
                        paletteWith({
                            label: 'import-orders',
                            meta: 'no upload step',
                            metaTone: toned,
                        }),
                        'no upload step',
                    ),
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
                // The search's wait shows once `useSearch` says slow, after `WAIT_SHOWN`, and the palette draws it through `searchWait`.
                searchingAfter: () =>
                    waitToken(
                        'wait-shown',
                        'WAIT_SHOWN',
                        /useBusyRelease\(state\.state === 'loading', WAIT_SHOWN\)/.test(source('hooks/use-search.ts')) &&
                            /searchWait\(answer, answer\.slow\)/.test(PALETTE),
                    ),
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
    return {
        elements,
        toggle: elements.find((element) => element.tag === 'button' && element.attrs['aria-pressed'] !== undefined),
    }
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

// What a drag carries on the drag engine's card, and how a press becomes a drag: read from DragDrop, which every drag shares.

const DRAG_DROP = source('components/DragDrop.tsx')
/** The card a compact copy is drawn on, which follows the pointer. */
const DRAG_CARD = literalAfter(DRAG_DROP, '<DragOverlay', 'className={cn(')
const CARD_OFFSET = () => numberIn(DRAG_DROP, /const COMPACT_OFFSET = (\d+)\b/)
const DRAG_FROM = () => numberIn(DRAG_DROP, /const DISTANCE = (\d+)\b/)
/** The icon a class sizes through its children (`[&_svg]:size-4`). */
const SVG_ON = ['[&_svg]']
const noop = () => undefined
/** A row of buttons the arrows move along, stopping at its first and last as every list of choices does. */
const STOPS_AT_ENDS = /buttons\[Math\.min\(Math\.max\(at \+ step, 0\), buttons\.length - 1\)\]\?\.focus\(\)/

// Run timeline

const RUN_TIMELINE = source('components/RunTimeline.tsx')
const RUN_TIMELINE_DRAG = source('components/run-timeline-drag.tsx')
const NOON = Date.UTC(2026, 10, 17, 12)
const HOURS = 3_600_000
const RUN_LANES: RunTimelineLane[] = [
    {
        id: 'nightly-export',
        name: 'nightly-export',
        detail: 'Every day at 02:00',
        runs: [
            {
                id: 'ran',
                at: NOON - 6 * HOURS,
                end: NOON - 5 * HOURS,
                status: 'succeeded',
            },
            { id: 'due', at: NOON + 4 * HOURS },
        ],
    },
    {
        id: 'sync-inventory',
        name: 'sync-inventory',
        detail: 'Every 6 hours',
        runs: [
            { id: 'failed', at: NOON - 3 * HOURS, status: 'failed' },
            { id: 'next', at: NOON + 6 * HOURS },
        ],
    },
    {
        id: 'running',
        name: 'Concurrency',
        detail: 'at most 2 at once',
        total: true,
        runs: [],
    },
]
const runTimeline = (props: Partial<RunTimelineProps> = {}) =>
    draw(RunTimeline, {
        lanes: RUN_LANES,
        from: NOON - 12 * HOURS,
        to: NOON + 12 * HOURS,
        now: NOON,
        timeZone: 'UTC',
        selected: 'sync-inventory',
        onSelect: noop,
        onShift: noop,
        ...props,
    })
const RUN_TIMELINES = once(() => runTimeline())
const laneOf = (elements: El[], id: string) => elements.find((element) => element.attrs['data-lane'] === id)
const inLane = (elements: El[], id: string, find: (element: El) => boolean) => {
    const lane = laneOf(elements, id)
    return lane === undefined ? undefined : elements.find((element) => within(element, lane) && find(element))
}
const laneButton = (elements: El[], id: string) => inLane(elements, id, (element) => element.tag === 'button')
const shiftHandle = (elements: El[]) => elements.find((element) => element.attrs['data-shift-handle'] !== undefined)
const timelineAxis = (elements: El[]) => elements.find((element) => classesOf(element).startsWith('relative h-8'))
/** A run's ghost and the card's amount are drawn only while a drag carries the runs: read from the source. */
const RUN_GHOST = literalAfter(RUN_TIMELINE, '{faded && (', 'className=')
const SHIFT_AMOUNT = literalAfter(RUN_TIMELINE, 'function ShiftAmount(', 'className=')
const RUN_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    'selected+hover': ['hover'],
}

const RUN_TIMELINE_ADAPTER: Adapter = {
    wordObjects: { RUN_TIMELINE_WORDS },
    complete: ['RUN_TIMELINE_WORDS'],
    words: {
        now: 'RUN_TIMELINE_WORDS.now',
        scheduled: 'RUN_TIMELINE_WORDS.scheduled',
        hint: 'RUN_TIMELINE_WORDS.hint',
        upcoming: ['RUN_TIMELINE_WORDS.upcoming', (said: (lane: string) => string, fill) => said(String(fill.lane))],
        by: ['RUN_TIMELINE_WORDS.by', (said: (amount: string) => string, fill) => said(String(fill.amount))],
        shifted: [
            'RUN_TIMELINE_WORDS.shifted',
            (said: (lane: string, amount: string) => string, fill) => said(String(fill.lane), String(fill.amount)),
        ],
    },
    options: {},
    size: (size, key) => {
        const drawn = RUN_TIMELINES()
        const legend = drawn.find((element) => classesOf(element).includes('gap-x-4'))
        const entry = drawn.find((element) => element.parent === legend && element.tag === 'span')
        const read: Record<string, Where | undefined> = {
            legend: pieceWhere(legend),
            legendEntry: pieceWhere(entry),
            axis: pieceWhere(timelineAxis(drawn)),
            name: pieceWhere(laneButton(drawn, 'nightly-export')),
            track: pieceWhere(inLane(drawn, 'nightly-export', (element) => element.attrs['data-lane-track'] !== undefined)),
            run: pieceWhere(drawn.find((element) => element.attrs['data-run'] === 'failed')),
            ghost: { layers: [RUN_GHOST], on: [] },
            nowLabel: pieceWhere(drawn.find((element) => classesOf(element).includes('rounded-mini bg-primary'))),
            grip: pieceWhere(iconOf(drawn, shiftHandle(drawn))),
            card: { layers: [DRAG_CARD, SHIFT_AMOUNT], on: [] },
        }
        // The legend entry's icon is its dot.
        if (size === 'legendEntry' && key === 'icon') {
            const dot = drawn.find((element) => entry !== undefined && element.parent === entry)
            return pieceWhere(drawn.find((element) => dot !== undefined && element.parent === dot))
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const drawn = RUN_TIMELINES()
        const on = RUN_ON[state] ?? []
        switch (name) {
            case 'box':
                return pieceWhere(drawn[0])
            case 'legend':
                return pieceWhere(drawn.find((element) => classesOf(element).includes('gap-x-4')))
            case 'axis':
                return pieceWhere(timelineAxis(drawn)?.parent)
            case 'tick':
                return pieceWhere(
                    drawn.find(
                        (element) => classesOf(element).includes('font-mono text-2xs') && !classesOf(element).includes('bg-primary'),
                    ),
                )
            case 'gridLine':
                return pieceWhere(drawn.find((element) => classesOf(element).includes('w-px bg-border')))
            case 'nowLine':
                return pieceWhere(drawn.find((element) => classesOf(element).includes('w-px bg-primary')))
            case 'nowLabel':
                return pieceWhere(drawn.find((element) => classesOf(element).includes('rounded-mini bg-primary')))
            case 'lane':
                return pieceWhere(laneOf(drawn, state === 'selected' ? 'sync-inventory' : state === 'total' ? 'running' : 'nightly-export'))
            case 'name':
                return pieceWhere(laneButton(drawn, state.startsWith('selected') ? 'sync-inventory' : 'nightly-export'), on)
            case 'laneName': {
                const lane = state === 'total' ? 'running' : 'nightly-export'
                return pieceWhere(inLane(drawn, lane, (element) => element.tag === 'span' && classesOf(element).includes('block truncate')))
            }
            case 'laneDetail':
                return pieceWhere(inLane(drawn, 'nightly-export', (element) => classesOf(element).includes('text-muted-foreground')))
            case 'track':
                return pieceWhere(
                    inLane(drawn, 'nightly-export', (element) => element.attrs['data-lane-track'] !== undefined),
                    on,
                )
            case 'run':
                return state === 'upcoming'
                    ? skip('an upcoming run is hollow by its inline style, read in more')
                    : pieceWhere(drawn.find((element) => element.attrs['data-run'] === 'failed'))
            case 'ghost':
                return { layers: [RUN_GHOST], on: [] }
            case 'handle':
                return pieceWhere(shiftHandle(drawn), on)
            case 'grip':
                return pieceWhere(iconOf(drawn, shiftHandle(drawn)))
            case 'card':
                return { layers: [DRAG_CARD, SHIFT_AMOUNT], on: [] }
            default:
                return undefined
        }
    },
    effect: () => skip('the run timeline states no effects'),
    keys: {
        Tab: () => {
            const drawn = RUN_TIMELINES()
            const order = [laneButton(drawn, 'nightly-export'), laneButton(drawn, 'sync-inventory'), shiftHandle(drawn)]
            const places = order.map((element) => (element === undefined ? -1 : drawn.indexOf(element)))
            const reached =
                order.every((element) => focusable(element) && (element?.tag === 'button' || element?.attrs.tabindex === '0')) &&
                places.every((place, index) => place >= 0 && (index === 0 || place > places[index - 1]))
            return reached ? true : `drawn in another order, or out of the tab order: ${places.join(', ')}`
        },
        "Enter, Space (a lane's name has focus)": () =>
            laneButton(RUN_TIMELINES(), 'nightly-export')?.attrs.type === 'button' ? true : 'the name is not a native button',
        'ArrowLeft, ArrowRight (the handle has focus)': () =>
            /if \(event\.key !== 'ArrowLeft' && event\.key !== 'ArrowRight'\) return/.test(RUN_TIMELINE) &&
            /shift\(lane, now !== undefined && first \+ amount <= now \? 0 : amount\)/.test(RUN_TIMELINE)
                ? true
                : 'the handle does not shift by the arrows, held to now',
        'Shift+ArrowLeft, Shift+ArrowRight (the handle has focus)': () =>
            /const amount = \(event\.shiftKey \? step : grain\)/.test(RUN_TIMELINE) ? true : 'Shift does not shift by a tick',
        'Escape (a pointer drags the handle)': () =>
            /onDragCancel=\{onCancel\}/.test(RUN_TIMELINE_DRAG) ? true : "the drag engine's cancel does not put the runs back",
    },
    more: () => {
        const drawn = RUN_TIMELINES()
        const name = laneButton(drawn, 'nightly-export')
        return [
            // An upcoming run is drawn by its style: no ground, an edge in muted-foreground.
            check('pieces.run.upcoming.edge', 'muted-foreground', /const color = upcoming \? 'var\(--([a-z-]+)\)'/.exec(RUN_TIMELINE)?.[1]),
            check(
                'pieces.run.upcoming.ground',
                'none',
                /backgroundColor: upcoming \? undefined : color,\s+borderColor: upcoming \? color : undefined/.test(RUN_TIMELINE) &&
                    /upcoming && 'border'/.test(RUN_TIMELINE)
                    ? 'none'
                    : undefined,
            ),
            ...layoutChecks('run-timeline', {
                nameWidth: () => (name === undefined ? undefined : resolve([classesOf(name)], ['sm'], READ.width)),
                nameWidthNarrow: () => lengthOn(name, READ.width),
                axisHeight: () => lengthOn(timelineAxis(drawn), READ.height),
                laneMinHeight: () =>
                    lengthOn(
                        inLane(drawn, 'nightly-export', (element) => element.attrs['data-lane-track'] !== undefined),
                        READ.minHeight,
                    ),
                tickRoom: () => numberIn(RUN_TIMELINE, /const TICK_ROOM = (\d+)\b/),
                nowRoom: () => numberIn(RUN_TIMELINE, /const NOW_ROOM = (\d+)\b/),
                handleInset: () => lengthOn(shiftHandle(drawn), lengthOf('inset-y-')),
                handlePast: () => numberIn(RUN_TIMELINE, /\+ var\(--spacing\) \* (\d+)\)/, 'step'),
                cardOffset: CARD_OFFSET,
                dragFrom: DRAG_FROM,
            }),
        ]
    },
}

// Clip timeline

const CLIP_TIMELINE = source('components/ClipTimeline.tsx')
const CLIP_TIMELINE_DRAG = source('components/clip-timeline-drag.tsx')
const CLIP_TRACKS: TimelineTrack[] = [
    { id: 'titles', name: 'Titles', kind: 'title' },
    { id: 'video', name: 'Video', kind: 'video' },
    { id: 'voice', name: 'Interview', kind: 'audio' },
    { id: 'broll', name: 'B-roll', kind: 'video', locked: true, hidden: true },
]
const CLIPS: TimelineClip[] = [
    { id: 'opening', track: 'titles', start: 0, duration: 3, label: 'Opening' },
    { id: 'wide', track: 'video', start: 0, duration: 6, label: 'harbor-wide' },
    { id: 'pan', track: 'video', start: 6, duration: 4, label: 'juniper-pan' },
    {
        id: 'voice',
        track: 'voice',
        start: 0,
        duration: 8,
        label: 'interview',
        waveform: [0.1, 0.5, 0.9, 0.4, 0.2, 0.6],
    },
    {
        id: 'crane',
        track: 'broll',
        start: 2,
        duration: 3,
        label: 'larkspur-crane',
    },
]
const clipTimeline = (props: Partial<ClipTimelineProps> = {}) =>
    draw(ClipTimeline, {
        tracks: CLIP_TRACKS,
        clips: CLIPS,
        duration: 12,
        playhead: 2,
        onPlayheadChange: noop,
        selected: ['wide'],
        onSelectedChange: noop,
        onClipsChange: noop,
        onTrackChange: noop,
        ...props,
    })
const CLIP_TIMELINES = once(() => clipTimeline())
/** A clip in each kind color, on the video track. */
const CLIP_COLORS = once(() =>
    clipTimeline({
        clips: (['blue', 'green', 'jade', 'pink', 'teal', 'violet'] as const).map((color, index) => ({
            id: color,
            track: 'video',
            start: index * 2,
            duration: 2,
            label: color,
            color,
        })),
        selected: [],
    }),
)
const byData = (elements: El[], name: string, value?: string) =>
    elements.find((element) => element.attrs[name] !== undefined && (value === undefined || element.attrs[name] === value))
const clipOf = (elements: El[], id: string) => byData(elements, 'data-clip', id)
const timelineRuler = (elements: El[]) => byData(elements, 'data-ruler')
const clipCorner = (elements: El[]) => elements.find((element) => classesOf(element).startsWith('sticky top-0 z-1 flex h-8'))
const clipHeaders = (elements: El[]) => elements.find((element) => classesOf(element).startsWith('sticky start-0'))
const rulerTick = (elements: El[]) => {
    const ruler = timelineRuler(elements)
    return elements.find((element) => ruler !== undefined && within(element, ruler) && classesOf(element).includes('border-border-strong'))
}
const minorTick = (elements: El[]) => elements.find((element) => classesOf(element).includes('bottom-0 h-1.5'))
const trackHeader = (elements: El[]) => byData(elements, 'data-track-header', 'video')
const trackName = (elements: El[]) => {
    const header = trackHeader(elements)
    return elements.find((element) => header !== undefined && within(element, header) && classesOf(element).startsWith('truncate text-xs'))
}
const clipLabel = (elements: El[]) => {
    const clip = clipOf(elements, 'pan')
    return elements.find((element) => clip !== undefined && within(element, clip) && classesOf(element).includes('px-2 pt-1'))
}
/** The grips, the landing, the snap line and the card are drawn only while a drag is under way, by the drag layer: read from the source. */
const CLIP_GRIP = literalAfter(CLIP_TIMELINE, 'function Grip(', 'className={cn(')
const LANDING = literalAfter(CLIP_TIMELINE, 'data-landing', 'className={cn(')
const LANDS = /proposal\.fits \? '([^']+)' : '([^']+)'/.exec(CLIP_TIMELINE)
const ARRIVES = /landing\.fits \? '([^']+)' : '([^']+)'/.exec(CLIP_TIMELINE)
const SNAP_LINE = literalAfter(CLIP_TIMELINE, '(proposal?.snapped ?? landing?.snapped) !== undefined && (', 'className=')
const CARRY_CARD = literalAfter(CLIP_TIMELINE, 'function CarryCard(', '<span className=')
const kindsIn = (text: string, type: string) =>
    [...(new RegExp(`export type ${type} = ([^\\n]+)`).exec(text)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1])

const CLIP_TIMELINE_ADAPTER: Adapter = {
    wordObjects: { CLIP_TIMELINE_WORDS },
    complete: ['CLIP_TIMELINE_WORDS'],
    words: {
        label: 'CLIP_TIMELINE_WORDS.label',
        playhead: 'CLIP_TIMELINE_WORDS.playhead',
        'kinds.video': ['CLIP_TIMELINE_WORDS.kinds', (said: Record<string, string>) => said.video],
        'kinds.audio': ['CLIP_TIMELINE_WORDS.kinds', (said: Record<string, string>) => said.audio],
        'kinds.title': ['CLIP_TIMELINE_WORDS.kinds', (said: Record<string, string>) => said.title],
        mute: 'CLIP_TIMELINE_WORDS.mute',
        lock: 'CLIP_TIMELINE_WORDS.lock',
        hide: 'CLIP_TIMELINE_WORDS.hide',
        clip: [
            'CLIP_TIMELINE_WORDS.clip',
            (said: (label: string, start: string, end: string) => string, fill) =>
                said(String(fill.label), String(fill.start), String(fill.end)),
        ],
        start: ['CLIP_TIMELINE_WORDS.start', (said: (at: string) => string, fill) => said(String(fill.at))],
        length: ['CLIP_TIMELINE_WORDS.length', (said: (length: string) => string, fill) => said(String(fill.length))],
        moved: [
            'CLIP_TIMELINE_WORDS.moved',
            (said: (clip: string, at: string) => string, fill) => said(String(fill.clip), String(fill.at)),
        ],
        movedTo: [
            'CLIP_TIMELINE_WORDS.moved',
            (said: (clip: string, at: string, track: string) => string, fill) =>
                said(String(fill.clip), String(fill.at), String(fill.track)),
        ],
        trimmed: [
            'CLIP_TIMELINE_WORDS.trimmed',
            (said: (clip: string, length: string) => string, fill) => said(String(fill.clip), String(fill.length)),
        ],
        split: [
            'CLIP_TIMELINE_WORDS.split',
            (said: (clip: string, at: string) => string, fill) => said(String(fill.clip), String(fill.at)),
        ],
        deleted: [
            'CLIP_TIMELINE_WORDS.deleted',
            (said: (count: number, ripple: boolean) => string, fill) => said(Number(fill.count), false),
        ],
        deletedRipple: [
            'CLIP_TIMELINE_WORDS.deleted',
            (said: (count: number, ripple: boolean) => string, fill) => said(Number(fill.count), true),
        ],
        blocked: ['CLIP_TIMELINE_WORDS.blocked', (said: (clip: string) => string, fill) => said(String(fill.clip))],
        dropped: [
            'CLIP_TIMELINE_WORDS.dropped',
            (said: (item: string, track: string, at: string) => string, fill) =>
                said(String(fill.item), String(fill.track), String(fill.at)),
        ],
        at: ['CLIP_TIMELINE_WORDS.at', (said: (at: string) => string, fill) => said(String(fill.at))],
        zoomIn: 'CLIP_TIMELINE_WORDS.zoomIn',
        zoomOut: 'CLIP_TIMELINE_WORDS.zoomOut',
        zoomFit: 'CLIP_TIMELINE_WORDS.zoomFit',
    },
    options: {
        kind: kindsIn(CLIP_TIMELINE, 'ClipTrackKind'),
        color: /color\?: KindColor/.test(CLIP_TIMELINE) ? kindsIn(source('lib/kind.ts'), 'KindColor') : [],
    },
    size: (size) => {
        const drawn = CLIP_TIMELINES()
        const read: Record<string, Where | undefined> = {
            corner: pieceWhere(clipCorner(drawn)),
            trackHeader: pieceWhere(trackHeader(drawn)),
            kindIcon: pieceWhere(iconOf(drawn, trackHeader(drawn))),
            trackName: pieceWhere(trackName(drawn)),
            ruler: pieceWhere(timelineRuler(drawn)),
            tick: pieceWhere(rulerTick(drawn)),
            minorTick: pieceWhere(minorTick(drawn)),
            playhead: pieceWhere(byData(drawn, 'data-playhead')),
            lane: pieceWhere(byData(drawn, 'data-track-lane', 'video')),
            clipLabel: pieceWhere(clipLabel(drawn)),
            grip: { layers: [CLIP_GRIP], on: [] },
            card: { layers: [DRAG_CARD, CARRY_CARD], on: [] },
        }
        return read[size]
    },
    paint: (group, name, state) => {
        if (group === 'variants') {
            const drawn = CLIP_COLORS()
            return pieceWhere(clipOf(drawn, name))
        }
        const drawn = CLIP_TIMELINES()
        switch (name) {
            case 'box':
                return pieceWhere(drawn[0])
            case 'corner':
                return pieceWhere(clipCorner(drawn))
            case 'headers':
                return pieceWhere(clipHeaders(drawn))
            case 'trackHeader':
                return pieceWhere(trackHeader(drawn))
            case 'kindIcon':
                return pieceWhere(iconOf(drawn, trackHeader(drawn)))
            case 'trackName':
                return pieceWhere(trackName(drawn))
            case 'ruler':
                return pieceWhere(timelineRuler(drawn))
            case 'tick':
                return pieceWhere(rulerTick(drawn))
            case 'minorTick':
                return pieceWhere(minorTick(drawn))
            case 'playhead':
                return pieceWhere(byData(drawn, 'data-playhead'), state === 'focus' ? ['focus-visible'] : [])
            case 'lane':
                return pieceWhere(byData(drawn, 'data-track-lane', state === 'locked' ? 'broll' : 'video'))
            case 'clip': {
                const id = state === 'chosen' ? 'wide' : state === 'faded' ? 'crane' : state === 'title' ? 'opening' : 'pan'
                return pieceWhere(clipOf(drawn, id), state === 'focus' ? ['focus-visible'] : [])
            }
            case 'clipLabel':
                return pieceWhere(clipLabel(drawn))
            case 'waveform': {
                const clip = clipOf(drawn, 'voice')
                return pieceWhere(drawn.find((element) => clip !== undefined && element.tag === 'svg' && within(element, clip)))
            }
            case 'landing':
                if (state === 'arriving') return { layers: [LANDING, ARRIVES?.[1] ?? ''], on: [] }
                return {
                    layers: [LANDING, (state === 'blocked' ? LANDS?.[2] : LANDS?.[1]) ?? ''],
                    on: [],
                }
            case 'snapLine':
                return { layers: [SNAP_LINE], on: [] }
            case 'card':
                return { layers: [DRAG_CARD, CARRY_CARD], on: [] }
            default:
                return undefined
        }
    },
    effect: () => skip('the clip timeline states no effects'),
    keys: {
        Tab: () => {
            const drawn = CLIP_TIMELINES()
            const order = [
                drawn.find((element) => element.tag === 'button' && element.attrs['aria-label'] === CLIP_TIMELINE_WORDS.hide),
                byData(drawn, 'data-playhead'),
                clipOf(drawn, 'opening'),
                clipOf(drawn, 'wide'),
            ]
            const places = order.map((element) => (element === undefined ? -1 : drawn.indexOf(element)))
            const reached =
                order.every((element) => focusable(element) && (element?.tag === 'button' || element?.attrs.tabindex === '0')) &&
                places.every((place, index) => place >= 0 && (index === 0 || place > places[index - 1]))
            return reached ? true : `drawn in another order, or out of the tab order: ${places.join(', ')}`
        },
        'Enter, Space (a clip has focus)': () =>
            /if \(event\.key !== 'Enter' && event\.key !== ' '\) return[\s\S]{0,80}onChoose\(clip\.id, event\.shiftKey \|\| event\.metaKey \|\| event\.ctrlKey\)/.test(
                CLIP_TIMELINE,
            )
                ? true
                : 'Enter and Space do not choose a clip',
        'ArrowLeft, ArrowRight (focus is inside the timeline)': () =>
            /else seek\(playhead \+ sign \* \(event\.shiftKey \? 1 : frame\), true\)/.test(CLIP_TIMELINE)
                ? true
                : 'the arrows do not move the playhead a frame, a second with Shift',
        'Home, End (focus is inside the timeline)': () =>
            /seek\(event\.key === 'Home' \? 0 : total, true\)/.test(CLIP_TIMELINE) ? true : 'Home and End do not reach the ends',
        'Alt+ArrowLeft, Alt+ArrowRight (focus is inside the timeline and onClipsChange is given)': () =>
            /if \(event\.altKey\) nudge\(sign \* frame\)/.test(CLIP_TIMELINE) &&
            /if \(onClipsChange === undefined\) return/.test(CLIP_TIMELINE)
                ? true
                : 'Alt and the arrows do not move the chosen clips a frame',
        'S (focus is inside the timeline and onSplit is given)': () =>
            /\(event\.key === 's' \|\| event\.key === 'S'\) && !mod && !event\.altKey && onSplit !== undefined/.test(CLIP_TIMELINE)
                ? true
                : 'S does not split',
        'Delete, Backspace (focus is inside the timeline, onDelete is given and a clip is chosen)': () =>
            /\(event\.key === 'Delete' \|\| event\.key === 'Backspace'\) && !mod && onDelete !== undefined && chosen\.length > 0/.test(
                CLIP_TIMELINE,
            ) && /remove\(event\.shiftKey\)/.test(CLIP_TIMELINE)
                ? true
                : 'Delete and Backspace do not delete, Shift rippling',
        'Escape (a pointer drags a clip or a grip)': () =>
            /onDragCancel=\{\(\) => \{\s+onCancel\(\)/.test(CLIP_TIMELINE_DRAG)
                ? true
                : "the drag engine's cancel does not put the clip back",
    },
    more: () => {
        const drawn = CLIP_TIMELINES()
        return layoutChecks('clip-timeline', {
            headerWidth: () => resolve([classesOf(clipHeaders(drawn))], ['sm'], READ.width),
            headerWidthNarrow: () => lengthOn(clipHeaders(drawn), READ.width),
            rowHeight: () => lengthOn(byData(drawn, 'data-track-lane', 'video'), READ.height),
            rulerHeight: () => lengthOn(timelineRuler(drawn), READ.height),
            clipInset: () => lengthOn(clipOf(drawn, 'pan'), lengthOf('inset-y-')),
            clipMinWidth: () => numberIn(CLIP_TIMELINE, /Math\.max\(clip\.duration \* pps, (\d+)\)/),
            gripWidth: () => resolve([CLIP_GRIP], [], READ.width),
            snapReach: () => numberIn(CLIP_TIMELINE, /const SNAP_REACH = (\d+)\b/),
            tickRoom: () => numberIn(CLIP_TIMELINE, /const TICK_ROOM = (\d+)\b/),
            minorTickMin: () => numberIn(CLIP_TIMELINE, /if \(minor \* pps < (\d+)\) return/),
            fitPixelsPerSecond: () => String(CLIP_TIMELINE_FIT.pixelsPerSecond),
            fitRoom: () => String(CLIP_TIMELINE_FIT.room),
            defaultRoom: () => numberIn(CLIP_TIMELINE, /const room = viewport \|\| (\d+)/),
            zoomMin: () => String(CLIP_TIMELINE_ZOOM.min),
            zoomMax: () => String(CLIP_TIMELINE_ZOOM.max),
            cardOffset: CARD_OFFSET,
            dragFrom: DRAG_FROM,
        })
    },
}

// Emoji picker

const EMOJI_PICKER = source('components/EmojiPicker.tsx')
/** Drawn on the server the list has not loaded: the grid's cells, headings and messages are read from the source. */
const emojiPicker = once(() => draw(EmojiPicker, { onPick: noop, recent: ['\u{1F44D}'], autoFocus: false }))
const TONE_CHOICE = literalAfter(EMOJI_PICKER, 'role="radiogroup"', 'className=')
const TONE_HAND = literalAfter(EMOJI_PICKER, 'role="radio"', 'className={cn(')
const TONE_CHOSEN = /tone === index && '([^']+)'/.exec(EMOJI_PICKER)?.[1] ?? ''
const EMOJI_HEADING = literalAfter(EMOJI_PICKER, '<h3 className=')
const EMOJI_CELL = literalAfter(EMOJI_PICKER, 'data-index={cell.index}', 'className=')
const EMOJI_FAILED = literalAfter(EMOJI_PICKER, 'role="alert"', 'className=')
const EMOJI_EMPTY = literalAfter(EMOJI_PICKER, '<p role="status" className=')
const emojiTabs = (elements: El[]) => elements.find((element) => element.attrs.role === 'toolbar')
/** A tab: the current one (Recent, the first while nothing is in view), or another. */
const emojiTab = (elements: El[], current: boolean) => {
    const tabs = emojiTabs(elements)
    return elements.find(
        (element) =>
            tabs !== undefined &&
            element.tag === 'button' &&
            element.parent === tabs &&
            (element.attrs['aria-current'] === 'true') === current,
    )
}
const toneButton = (elements: El[]) => elements.find((element) => element.attrs['aria-label'] === EMOJI_PICKER_WORDS.skinTone)
const EMOJI_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    disabled: ['disabled'],
}

const EMOJI_PICKER_ADAPTER: Adapter = {
    wordObjects: { EMOJI_PICKER_WORDS },
    complete: ['EMOJI_PICKER_WORDS'],
    words: {
        search: 'EMOJI_PICKER_WORDS.search',
        searchLabel: 'EMOJI_PICKER_WORDS.searchLabel',
        ...Object.fromEntries(
            ['recent', 'smileys', 'people', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'].map((group) => [
                `groups.${group}`,
                ['EMOJI_PICKER_WORDS.groups', (said: Record<string, string>) => said[group]] as WordSource,
            ]),
        ),
        results: 'EMOJI_PICKER_WORDS.results',
        empty: 'EMOJI_PICKER_WORDS.empty',
        loading: 'EMOJI_PICKER_WORDS.loading',
        failed: 'EMOJI_PICKER_WORDS.failed',
        retry: 'EMOJI_PICKER_WORDS.retry',
        skinTone: 'EMOJI_PICKER_WORDS.skinTone',
        ...Object.fromEntries(
            ['default', 'light', 'mediumLight', 'medium', 'mediumDark', 'dark'].map((tone, index) => [
                `tones.${tone}`,
                ['EMOJI_PICKER_WORDS.tones', (said: readonly string[]) => said[index]] as WordSource,
            ]),
        ),
        tabs: 'EMOJI_PICKER_WORDS.tabs',
        label: 'EMOJI_PICKER_WORDS.label',
    },
    options: {
        skinTone: [...(/export type SkinTone = ([^\n]+)/.exec(source('components/emoji-data.ts'))?.[1] ?? '').matchAll(/\d+/g)].map(
            (match) => match[0],
        ),
    },
    size: (size, key) => {
        const drawn = emojiPicker()
        const tab = emojiTab(drawn, false)
        const read: Record<string, Where | undefined> = {
            box: pieceWhere(byData(drawn, 'data-slot', 'emoji-picker')),
            head: pieceWhere(toneButton(drawn)?.parent),
            toneButton: pieceWhere(toneButton(drawn)),
            toneChoice: { layers: [TONE_CHOICE], on: [] },
            grid: pieceWhere(drawn.find((element) => classesOf(element).includes('overscroll-contain'))),
            heading: { layers: [EMOJI_HEADING], on: [] },
            cell: { layers: [EMOJI_CELL], on: [] },
            tabs: pieceWhere(emojiTabs(drawn)),
            tab: pieceWhere(tab, key === 'icon' ? SVG_ON : []),
            tabMark: pieceWhere(emojiTab(drawn, true), ['after']),
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const drawn = emojiPicker()
        const on = EMOJI_ON[state] ?? []
        switch (name) {
            case 'box':
                return pieceWhere(byData(drawn, 'data-slot', 'emoji-picker'))
            case 'toneButton':
                return pieceWhere(toneButton(drawn), on)
            case 'toneChoice':
                return {
                    layers: [TONE_HAND, state === 'chosen' ? TONE_CHOSEN : ''],
                    on,
                }
            case 'heading':
                return { layers: [EMOJI_HEADING], on: [] }
            case 'cell':
                return { layers: [EMOJI_CELL], on }
            case 'tabs':
                return pieceWhere(emojiTabs(drawn))
            case 'tab':
                return pieceWhere(emojiTab(drawn, state === 'current'), on)
            case 'tabMark':
                return pieceWhere(emojiTab(drawn, state === 'current'), ['after'])
            case 'loading':
                return pieceWhere(drawn.find((element) => element.tag === 'svg' && classesOf(element).includes('size-6')))
            case 'failed':
                return { layers: [EMOJI_FAILED], on: [] }
            case 'empty':
                return { layers: [EMOJI_EMPTY], on: [] }
            default:
                return undefined
        }
    },
    effect: (state) => (state === 'disabled' ? pieceWhere(emojiTab(emojiPicker(), false), ['disabled']) : skip(`no effect of ${state}`)),
    keys: {
        'ArrowDown (the search has focus and the grid holds emoji)': () =>
            /event\.key === 'ArrowDown' && cells\.length > 0\) \{\s+event\.preventDefault\(\)\s+moveTo\(focused\)/.test(EMOJI_PICKER)
                ? true
                : 'Down from the search does not enter the grid',
        'Enter (the search has focus and holds a query that found any)': () =>
            /event\.key === 'Enter' && searching && cells\.length > 0\) \{\s+event\.preventDefault\(\)\s+pick\(cells\[0\]\.emoji, cells\[0\]\.name\)/.test(
                EMOJI_PICKER,
            )
                ? true
                : 'Enter in the search does not pick the first found',
        'ArrowLeft, ArrowRight (a cell has focus)': () =>
            /ArrowLeft: \(\) => focused - 1,\s+ArrowRight: \(\) => focused \+ 1,/.test(EMOJI_PICKER) &&
            /Math\.max\(0, Math\.min\(cells\.length - 1, index\)\)/.test(EMOJI_PICKER)
                ? true
                : 'the arrows do not move across the cells, stopping at the ends',
        'ArrowUp, ArrowDown (a cell has focus)': () =>
            /ArrowUp: \(\) => inRow\(row - 1\),\s+ArrowDown: \(\) => inRow\(row \+ 1\),/.test(EMOJI_PICKER) &&
            /if \(event\.key === 'ArrowUp' && row === 0\) return search\.current\?\.focus\(\)/.test(EMOJI_PICKER)
                ? true
                : 'Up and Down do not move by rows, Up from the first back to the search',
        'Home, End (a cell has focus)': () =>
            /Home: \(\) => 0,\s+End: \(\) => cells\.length - 1,/.test(EMOJI_PICKER) ? true : 'Home and End do not reach the ends',
        'Enter, Space (a cell has focus)': () =>
            /type="button"\s+data-index=\{cell\.index\}/.test(EMOJI_PICKER) &&
            /onClick=\{\(\) => pick\(cell\.emoji, cell\.name\)\}/.test(EMOJI_PICKER)
                ? true
                : 'a cell is not a native button that picks',
        'ArrowLeft, ArrowRight (a tab has focus)': () =>
            STOPS_AT_ENDS.test(EMOJI_PICKER) && /onKeyDown=\{onTabsKey\}/.test(EMOJI_PICKER)
                ? true
                : 'the arrows do not move between the tabs, stopping at the ends',
        'Enter, Space (a tab has focus)': () =>
            emojiTab(emojiPicker(), false)?.attrs.type === 'button' &&
            /const showGroup = \(group: EmojiSection\) => \{\s+setQuery\(''\)/.test(EMOJI_PICKER)
                ? true
                : 'a tab is not a native button that clears the search',
        'Escape (focus is in the picker and the tone choice is not open)': () =>
            /event\.key === 'Escape' && query !== ''\) \{[\s\S]{0,120}event\.stopPropagation\(\)/.test(EMOJI_PICKER) &&
            /if \(event\.key !== 'Escape' \|\| onClose === undefined \|\| event\.defaultPrevented\) return\s+event\.preventDefault\(\)\s+onClose\(\)/.test(
                EMOJI_PICKER,
            )
                ? true
                : 'Escape does not clear the search, then call onClose',
        'Escape (the tone choice is open)': () =>
            /if \(event\.key === 'Escape'\) \{\s+event\.stopPropagation\(\)\s+setToneOpen\(false\)\s+requestAnimationFrame\(\(\) => toneButton\.current\?\.focus\(\)\)/.test(
                EMOJI_PICKER,
            )
                ? true
                : 'Escape does not close the tone choice, focus back on its button',
    },
    more: () => {
        const box = byData(emojiPicker(), 'data-slot', 'emoji-picker')
        return layoutChecks('emoji-picker', {
            columns: () => (/grid grid-cols-8/.test(EMOJI_PICKER) ? numberIn(EMOJI_PICKER, /const COLUMNS = (\d+)\b/) : undefined),
            boxWidth: () => lengthOn(box, READ.width),
            boxHeight: () => lengthOn(box, READ.height),
            firstPaint: () => numberIn(EMOJI_PICKER, /const FIRST_PAINT = (\d+)\b/),
            inView: () => numberIn(EMOJI_PICKER, /section\.offsetTop <= box\.scrollTop \+ (\d+)\)/),
            popoverEdge: () => numberIn(EMOJI_PICKER, /collisionPadding=\{(\d+)\}/),
        })
    },
}

// Reaction bar and reaction chips

const REACTION_BAR = source('components/ReactionBar.tsx')
/** The bar's own words: its full list's are the emoji picker's, passed through `picker`. */
const { picker: _pickerWords, ...REACTION_BAR_OWN } = REACTION_BAR_WORDS
const reactionBar = (props: Partial<ReactionBarProps> = {}) => draw(ReactionBar, { onReact: noop, selected: ['❤️'], ...props })
const REACTION_BARS = once(() => ({
    md: reactionBar(),
    sm: reactionBar({ size: 'sm' }),
}))
const REACTIONS: ChatReaction[] = [
    { id: 'thumbs', icon: '\u{1F44D}', label: 'thumbs up', count: 3, mine: true },
    { id: 'party', icon: '\u{1F389}', label: 'party popper', count: 1 },
]
const reactionChips = once(() =>
    draw(
        TooltipProvider,
        {},
        createElement(ReactionChips, {
            reactions: REACTIONS,
            onReact: noop,
            onReaction: noop,
        }),
    ),
)
const byLabel = (elements: El[], label: string) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === label)
const chipOf = (elements: El[], title: string) => elements.find((element) => element.tag === 'button' && element.attrs.title === title)
const REACTION_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    pressed: ['aria-pressed'],
    open: ['data-popup-open'],
}

const REACTION_BAR_ADAPTER: Adapter = {
    wordObjects: { REACTION_BAR_OWN, REACTION_CHIPS_WORDS },
    complete: ['REACTION_BAR_OWN', 'REACTION_CHIPS_WORDS'],
    words: {
        label: 'REACTION_BAR_OWN.label',
        more: 'REACTION_BAR_OWN.more',
        react: 'REACTION_CHIPS_WORDS.react',
        count: [
            'REACTION_CHIPS_WORDS.count',
            (said: (label: string, count: number) => string, fill) => said(String(fill.label), Number(fill.count)),
        ],
    },
    options: { size: propValues(REACTION_BAR, 'ReactionBarProps', 'size') },
    size: (size, key) => {
        const { md, sm } = REACTION_BARS()
        const chips = reactionChips()
        const add = byLabel(chips, REACTION_CHIPS_WORDS.react)
        const read: Record<string, Where | undefined> = {
            bar: pieceWhere(byData(md, 'data-slot', 'reaction-bar')),
            reaction: pieceWhere(byLabel(md, 'thumbs up')),
            reactionSm: pieceWhere(byLabel(sm, 'thumbs up')),
            more: pieceWhere(byLabel(md, REACTION_BAR_WORDS.more), SVG_ON),
            chips: pieceWhere(byData(chips, 'data-slot', 'reaction-chips')),
            chip: pieceWhere(chipOf(chips, 'party popper'), key === 'icon' ? SVG_ON : []),
            chipCount: pieceWhere(chips.find((element) => classesOf(element).includes('tabular-nums'))),
            add: key === 'icon' ? pieceWhere(iconOf(chips, add)) : pieceWhere(add),
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const { md, sm } = REACTION_BARS()
        const chips = reactionChips()
        const on = REACTION_ON[state] ?? []
        switch (name) {
            case 'bar':
                return pieceWhere(byData(md, 'data-slot', 'reaction-bar'))
            case 'reaction':
                return pieceWhere(byLabel(state === 'sm' ? sm : md, state === 'pressed' ? 'red heart' : 'thumbs up'), on)
            case 'more':
                return pieceWhere(byLabel(md, REACTION_BAR_WORDS.more), on)
            case 'chip':
                return pieceWhere(chipOf(chips, state === 'mine' ? 'thumbs up' : 'party popper'), on)
            case 'chipCount':
                return pieceWhere(chips.find((element) => classesOf(element).includes('tabular-nums')))
            case 'add':
                return pieceWhere(byLabel(chips, REACTION_CHIPS_WORDS.react), on)
            default:
                return undefined
        }
    },
    effect: () => skip('the reaction bar states no effects'),
    keys: {
        'ArrowLeft, ArrowRight (a button of the bar has focus)': () =>
            /querySelectorAll<HTMLButtonElement>\('\[data-reaction\]'\)/.test(REACTION_BAR) &&
            STOPS_AT_ENDS.test(REACTION_BAR) &&
            byLabel(REACTION_BARS().md, REACTION_BAR_WORDS.more)?.attrs['data-reaction'] !== undefined
                ? true
                : "the arrows do not move between the bar's buttons, the more button included, stopping at the ends",
        'Enter, Space (a button of the bar has focus)': () =>
            byLabel(REACTION_BARS().md, 'thumbs up')?.attrs.type === 'button' ? true : 'a reaction is not a native button',
        'Enter, Space (a chip or the add button has focus)': () =>
            chipOf(reactionChips(), 'party popper')?.attrs.type === 'button' ? true : 'a chip is not a native button',
        'Escape (a popover of the bar is open)': BASE_UI('Popover', 'closes on Escape and puts focus back on its trigger'),
    },
    more: () =>
        layoutChecks('reaction-bar', {
            popoverEdge: () => numberIn(REACTION_BAR, /collisionPadding=\{(\d+)\}/),
        }),
}

// The suggestions both composers share: their keys, read from the hook and the key map.

const MENTIONS = source('components/Mentions.tsx')
/** The suggestions' English defaults, read from their private module, which both composers spread under their own `mentions`. */
const MENTION_WORDS = Object.fromEntries(
    [...(/export const MENTION_WORDS: MentionWords = \{([^}]+)\}/.exec(MENTIONS)?.[1] ?? '').matchAll(/(\w+): '([^']*)'/g)].map((match) => [
        match[1],
        match[2],
    ]),
)
const MENTION_KEYS = source('lib/mentions.ts')
const TOUCH_READ_ONCE = /const \[touch\] = useState\(touchTyping\)/
const touchScreen = () => /'\(pointer: coarse\) and \(hover: none\)'/.test(source('lib/keys.ts'))
const MENTION_PROBES: Adapter['keys'] = {
    'ArrowDown, ArrowUp (the suggestion list is open)': () =>
        /setActive\(\(current\) => Math\.min\(current \+ 1, found\.length - 1\)\)/.test(MENTIONS) &&
        /setActive\(\(current\) => Math\.max\(current - 1, 0\)\)/.test(MENTIONS)
            ? true
            : 'the arrows do not move through the people, stopping at the ends',
    'Enter, Tab (the suggestion list is open)': () =>
        /const choose = key === 'Enter' \|\| key === 'Tab'/.test(MENTION_KEYS) &&
        /if \(choose && searching\) return 'hold'/.test(MENTION_KEYS)
            ? true
            : 'Enter and Tab do not put the person in, waiting on a search',
    'Escape (the suggestion list is open)': () =>
        /if \(key === 'Escape'\) return 'close'/.test(MENTION_KEYS) ? true : 'Escape does not close the suggestions',
}
const MENTION_WORD_SOURCES: Record<string, WordSource> = {
    'mentions.label': 'MENTION_WORDS.label',
    'mentions.empty': 'MENTION_WORDS.empty',
    'mentions.searching': 'MENTION_WORDS.searching',
}

// Composer

const COMPOSER = source('components/Composer.tsx')
/** The composer's own words: its players', dictation's and mentions' are other objects, checked on their own. */
const { player: _composerPlayer, dictation: _composerDictation, mentions: _composerMentions, ...COMPOSER_OWN } = COMPOSER_WORDS
const COMPOSER_FILES: ComposerAttachment[] = [{ id: 'log', name: 'validate.log', kind: 'file', detail: '14 KB' }]
const composer = (props: Partial<ComposerProps> = {}) =>
    draw(Composer, {
        value: 'Why did nightly-export fail?',
        onChange: noop,
        onSend: noop,
        onAttach: noop,
        onRemove: noop,
        attachments: COMPOSER_FILES,
        ...props,
    })
const COMPOSERS = once(() => ({
    full: composer(),
    empty: composer({ value: '', attachments: [] }),
    busy: composer({ busy: true, onStop: noop }),
    inline: composer({ value: '', attachments: [], layout: 'inline' }),
    disabled: composer({ disabled: true }),
}))
const COMPOSER_OVER = /over && '([^']+)'/.exec(COMPOSER)?.[1] ?? ''
const COMPOSER_FAILURE = literalAfter(COMPOSER, 'role="alert"', 'className={cn(')
const COMPOSER_STRIP = literalAfter(COMPOSER, 'aria-label={words.recording} className=')
const COMPOSER_DROP = literalAfter(COMPOSER, '{over && (', 'className=')
const textArea = (elements: El[]) => elements.find((element) => element.tag === 'textarea')
const fileChip = (elements: El[]) => elements.find((element) => classesOf(element).startsWith('flex h-14'))
const removeButton = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-label']?.startsWith(COMPOSER_WORDS.remove) === true)
const COMPOSER_ON: Record<string, string[]> = {
    hover: ['hover'],
    within: ['focus-within'],
}

const COMPOSER_ADAPTER: Adapter = {
    wordObjects: { COMPOSER_OWN, COMPOSER_DICTATION_WORDS, MENTION_WORDS },
    complete: ['COMPOSER_OWN', 'COMPOSER_DICTATION_WORDS', 'MENTION_WORDS'],
    words: {
        ...Object.fromEntries(Object.keys(COMPOSER_OWN).map((key) => [key, `COMPOSER_OWN.${key}`])),
        ...Object.fromEntries(Object.keys(COMPOSER_DICTATION_WORDS).map((key) => [`dictation.${key}`, `COMPOSER_DICTATION_WORDS.${key}`])),
        ...MENTION_WORD_SOURCES,
    },
    options: {
        kind: [...(/\n\s+kind: ([^\n]+)/.exec(COMPOSER)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]),
        layout: kindsIn(COMPOSER, 'ComposerLayout'),
    },
    size: (size, key) => {
        const { full, inline } = COMPOSERS()
        const read: Record<string, Where | undefined> = {
            text: pieceWhere(textArea(full)),
            textInline: pieceWhere(textArea(inline)),
            inline: pieceWhere(inline[0]),
            row: pieceWhere(full.find((element) => classesOf(element) === 'flex items-center gap-1 px-2 pb-2')),
            button: pieceWhere(byLabel(full, COMPOSER_WORDS.send)),
            buttonInline: pieceWhere(byLabel(inline, COMPOSER_WORDS.send)),
            attachments: pieceWhere(full.find((element) => element.tag === 'ul')),
            fileChip: pieceWhere(fileChip(full)),
            remove: pieceWhere(removeButton(full)),
            failure: { layers: [COMPOSER_FAILURE], on: [] },
            dictationStrip: { layers: [COMPOSER_STRIP], on: [] },
            dropOverlay: { layers: [COMPOSER_DROP], on: [] },
        }
        // The remove button's X has a size of its own.
        if (size === 'remove' && key === 'icon') return pieceWhere(iconOf(full, removeButton(full)))
        return read[size]
    },
    paint: (_, name, state) => {
        const { full, empty, busy } = COMPOSERS()
        const on = COMPOSER_ON[state] ?? []
        switch (name) {
            case 'box':
                return state === 'over' ? { layers: [classesOf(full[0]), COMPOSER_OVER], on: [] } : pieceWhere(full[0], on)
            case 'text':
                return pieceWhere(textArea(full))
            case 'attach':
                return pieceWhere(byLabel(full, COMPOSER_WORDS.attach), on)
            case 'send':
                return pieceWhere(byLabel(state === 'notReady' ? empty : full, COMPOSER_WORDS.send), on)
            case 'stop':
                return pieceWhere(byLabel(busy, COMPOSER_WORDS.stop))
            case 'fileChip':
                return pieceWhere(fileChip(full))
            case 'remove':
                return pieceWhere(removeButton(full), on)
            case 'dropOverlay':
                return { layers: [COMPOSER_DROP], on: [] }
            case 'failure':
                return { layers: [COMPOSER_FAILURE], on: [] }
            default:
                return undefined
        }
    },
    effect: (state) => {
        const { empty, disabled } = COMPOSERS()
        if (state === 'notReady') return pieceWhere(byLabel(empty, COMPOSER_WORDS.send))
        if (state === 'disabled') return pieceWhere(disabled[0])
        return skip(`no effect of ${state}`)
    },
    keys: {
        'Enter (the text has focus, no suggestion list is open, and the screen is not a touch screen)': () =>
            /if \(mention\.onKeyDown\(event\)\) return\s+if \(event\.key !== 'Enter' \|\| event\.shiftKey \|\| touch \|\| composing\(event\)\) return\s+event\.preventDefault\(\)\s+if \(ready\) onSend\(\)/.test(
                COMPOSER,
            )
                ? true
                : 'Enter does not send when ready, past the suggestions, a touch screen and an input method',
        'Shift+Enter (the text has focus)': () =>
            /event\.key !== 'Enter' \|\| event\.shiftKey/.test(COMPOSER) ? true : 'Shift+Enter does not leave the line break to the text',
        'Enter (the text has focus on a touch screen)': () =>
            TOUCH_READ_ONCE.test(COMPOSER) && touchScreen() ? true : 'a touch screen is not read once from a coarse pointer with no hover',
        ...MENTION_PROBES,
        'Escape (a dictation hears, transcribes or has failed)': () =>
            /if \(event\.key !== 'Escape' \|\| \(!hearing && dictation\.state !== 'error'\)\) return[\s\S]{0,160}dictation\.cancel\(\)/.test(
                COMPOSER,
            )
                ? true
                : 'Escape does not cancel the dictation',
    },
    more: () => {
        const { full } = COMPOSERS()
        return layoutChecks('composer', {
            textMaxHeight: () => lengthOn(textArea(full), lengthOf('max-h-')),
            inlineSpare: () => numberIn(COMPOSER, /const INLINE_SPARE = (\d+)\b/),
            cornerEase: () => (/ease-motion/.test(classesOf(full[0])) ? durationIn(classesOf(full[0]), /duration-([a-z0-9]+)/) : undefined),
            mentionListWidth: () => numberIn(MENTIONS, /const LIST_WIDTH = (\d+)\b/),
            mentionListMaxHeight: () => numberIn(MENTIONS, /const LIST_HEIGHT = (\d+)\b/),
            mentionOffset: () => numberIn(MENTIONS, /const OFFSET = (\d+)\b/),
        })
    },
}

// Message composer

const MESSAGE_COMPOSER = source('components/MessageComposer.tsx')
const { markdown: _messageMarkdown, mentions: _messageMentions, format: _messageFormats, ...MESSAGE_COMPOSER_OWN } = MESSAGE_COMPOSER_WORDS
const messageComposer = (props: Partial<MessageComposerProps> = {}) =>
    draw(MessageComposer, {
        value: 'Ship **it**',
        onChange: noop,
        onSend: noop,
        onAttach: noop,
        onMention: noop,
        alsoSendTo: 'harbor',
        ...props,
    })
const MESSAGE_COMPOSERS = once(() => ({
    full: messageComposer(),
    empty: messageComposer({ value: '' }),
    scheduled: messageComposer({
        schedule: [{ id: 'tomorrow', label: 'Tomorrow', detail: '09:00' }],
        onSendLater: noop,
    }),
    emptyScheduled: messageComposer({
        value: '',
        schedule: [{ id: 'tomorrow', label: 'Tomorrow' }],
        onSendLater: noop,
    }),
    previewing: messageComposer({ value: '', mode: 'preview' }),
}))
const toolbarRow = (elements: El[]) => elements.find((element) => classesOf(element).startsWith('relative flex items-center gap-2'))
const groupRule = (elements: El[]) => elements.find((element) => classesOf(element) === 'mx-1 h-4 w-px bg-border')
const actionsRow = (elements: El[]) => elements.find((element) => classesOf(element) === 'flex items-center gap-0.5 px-2 pb-1.5')
const previewBox = (elements: El[]) => elements.find((element) => classesOf(element).includes('max-h-96'))
const MESSAGE_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    pressed: ['aria-pressed'],
    open: ['data-popup-open'],
    disabled: ['disabled'],
    within: ['focus-within'],
}

const MESSAGE_COMPOSER_ADAPTER: Adapter = {
    wordObjects: { MESSAGE_COMPOSER_OWN, MESSAGE_COMPOSER_WORDS, MENTION_WORDS },
    complete: ['MESSAGE_COMPOSER_OWN'],
    words: {
        ...Object.fromEntries(Object.keys(MESSAGE_COMPOSER_OWN).map((key) => [key, `MESSAGE_COMPOSER_OWN.${key}`])),
        ...Object.fromEntries(
            Object.keys(MESSAGE_COMPOSER_WORDS.format).map((format) => [
                `format.${format}`,
                ['MESSAGE_COMPOSER_WORDS.format', (said: Record<string, string>) => said[format]] as WordSource,
            ]),
        ),
        ...MENTION_WORD_SOURCES,
    },
    options: {
        mode: kindsIn(MESSAGE_COMPOSER, 'MessageComposerMode'),
        format: kindsIn(MESSAGE_COMPOSER, 'MessageFormat'),
    },
    size: (size, key) => {
        const { full, previewing, scheduled } = MESSAGE_COMPOSERS()
        const read: Record<string, Where | undefined> = {
            toolbarRow: pieceWhere(toolbarRow(full)),
            toolbar: pieceWhere(full.find((element) => element.attrs.role === 'toolbar')),
            groupRule: pieceWhere(groupRule(full)),
            action: pieceWhere(byLabel(full, MESSAGE_COMPOSER_WORDS.format.bold), key === 'icon' ? SVG_ON : []),
            text: pieceWhere(textArea(full)),
            preview: pieceWhere(previewBox(previewing)),
            alsoSend: pieceWhere(full.find((element) => element.tag === 'label')),
            row: pieceWhere(actionsRow(full)),
            add: pieceWhere(byLabel(full, MESSAGE_COMPOSER_WORDS.attach)),
            send: pieceWhere(byLabel(full, MESSAGE_COMPOSER_WORDS.send)),
            chevron: pieceWhere(byLabel(scheduled, MESSAGE_COMPOSER_WORDS.sendLater)),
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const { full, empty, previewing, scheduled, emptyScheduled } = MESSAGE_COMPOSERS()
        const on = MESSAGE_ON[state] ?? []
        switch (name) {
            case 'box':
                return pieceWhere(full[0], on)
            case 'groupRule':
                return pieceWhere(groupRule(full))
            case 'action':
                return pieceWhere(byLabel(full, MESSAGE_COMPOSER_WORDS.format.bold), on)
            case 'text':
                return pieceWhere(textArea(full))
            case 'preview':
                return pieceWhere(previewBox(previewing))
            case 'alsoSend':
                return pieceWhere(full.find((element) => element.tag === 'label'))
            case 'add':
                return pieceWhere(byLabel(full, MESSAGE_COMPOSER_WORDS.attach), on)
            case 'send':
                return pieceWhere(byLabel(state === 'empty' ? empty : full, MESSAGE_COMPOSER_WORDS.send), on)
            case 'chevron':
                return pieceWhere(byLabel(state === 'empty' ? emptyScheduled : scheduled, MESSAGE_COMPOSER_WORDS.sendLater), on)
            default:
                return undefined
        }
    },
    effect: (state) =>
        state === 'disabled'
            ? pieceWhere(byLabel(MESSAGE_COMPOSERS().full, MESSAGE_COMPOSER_WORDS.format.bold), ['disabled'])
            : skip(`no effect of ${state}`),
    keys: {
        'Enter (the text has focus, no suggestion list is open, and the screen is not a touch screen)': () =>
            /if \(mention\.onKeyDown\(event\)\) return\s+if \(event\.key === 'Enter' && !event\.shiftKey && !touch && !composing\(event\)\) \{\s+event\.preventDefault\(\)\s+if \(!empty\) send\(\)/.test(
                MESSAGE_COMPOSER,
            )
                ? true
                : 'Enter does not send a text that holds something, past the suggestions, a touch screen and an input method',
        'Shift+Enter (the text has focus)': () =>
            /event\.key === 'Enter' && !event\.shiftKey/.test(MESSAGE_COMPOSER)
                ? true
                : 'Shift+Enter does not leave the line break to the text',
        'Enter (the text has focus on a touch screen)': () =>
            TOUCH_READ_ONCE.test(MESSAGE_COMPOSER) && touchScreen()
                ? true
                : 'a touch screen is not read once from a coarse pointer with no hover',
        ...MENTION_PROBES,
        'Enter, Space (an action has focus)': () =>
            byLabel(MESSAGE_COMPOSERS().full, MESSAGE_COMPOSER_WORDS.format.bold)?.attrs.type === 'button'
                ? true
                : 'an action is not a native button',
    },
    more: () => {
        const { full, previewing } = MESSAGE_COMPOSERS()
        const containers = readFileSync(join(ROOT, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8')
        const md = /--container-md: ([\d.]+)rem;/.exec(containers)?.[1]
        return layoutChecks('message-composer', {
            groupGap: () =>
                lengthOn(
                    full.find((element) => element.attrs.role === 'toolbar'),
                    READ.gap,
                ) === numberIn(MESSAGE_COMPOSER, /const GROUP_GAP = (\d+)\b/)
                    ? numberIn(MESSAGE_COMPOSER, /const GROUP_GAP = (\d+)\b/)
                    : undefined,
            textMaxHeight: () => lengthOn(textArea(full), lengthOf('max-h-')),
            previewMaxHeight: () => lengthOn(previewBox(previewing), lengthOf('max-h-')),
            previewFrom: () =>
                /@md\/composer:inline-flex/.test(MESSAGE_COMPOSER) && md !== undefined ? String(Number(md) * 16) : undefined,
        })
    },
}

// Call bar

const CALL_BAR = source('components/CallBar.tsx')
const DEVICES = [
    {
        id: 'microphones',
        label: 'Microphone',
        devices: [
            { id: 'built-in', label: 'Built-in microphone' },
            { id: 'headset', label: 'Headset' },
        ],
        selected: 'built-in',
        onSelect: noop,
    },
]
const callBar = (props: Partial<CallBarProps> = {}) =>
    draw(
        TooltipProvider,
        {},
        createElement(CallBar, {
            onMutedChange: noop,
            microphones: DEVICES,
            onCameraOffChange: noop,
            cameras: DEVICES,
            onSharingChange: noop,
            onReact: noop,
            onHandRaisedChange: noop,
            more: [{ id: 'captions', label: 'Captions', onSelect: noop, checked: false }],
            onLeave: noop,
            ...props,
        }),
    )
const CALL_BARS = once(() => ({
    plain: callBar(),
    off: callBar({ muted: true, sharing: true }),
    docked: callBar({ placement: 'docked' }),
}))
const CALL_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    pressed: ['aria-pressed'],
    open: ['aria-expanded'],
}
const callOn = (state: string) => state.split('+').flatMap((one) => CALL_ON[one] ?? [])
/** The quoted members of a union a type alias names, read from its source. */
const unionOf = (text: string, name: string) =>
    [...(new RegExp(`export type ${name} = ([^\\n]+)`).exec(text)?.[1] ?? '').matchAll(/'([\w-]+)'/g)].map((match) => match[1])
/** The reactions' popover, which a server drawing leaves closed: its classes from the source. */
const CALL_POPOVER = literalAfter(CALL_BAR, '<PopoverContent', 'className=')
/** The bar's own words: the reaction bar's are parts/reaction-bar's, passed through `reactionBar`. */
const { reactionBar: _callReactionWords, ...CALL_BAR_OWN } = CALL_BAR_WORDS
const toolbarOf = (elements: El[]) => elements.find((element) => element.attrs.role === 'toolbar')

const CALL_BAR_ADAPTER: Adapter = {
    wordObjects: { CALL_BAR_OWN },
    complete: ['CALL_BAR_OWN'],
    words: Object.fromEntries(Object.keys(CALL_BAR_OWN).map((key) => [key, `CALL_BAR_OWN.${key}`])),
    options: {
        openMenu: unionOf(CALL_BAR, 'CallBarMenu'),
        placement: propValues(CALL_BAR, 'CallBarProps', 'placement'),
    },
    size: (size, key) => {
        const { plain, docked } = CALL_BARS()
        const read: Record<string, Where | undefined> = {
            frame: pieceWhere(byData(docked, 'data-slot', 'call-bar')),
            bar: pieceWhere(toolbarOf(plain)),
            control: pieceWhere(byLabel(plain, CALL_BAR_WORDS.share), key === 'icon' ? SIZE_ON.icon : []),
            devices: pieceWhere(byLabel(plain, CALL_BAR_WORDS.microphoneDevices), key === 'icon' ? SVG_ON : []),
            leave: pieceWhere(byLabel(plain, CALL_BAR_WORDS.leave), key === 'icon' ? SIZE_ON.icon : []),
            reactionsPopover: { layers: [CALL_POPOVER], on: [] },
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const { plain, off, docked } = CALL_BARS()
        const on = callOn(state)
        const turnedOff = state.split('+').includes('off')
        switch (name) {
            case 'frame':
                return pieceWhere(byData(docked, 'data-slot', 'call-bar'))
            case 'bar':
                return pieceWhere(toolbarOf(plain))
            case 'control':
                if (turnedOff) return pieceWhere(byLabel(off, CALL_BAR_WORDS.unmute), on)
                return pieceWhere(byLabel(state === 'pressed' ? off : plain, CALL_BAR_WORDS.share), on)
            case 'devices':
                return pieceWhere(byLabel(turnedOff ? off : plain, CALL_BAR_WORDS.microphoneDevices), on)
            case 'leave':
                return pieceWhere(byLabel(plain, CALL_BAR_WORDS.leave), on)
            default:
                return undefined
        }
    },
    effect: (state) => (state === 'focus' ? pieceWhere(byLabel(CALL_BARS().plain, CALL_BAR_WORDS.share), ['focus-visible']) : undefined),
    keys: {
        'ArrowLeft, ArrowRight (a control of the bar has focus)': () =>
            /querySelectorAll<HTMLButtonElement>\('\[data-call-control\]'\)/.test(CALL_BAR) && STOPS_AT_ENDS.test(CALL_BAR)
                ? true
                : "the arrows do not move between the bar's controls, stopping at the ends",
        'Enter, Space (a control of the bar has focus)': () =>
            byLabel(CALL_BARS().plain, CALL_BAR_WORDS.share)?.attrs.type === 'button' ? true : 'a control is not a native button',
        'Mod+D (shortcuts, with onMutedChange)': () =>
            CALL_BAR_SHORTCUTS.microphone !== false &&
            CALL_BAR_SHORTCUTS.microphone.key === 'd' &&
            CALL_BAR_SHORTCUTS.microphone.mod === true
                ? true
                : `the microphone's key is ${JSON.stringify(CALL_BAR_SHORTCUTS.microphone)}`,
        'Mod+E (shortcuts, with onCameraOffChange)': () =>
            CALL_BAR_SHORTCUTS.camera !== false && CALL_BAR_SHORTCUTS.camera.key === 'e' && CALL_BAR_SHORTCUTS.camera.mod === true
                ? true
                : `the camera's key is ${JSON.stringify(CALL_BAR_SHORTCUTS.camera)}`,
        'Escape (a menu or the reaction bar of the bar is open)': BASE_UI(
            'Menu and Popover',
            'close on Escape and put focus back on their trigger',
        ),
    },
    more: () =>
        layoutChecks('call-bar', {
            midRoom: () => numberIn(CALL_BAR, /const MID = (\d+)\b/, 'rem'),
            narrowRoom: () => numberIn(CALL_BAR, /const NARROW = (\d+)\b/, 'rem'),
            popoverEdge: () => numberIn(CALL_BAR, /collisionPadding=\{(\d+)\}/),
        }),
}

// Letter

const LETTER = source('components/Letter.tsx')
const letter = (open: boolean) =>
    draw(
        Letter,
        {
            from: { name: 'grace', address: 'grace@example.org' },
            to: ['me', 'linus'],
            time: '09:12',
            attached: true,
            snippet: 'The plan for harbor',
            defaultOpen: open,
        },
        createElement('p', {}, 'The plan for harbor.'),
    )
const LETTERS = once(() => ({ folded: letter(false), open: letter(true) }))
const letterHead = (elements: El[]) => elements.find((element) => element.tag === 'button' && element.attrs['aria-expanded'] !== undefined)
const startingWith = (elements: El[], start: string) => elements.find((element) => classesOf(element).startsWith(start))
/** Each piece of an open letter, by its name in the spec. */
const letterPieces = (open: El[]): Record<string, El | undefined> => ({
    letter: open.find((element) => element.tag === 'article'),
    head: letterHead(open),
    row: startingWith(open, 'flex min-w-0 items-start'),
    name: startingWith(open, 'truncate text-sm font-medium'),
    nameLine: startingWith(open, 'flex min-w-0 items-baseline'),
    address: startingWith(open, 'truncate text-xs'),
    time: startingWith(open, 'ml-auto'),
    line: startingWith(open, 'truncate text-sm text-muted-foreground'),
    body: startingWith(open, 'mt-3'),
})

const LETTER_ADAPTER: Adapter = {
    wordObjects: { LETTER_WORDS },
    complete: ['LETTER_WORDS'],
    words: {
        attached: 'LETTER_WORDS.attached',
        to: ['LETTER_WORDS.to', (said: (names: string) => string, fill) => said(String(fill.names))],
    },
    options: {},
    size: (size, key) => {
        const { open } = LETTERS()
        const pieces = letterPieces(open)
        const read: Record<string, Where | undefined> = {
            letter: pieceWhere(pieces.letter),
            head: pieceWhere(key === 'radius' ? pieces.head : pieces.row),
            avatar: pieceWhere(pieces.row === undefined ? undefined : open.find((element) => element.parent === pieces.row)),
            name: pieceWhere(pieces.name),
            nameLine: pieceWhere(pieces.nameLine),
            address: pieceWhere(pieces.address),
            time: pieceWhere(key === 'icon' ? iconOf(open, pieces.time) : pieces.time),
            line: pieceWhere(pieces.line),
            body: pieceWhere(pieces.body),
        }
        return read[size]
    },
    paint: (_, name, state) => pieceWhere(letterPieces(LETTERS().open)[name], state === 'focus' ? ['focus-visible'] : []),
    effect: () => skip('the letter states no effects'),
    keys: {
        'Enter, Space (a foldable head has focus)': () =>
            letterHead(LETTERS().folded)?.attrs.type === 'button' ? true : "a foldable letter's head is not a native button",
    },
    more: () => {
        const { letter: article, body } = letterPieces(LETTERS().open)
        return layoutChecks('letter', {
            padXFromMd: () => (article === undefined ? undefined : resolve([classesOf(article)], ['md'], READ.padX)),
            openFoot: () => numberIn(LETTER, /open && 'pb-(\d+(?:\.\d+)?)'/, 'step'),
            bodyTop: () => numberIn(classesOf(body), /\bmt-(\d+(?:\.\d+)?)\b/, 'step'),
            bodyIndent: () => numberIn(classesOf(body), /\bsm:pl-(\d+(?:\.\d+)?)\b/, 'step'),
            addressFrom: () => (/max-sm:hidden/.test(LETTER) ? '640' : undefined),
        })
    },
}

// Banner

const BANNER = source('components/Banner.tsx')
/** Tailwind's container widths, which a `basis-<size>` class reads. */
const TAILWIND_THEME = readFileSync(join(ROOT, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8')
/** The px a `basis-<size>` class gives an element, from the container width it names. */
const basisOf = (element: El | undefined) => {
    const size = /\bbasis-([a-z0-9]+)\b/.exec(classesOf(element))?.[1]
    return size === undefined ? undefined : numberIn(TAILWIND_THEME, new RegExp(`--container-${size}: ([\\d.]+)rem`), 'rem')
}
/** A banner in a tone, with an action and a dismiss. */
const banner = (tone: BannerTone = 'critical') =>
    draw(Banner, {
        tone,
        actions: createElement('button', { type: 'button' }, 'Retry'),
        onDismiss: () => undefined,
        children: 'api.example.org is not answering.',
    })
/** Each piece of a banner, by its name in the spec. */
const bannerPieces = (elements: El[]): Record<string, El | undefined> => {
    const strip = elements[0]
    return {
        container: strip,
        mark: elements.find((element) => element.tag === 'svg' && element.parent === strip),
        message: elements.find((element) => element.tag === 'p' && element.parent === strip),
        actions: elements.find((element) => element.tag === 'div' && element.parent === strip),
        dismiss: elements.find((element) => element.tag === 'button' && element.attrs['aria-label'] === BANNER_WORDS.dismiss),
    }
}

const BANNER_ADAPTER: Adapter = {
    wordObjects: { BANNER_WORDS },
    complete: ['BANNER_WORDS'],
    words: { dismiss: 'BANNER_WORDS.dismiss' },
    options: {
        tone: [...(/export type BannerTone = ([^\n]+)/.exec(BANNER)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]),
    },
    size: (size) => pieceWhere(bannerPieces(banner())[size]),
    paint: (group, name) =>
        group === 'variants' ? pieceWhere(bannerPieces(banner(name as BannerTone)).container) : pieceWhere(bannerPieces(banner())[name]),
    effect: () => skip('the banner states no effects'),
    keys: {
        'Tab (with actions or onDismiss)': () => (focusable(bannerPieces(banner()).dismiss) ? true : 'the dismiss is out of the tab order'),
        'Enter, Space (the dismiss has focus)': () =>
            bannerPieces(banner()).dismiss?.attrs.type === 'button' ? true : 'the dismiss is not a native button',
    },
    more: () => {
        const { container, message } = bannerPieces(banner())
        return layoutChecks('banner', {
            rowGap: () => lengthOn(container, lengthOf('gap-y-')),
            messageBasis: () => basisOf(message),
        })
    },
}

// Problem

const PROBLEM = source('components/Problem.tsx')
/** A problem with every piece: a detail with code in it, the raw message and an action. */
const problem = (tone: 'error' | 'warning' = 'error') =>
    draw(Problem, {
        tone,
        title: '37 rows have an amount that is not a number',
        detail: 'The first is row 112, where `amount` is `n/a`.',
        technical: "at $.amount: 'n/a' does not match '^[0-9]+[.][0-9]{2}$'",
        actions: createElement('button', { type: 'button' }, 'Try now'),
    })
/** Each piece of a problem, by its name in the spec. */
const problemPieces = (elements: El[]): Record<string, El | undefined> => {
    const box = elements[0]
    const head = elements.find((element) => element.tag === 'div' && element.parent === box)
    const unfoldable = elements.find((element) => element.attrs['data-slot'] === 'unfoldable')
    return {
        box,
        head,
        mark: elements.find((element) => element.tag === 'svg' && element.parent === head),
        title: elements.find((element) => element.tag === 'p' && element.parent === head),
        detail: elements.find((element) => element.tag === 'p' && element.parent === box),
        code: elements.find((element) => element.tag === 'code'),
        unfoldable,
        row: unfoldable === undefined ? undefined : elements.find((element) => element.tag === 'button' && within(element, unfoldable)),
        technical: elements.find((element) => element.tag === 'span' && /\btext-xs\b/.test(classesOf(element))),
        actions: elements.filter((element) => element.tag === 'div' && element.parent === box).at(-1),
    }
}
/** The box's classes, its end corners (`rounded-e-control`) read as the corner role that rounds them, its logical sides as the sides they are left to right. */
const problemBox = (elements: El[]) =>
    classesOf(problemPieces(elements).box)
        .replace(/\brounded-e-/, 'rounded-')
        .replace(/\bborder-s-/, 'border-l-')
        .replace(/\bps-/, 'pl-')
        .replace(/\bpe-/, 'pr-')
/** The raw message's classes: it opens only on a press, which no server drawing makes, so they are read from the source. */
const PROBLEM_RAW = literalAfter(PROBLEM, '<pre className=')

const PROBLEM_ADAPTER: Adapter = {
    wordObjects: { PROBLEM_WORDS },
    complete: ['PROBLEM_WORDS'],
    words: { technical: 'PROBLEM_WORDS.technical' },
    options: { tone: propValues(PROBLEM, 'ProblemProps', 'tone') },
    size: (size) => {
        const elements = problem()
        if (size === 'box') return { layers: [problemBox(elements)], on: [] }
        return pieceWhere(problemPieces(elements)[size])
    },
    paint: (_, name, state) => {
        const elements = problem(state === 'warning' ? 'warning' : 'error')
        const pieces = problemPieces(elements)
        switch (name) {
            case 'box':
                return { layers: [problemBox(elements)], on: [] }
            case 'title':
            case 'detail':
                // Each takes its size from the box and its weight and ink from its own classes.
                return inside(pieces.box, pieces[name])
            case 'technicalText':
                return { layers: [PROBLEM_RAW], on: [] }
            default:
                return pieceWhere(pieces[name])
        }
    },
    effect: () => skip('the problem states no effects'),
    keys: {
        'Tab (with technical or actions)': () =>
            focusable(problemPieces(problem()).row) ? true : "the technical details' row is out of the tab order",
        "Enter, Space (the technical details' row has focus)": () => {
            const row = problemPieces(problem()).row
            return row?.attrs.type === 'button' && 'aria-expanded' in row.attrs
                ? true
                : "the technical details' row is not a native button with aria-expanded"
        },
    },
    more: () => {
        const { box, mark, detail, unfoldable, actions } = problemPieces(problem())
        const indent = lengthOn(detail, READ.padStart)
        return layoutChecks('problem', {
            ruleWidth: () => numberIn(classesOf(box), /\bborder-s-(\d+)\b/),
            markTop: () => lengthOn(mark, lengthOf('mt-')),
            indent: () => (indent === lengthOn(actions, READ.padStart) ? indent : `${indent} for the detail, another for the actions`),
            technicalIndent: () => lengthOn(unfoldable, READ.padStart),
            actionsTop: () => lengthOn(actions, lengthOf('pt-')),
        })
    },
}

// Detail pane

const DESCRIPTION_LIST = source('components/DescriptionList.tsx')
const DETAIL_PANES = once(() =>
    draw(DetailPane, {
        sections: [
            {
                id: 'run',
                title: 'Run',
                summary: 'ada started it',
                facts: [
                    { term: 'Job', value: 'nightly-export' },
                    { term: 'State', value: 'failed' },
                ],
                actions: createElement('button', { type: 'button' }, 'Copy'),
            },
            { id: 'steps', title: 'Steps', content: createElement('p', {}, 'fetch') },
        ],
        actions: createElement('button', { type: 'button' }, 'Run again'),
    }),
)
/** A piece that takes its text from an element around it: that element's classes, then its own. */
const inside = (around: El | undefined, element: El | undefined, on: string[] = []): Where | undefined =>
    element === undefined
        ? undefined
        : {
              layers: [classesOf(around), classesOf(element)],
              on,
              around: ancestors(element),
          }
const byTag = (elements: El[], tag: string) => elements.find((element) => element.tag === tag)
/** Each piece of a detail pane, by its name in the spec. */
const detailPieces = (pane: El[]): Record<string, El | undefined> => {
    const row = byTag(pane, 'h3')?.parent
    return {
        section: byTag(pane, 'section'),
        heading: byTag(pane, 'h3'),
        headingRow: row,
        sectionActions: row === undefined ? undefined : pane.find((element) => element.parent === row && element.tag === 'div'),
        summary: pane.find((element) => element.tag === 'p' && element.text === 'ada started it'),
        facts: byTag(pane, 'dl'),
        term: byTag(pane, 'dt'),
        value: byTag(pane, 'dd'),
        list: byTag(pane, 'dl'),
        actions: pane.find((element) => element.parent === undefined && element.tag === 'div'),
    }
}

const DETAIL_PANE_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {},
    size: (size) => pieceWhere(detailPieces(DETAIL_PANES())[size]),
    paint: (_, name) => {
        const pieces = detailPieces(DETAIL_PANES())
        // A value takes its text from the list around it.
        return name === 'value' ? inside(pieces.list, pieces.value) : pieceWhere(pieces[name])
    },
    effect: () => skip('the detail pane states no effects'),
    keys: {},
    more: () =>
        layoutChecks('detail-pane', {
            factsRowGap: () => numberIn(DESCRIPTION_LIST, /'grid gap-y-(\d+(?:\.\d+)?)'\)/, 'step'),
            termMax: () => {
                const share = /(\d+)%/.exec(DESCRIPTION_LIST)?.[1]
                return share === undefined ? undefined : String(Number(share) / 100)
            },
        }),
}

// Board item panel

const BOARD_ITEM_PANEL = source('components/board/BoardItemPanel.tsx')
const CHECKBOX_FIELD = source('components/CheckboxField.tsx')
const STEPS = [
    { text: 'Reproduce with the 1 November feed', done: true },
    { text: 'Add a validate rule for zero rows', done: false },
]
const BOARD_ITEMS = once(() => ({
    panel: draw(BoardItemPanel, {
        code: 'HRB-142',
        title: 'Empty export after a feed change',
        state: { label: 'In progress', icon: createElement(Play) },
        description: 'nightly-export wrote no rows.',
        fields: [{ term: 'Project', value: 'harbor' }],
        checklist: STEPS,
        onChecklistChange: noop,
    }),
    readOnly: draw(BoardChecklist, { steps: STEPS }),
}))
const stepRow = (elements: El[], done: boolean) =>
    elements.find((element) => element.tag === 'label' && element.text.includes(STEPS[done ? 0 : 1].text))
const inStep = (elements: El[], done: boolean, found: (element: El) => boolean) => {
    const row = stepRow(elements, done)
    return row === undefined ? undefined : elements.find((element) => within(element, row) && found(element))
}
const boxOf = (elements: El[], done: boolean) => inStep(elements, done, (element) => element.attrs.role === 'checkbox')
const BOARD_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    checked: ['data-checked'],
    readOnly: ['disabled'],
}
/** Each piece of a work item's panel, by its name in the spec. */
const boardPieces = (panel: El[], done: boolean): Record<string, El | undefined> => {
    const chip = panel.find((element) => classesOf(element).startsWith('group/badge'))
    return {
        head: panel[0],
        code: panel.find((element) => element.text === 'HRB-142'),
        title: byTag(panel, 'h2'),
        chips: chip?.parent,
        stateChip: chip,
        section: byTag(panel, 'section'),
        heading: byTag(panel, 'h3'),
        description: panel.find((element) => element.text === 'nightly-export wrote no rows.'),
        progress: byData(panel, 'data-slot', 'progress-indicator')?.parent,
        fill: byData(panel, 'data-slot', 'progress-indicator'),
        step: stepRow(panel, done),
        box: boxOf(panel, done),
        indicator: inStep(panel, done, (element) => element.attrs['data-slot'] === 'checkbox-indicator'),
        stepLabel: inStep(panel, done, (element) => classesOf(element).startsWith('leading-5')),
    }
}

const BOARD_ITEM_PANEL_ADAPTER: Adapter = {
    wordObjects: { BOARD_ITEM_PANEL_WORDS, BOARD_CHECKLIST_WORDS },
    complete: ['BOARD_ITEM_PANEL_WORDS', 'BOARD_CHECKLIST_WORDS'],
    words: {
        description: 'BOARD_ITEM_PANEL_WORDS.description',
        fields: 'BOARD_ITEM_PANEL_WORDS.fields',
        activity: 'BOARD_ITEM_PANEL_WORDS.activity',
        'checklist.title': [
            'BOARD_CHECKLIST_WORDS.title',
            (said: (done: number, total: number) => string, fill) => said(Number(fill.done), Number(fill.total)),
        ],
        'checklist.progress': 'BOARD_CHECKLIST_WORDS.progress',
    },
    options: {},
    size: (size, key) => {
        const pieces = boardPieces(BOARD_ITEMS().panel, false)
        // The icons: the chip's own svg, and the check inside a ticked box's indicator.
        if (key === 'icon' && size === 'box') return pieceWhere(boardPieces(BOARD_ITEMS().panel, true).indicator, ['[&>svg]'])
        return pieceWhere(pieces[size], key === 'icon' ? ['[&>svg]'] : [])
    },
    paint: (_, name, state) => {
        const pieces = boardPieces(state === 'readOnly' ? BOARD_ITEMS().readOnly : BOARD_ITEMS().panel, state === 'checked')
        const on = BOARD_ON[state] ?? []
        if (name === 'stepLabel') return inside(pieces.step, pieces.stepLabel, on)
        return pieceWhere(pieces[name], on)
    },
    effect: (state) => (state === 'readOnly' ? pieceWhere(stepRow(BOARD_ITEMS().readOnly, false), ['has-disabled']) : undefined),
    keys: {
        'Tab (the checklist is not read only)': () => (focusable(boxOf(BOARD_ITEMS().panel, false)) ? true : "a step's box takes no focus"),
        "Space, Enter (a step's box has focus)": () =>
            boxOf(BOARD_ITEMS().panel, false)?.attrs.role === 'checkbox' ? true : "a step's box is not a checkbox",
    },
    more: () =>
        layoutChecks('board-item-panel', {
            stepsInset: () => (/<ul className="-mx-1\b/.test(BOARD_ITEM_PANEL) ? '-4' : undefined),
            boxTop: () => numberIn(CHECKBOX_FIELD, /className="mt-(\d+(?:\.\d+)?)\b/, 'step'),
        }),
}

// The chart family: the look every chart shares, the dashboard panel's frame, the stat tile and the time series panel

const DASHBOARD_GRID = source('components/dashboard/DashboardGrid.tsx')
const STAT_PANEL = source('components/dashboard/StatPanel.tsx')
const THRESHOLD_LEGEND = source('components/dashboard/ThresholdLegend.tsx')
const LOADERS = source('components/Loaders.tsx')
const CHARTS = join(ROOT, 'packages', 'charts', 'src')
const chartSource = (path: string) => readFileSync(join(CHARTS, path), 'utf8')
const CHART_LOOK = chartSource('look.ts')
const CHART_THEME = chartSource('theme.ts')
const CHART_AXES = chartSource('kinds/axes.ts')
const CHART_CATEGORIES = chartSource('kinds/categories.ts')
const TIME_SERIES_PANEL = chartSource('dashboard/TimeSeriesPanel.tsx')
const CANDLESTICK = chartSource('kinds/candlestick.ts')
const WATERFALL_TONES = chartSource('kinds/legend-waterfall.ts')

/** The classes a panel's content takes while it loads long enough to dim (`LoadingOverlay`, after its delay). */
const DIMMED = literalAfter(LOADERS, 'long &&')

/**
 * The color each field of the chart look stands for, read from `readLook`: `token('name')` is the
 * token, `mix('var(--a)', n)` a mix in oklab over the card. Written as the class a utility would
 * take for it, so the paint readers read ECharts' colors as they read a class.
 */
const LOOK_COLORS: Record<string, string> = Object.fromEntries([
    ...[...CHART_LOOK.matchAll(/^\s+(\w+): token\('([a-z0-9-]+)'\),$/gm)].map((match) => [match[1], match[2]]),
    ...[...CHART_LOOK.matchAll(/^\s+(\w+): mix\('var\(--([a-z0-9-]+)\)', (\d+)\),$/gm)].map((match) => [
        match[1],
        `[color-mix(in_oklab,var(--${match[2]})_${match[3]}%,var(--card))]`,
    ]),
])
/** A color the chart theme or a kind draws from the look, as the class that would draw it: `prefix` is bg-, border- or text-. */
const lookClass = (text: string, pattern: RegExp, prefix: string) => {
    const field = pattern.exec(text)?.[1]
    const color = field === undefined ? undefined : LOOK_COLORS[field]
    return color === undefined ? '' : `${prefix}${color}`
}
/** A piece ECharts draws, as the classes its colors would take. */
const drawnAs = (...classes: string[]): Where => ({
    layers: [classes.filter((one) => one !== '').join(' ')],
    on: [],
})

const STEP_COLOR = /const color = step\.color === undefined \? look\.(\w+) :/
const MARK_COLOR = /const color = mark\.color === undefined \? look\.(\w+) :/
/** A tooltip's markup (`tooltipMarkup`): its box, a row, a row's swatch, its label and its value, by their literal classes. */
const TOOLTIP_MARKUP = /export function tooltipMarkup[\s\S]*?\n}/.exec(CHART_LOOK)?.[0] ?? ''
const tooltipClasses = (pattern: RegExp) => ({
    layers: [pattern.exec(TOOLTIP_MARKUP)?.[1] ?? ''],
    on: [],
})
const TOOLTIP_PIECES: Record<string, () => Where> = {
    tooltip: () => tooltipClasses(/<div class="(grid [^"]+)">/),
    tooltipRow: () => tooltipClasses(/<div class="(flex items-center[^"]+)">/),
    tooltipSwatch: () => tooltipClasses(/<span class="(size-[^"]+)" style=/),
    tooltipLabel: () => tooltipClasses(/<span class="(text-muted-foreground)">/),
    tooltipValue: () => tooltipClasses(/<span class="(ml-auto [^"]+)">/),
}

const LEGEND_ITEMS = [
    { key: 'runs', label: 'Runs', color: 'var(--chart-2)', value: '3,526' },
    { key: 'failed', label: 'Failed', color: 'var(--chart-3)' },
]
const legendOf = (hidden: readonly string[] = []) =>
    draw(ChartLegend, {
        items: LEGEND_ITEMS,
        hidden: new Set(hidden),
        onToggle: noop,
    })
const LEGENDS = once(() => ({
    shown: legendOf(),
    hidden: legendOf(['failed']),
}))
const legendButton = (elements: El[], label: string) => elements.find((element) => element.tag === 'button' && element.text.includes(label))
const legendSwatchOf = (elements: El[], label: string) => {
    const button = legendButton(elements, label)
    return button === undefined
        ? undefined
        : elements.find((element) => element.parent === button && element.attrs['aria-hidden'] !== undefined)
}
const CHART_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
}

/** A literal number after a pattern in a source, as a string. */
const literalIn = (text: string, pattern: RegExp) => pattern.exec(text)?.[1]

/** The token a candlestick's rises or falls take: the waterfall's tone for the word, where the candlestick reads those tones. */
const candleTone = (word: 'rise' | 'fall') =>
    /const tone = tones\(spec\)/.test(CANDLESTICK)
        ? new RegExp(`${word}: spec\\.colors\\?\\.\\[words\\.${word}\\] \\?\\? '([a-z0-9-]+)'`).exec(WATERFALL_TONES)?.[1]
        : undefined
/** A candle drawn in its tone, its body and its edge. */
const candleDrawn = (word: 'rise' | 'fall') => {
    const tone = candleTone(word)
    return drawnAs(tone === undefined ? '' : `bg-${tone} border-${tone}`)
}
/** A volume bar in its candle's tone mixed into the card at the share the builder gives. */
const volumeDrawn = (word: 'rise' | 'fall') => {
    const tone = candleTone(word)
    const share = literalIn(CANDLESTICK, /color: look\.mix\(toneOf\(candle\), (\d+)\)/)
    return drawnAs(tone === undefined || share === undefined ? '' : `bg-[color-mix(in_oklab,var(--${tone})_${share}%,var(--card))]`)
}

const CHART_ADAPTER: Adapter = {
    wordObjects: { CHART_WORDS, CHART_LEGEND_WORDS },
    complete: ['CHART_WORDS', 'CHART_LEGEND_WORDS'],
    words: Object.fromEntries([
        ...Object.keys(CHART_WORDS).map((key) => [key, `CHART_WORDS.${key}`]),
        ...Object.keys(CHART_LEGEND_WORDS).map((key) => [`legend.${key}`, `CHART_LEGEND_WORDS.${key}`]),
    ]),
    options: { kind: Object.keys(KINDS) },
    size: (size) => {
        const { shown } = LEGENDS()
        if (size in TOOLTIP_PIECES) return TOOLTIP_PIECES[size]()
        const read: Record<string, Where | undefined> = {
            legend: pieceWhere(byTag(shown, 'ul')),
            legendItem: pieceWhere(legendButton(shown, 'Runs')),
            legendSwatch: pieceWhere(legendSwatchOf(shown, 'Runs')),
        }
        return read[size]
    },
    paint: (_, name, state) => {
        const { shown, hidden } = LEGENDS()
        const on = CHART_ON[state] ?? []
        if (name in TOOLTIP_PIECES) return TOOLTIP_PIECES[name]()
        switch (name) {
            case 'axisLine':
                return drawnAs(lookClass(CHART_THEME, /axisLine: \{ show: true, lineStyle: \{ color: look\.(\w+) \} \}/, 'border-'))
            case 'axisLabel':
                return drawnAs(lookClass(CHART_THEME, /axisLabel: \{ color: look\.(\w+),/, 'text-'))
            case 'gridLine':
                return drawnAs(
                    lookClass(CHART_THEME, /splitLine: \{ show: true, lineStyle: \{ color: look\.(\w+), width: 1 \} \}/, 'border-'),
                )
            case 'series': {
                const first = /export const SERIES_ORDER = \['([a-z0-9-]+)'/.exec(CHART_LOOK)?.[1]
                return drawnAs(/series: SERIES_ORDER\.map\(token\)/.test(CHART_LOOK) && first !== undefined ? `bg-${first}` : '')
            }
            case 'stepLine':
                return drawnAs(lookClass(CHART_AXES, STEP_COLOR, 'border-'), lookClass(CHART_AXES, STEP_COLOR, 'text-'))
            case 'markLine':
                return drawnAs(lookClass(CHART_AXES, MARK_COLOR, 'border-'), lookClass(CHART_AXES, MARK_COLOR, 'text-'))
            case 'axisPointer':
                return drawnAs(lookClass(CHART_THEME, /axisPointer: \{\s*lineStyle: \{ color: look\.(\w+),/, 'border-'))
            case 'legendItem':
                return pieceWhere(legendButton(state === 'hidden' ? hidden : shown, state === 'hidden' ? 'Failed' : 'Runs'), on)
            case 'legendSwatch':
                return pieceWhere(legendSwatchOf(state === 'hidden' ? hidden : shown, state === 'hidden' ? 'Failed' : 'Runs'))
            case 'legendFigure':
                return pieceWhere(shown.find((element) => element.text === '3,526' && element.tag === 'span'))
            case 'candleRise':
                return candleDrawn('rise')
            case 'candleFall':
                return candleDrawn('fall')
            case 'volumeRise':
                return volumeDrawn('rise')
            case 'volumeFall':
                return volumeDrawn('fall')
            default:
                return undefined
        }
    },
    effect: (state) => {
        if (state !== 'blurred') return undefined
        const opacity = /blur: \{.*itemStyle: \{ opacity: (0\.\d+) \} \}/.exec(CHART_THEME)?.[1]
        return drawnAs(opacity === undefined ? '' : `opacity-${String(Math.round(Number(opacity) * 100))}`)
    },
    keys: {
        'Tab (a legend is drawn)': () => (focusable(legendButton(LEGENDS().shown, 'Runs')) ? true : 'a legend entry takes no focus'),
        'Enter, Space (a legend entry has focus)': () =>
            legendButton(LEGENDS().shown, 'Runs')?.attrs['aria-pressed'] !== undefined ? true : 'a legend entry is not a toggle button',
    },
    more: () =>
        layoutChecks('chart', {
            axisText: () => (/label: pixels\('chart-text-size', \d+\)/.test(CHART_LOOK) ? 'chart-text-size' : undefined),
            axisNameText: () => (/small: pixels\('chart-text-size-small', \d+\)/.test(CHART_LOOK) ? 'chart-text-size-small' : undefined),
            statText: () => (/stat: pixels\('chart-stat-size', \d+\)/.test(CHART_LOOK) ? 'chart-stat-size' : undefined),
            statTextSmall: () =>
                /statSmall: pixels\('chart-stat-size-small', \d+\)/.test(CHART_LOOK) ? 'chart-stat-size-small' : undefined,
            gridStart: () => literalIn(CHART_THEME, /grid: \{ left: (\d+),/),
            gridEnd: () => literalIn(CHART_THEME, /grid: \{[^}]*right: (\d+),/),
            gridTop: () => literalIn(CHART_THEME, /grid: \{[^}]*top: (\d+),/),
            gridFoot: () => literalIn(CHART_THEME, /grid: \{[^}]*bottom: (\d+),/),
            lineWidth: () => literalIn(CHART_THEME, /line: \{[^\n]*lineStyle: \{ width: ([\d.]+) \}/),
            referenceWidth: () => literalIn(CHART_CATEGORIES, /dashed \? \{ color, width: ([\d.]+), type: 'dashed' \}/),
            pointSize: () => literalIn(CHART_THEME, /line: \{ symbol: 'circle', symbolSize: (\d+),/),
            scatterSize: () => literalIn(CHART_THEME, /scatter: \{ symbolSize: (\d+),/),
            barMaxWidth: () => literalIn(CHART_THEME, /bar: \{ barMaxWidth: (\d+),/),
            markCorner: () => literalIn(CHART_LOOK, /corner: Math\.max\(0, pixels\('radius', [\d.]+\) \* ([\d.]+)\)/),
            chartLegendIcon: () => literalIn(CHART_THEME, /itemWidth: (\d+),/),
            sliceEdge: () => literalIn(CHART_THEME, /pie: \{\s*itemStyle: \{ borderColor: look\.card, borderWidth: (\d+) \}/),
            candleWidth: () => literalIn(CANDLESTICK, /const WIDEST = (\d+)/),
            averageWidth: () => literalIn(CANDLESTICK, /lineStyle: \{ color: averageColor\[index\], width: ([\d.]+) \}/),
        }),
}

const PANEL_MENU = createElement(DropdownMenuItem, {}, 'Download')
const dashboardPanel = (props: Partial<DashboardPanelProps> = {}) =>
    draw(
        DashboardPanel,
        {
            title: 'Runs',
            subtitle: 'Last 24 hours',
            expandable: true,
            menu: PANEL_MENU,
            footer: 'harbor',
            ...props,
        },
        createElement('p', {}, 'nightly-export'),
    )
const DASHBOARD_PANELS = once(() => ({
    plain: dashboardPanel(),
    empty: dashboardPanel({ empty: true }),
    stale: dashboardPanel({ stale: true }),
}))
/** Each piece of a dashboard panel, by its name in the spec. */
const panelPieces = (panel: El[]): Record<string, El | undefined> => {
    const expand = byLabel(panel, DASHBOARD_PANEL_WORDS.expand)
    const section = byTag(panel, 'section')
    return {
        panel: section,
        head: byTag(panel, 'header'),
        title: byTag(panel, 'h3'),
        subtitle: panel.find((element) => element.tag === 'span' && element.text === 'Last 24 hours'),
        stale: startingWith(panel, 'flex min-w-0 shrink items-center gap-1 text-xs'),
        tools: expand?.parent,
        tool: expand,
        body: panel.find((element) => element.tag === 'div' && classesOf(element).includes(' p-4')),
        empty: panel.find((element) => element.tag === 'p' && element.text === DASHBOARD_PANEL_WORDS.empty),
        foot: byTag(panel, 'footer'),
    }
}

const DASHBOARD_PANEL_ADAPTER: Adapter = {
    wordObjects: { DASHBOARD_PANEL_WORDS },
    complete: ['DASHBOARD_PANEL_WORDS'],
    words: Object.fromEntries(Object.keys(DASHBOARD_PANEL_WORDS).map((key) => [key, `DASHBOARD_PANEL_WORDS.${key}`])),
    options: { span: Object.keys(SPAN) },
    size: (size, key) => {
        const { plain, empty, stale } = DASHBOARD_PANELS()
        const panel = size === 'empty' ? empty : size === 'stale' ? stale : plain
        const piece = panelPieces(panel)[size]
        return pieceWhere(key === 'icon' ? iconOf(panel, piece) : piece)
    },
    paint: (_, name, state) => {
        const { plain, empty, stale } = DASHBOARD_PANELS()
        const panel = state === 'empty' ? empty : name === 'stale' ? stale : plain
        return pieceWhere(panelPieces(panel)[name], CHART_ON[state] ?? [])
    },
    effect: (state) => (state === 'loading' ? { layers: [DIMMED], on: [] } : undefined),
    keys: {
        Tab: () => (focusable(panelPieces(DASHBOARD_PANELS().plain).tool) ? true : "the panel's tools take no focus"),
        'Enter, Space (expand has focus)': () =>
            panelPieces(DASHBOARD_PANELS().plain).tool?.attrs.type === 'button' ? true : 'expand is not a native button',
        "Enter, Space, ArrowDown (the menu's button has focus)": BASE_UI('Menu', 'opens from its trigger on these keys'),
        'Escape (the menu or the expanded content is open)': BASE_UI(
            'Menu and Dialog',
            'close on Escape and put focus back on their trigger',
        ),
    },
    more: () =>
        layoutChecks('dashboard-panel', {
            menuWidth: () => numberIn(DASHBOARD_GRID, /<DropdownMenuContent align="end" className="w-(\d+)">/, 'step'),
            loadingDelay: () => numberIn(LOADERS, /export function LoadingOverlay\(\{ loading, delay = (\d+)/),
            denseGap: () => numberIn(DASHBOARD_GRID, /dense \? 'gap-(\d+(?:\.\d+)?)'/, 'step'),
        }),
}

const statPanel = (props: Partial<StatPanelProps> = {}) =>
    draw(
        TooltipProvider,
        {},
        createElement(StatPanel, {
            title: 'Success rate',
            value: 97.4,
            unit: '%',
            decimals: 1,
            delta: '+2%',
            note: 'harbor',
            target: 99,
            menu: PANEL_MENU,
            onSelect: noop,
            ...props,
        }),
    )
const STAT_PANELS = once(() => ({
    plain: statPanel(),
    untargeted: statPanel({ target: undefined }),
    good: statPanel({ good: true }),
    bad: statPanel({ good: false }),
    filled: statPanel({ color: 'chart-2', colorMode: 'background' }),
    noData: statPanel({ value: null }),
    failed: statPanel({ error: true }),
    filledFailed: statPanel({
        error: true,
        color: 'chart-2',
        colorMode: 'background',
    }),
}))
/** Each piece of a stat tile, by its name in the spec. */
const statPieces = (tile: El[]): Record<string, El | undefined> => {
    const value = startingWith(tile, 'flex items-baseline gap-1')
    const meter = startingWith(tile, 'mt-2 mb-3')
    const failure = tile.find((element) => element.tag === 'p' && element.text === STAT_PANEL_WORDS.failed)
    return {
        tile: byTag(tile, 'section'),
        cover: byTag(tile, 'button'),
        head: byTag(tile, 'header'),
        title: byTag(tile, 'h3'),
        delta: startingWith(tile, 'flex min-w-0 shrink items-center gap-0.5'),
        tool: byLabel(tile, STAT_PANEL_WORDS.menu),
        value,
        valueRoom: value?.parent,
        unit: tile.find((element) => element.parent === value && element.text === '%'),
        note: startingWith(tile, 'truncate text-xs'),
        meter,
        track: startingWith(tile, 'relative h-1.5'),
        tick: tile.find((element) => classesOf(element).includes('-inset-y-1')),
        targetLabel: startingWith(tile, 'flex justify-center gap-1'),
        failure,
        failureRoom: failure?.parent,
    }
}
const STAT_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
}

const STAT_PANEL_ADAPTER: Adapter = {
    wordObjects: { STAT_PANEL_WORDS },
    complete: ['STAT_PANEL_WORDS'],
    words: Object.fromEntries(Object.keys(STAT_PANEL_WORDS).map((key) => [key, `STAT_PANEL_WORDS.${key}`])),
    options: {
        colorMode: propValues(STAT_PANEL, 'StatPanelProps', 'colorMode'),
        span: Object.keys(SPAN),
    },
    size: (size, key) => {
        const { plain, untargeted, failed } = STAT_PANELS()
        // A tile is taller with a target meter: its least height is read from one without.
        const tile = size === 'failure' ? failed : size === 'tile' ? untargeted : plain
        const pieces = statPieces(tile)
        // The value's and the failure's room across is their column's; their text is their own.
        if (size === 'value' && key === 'padX') return pieceWhere(pieces.valueRoom)
        if (size === 'failure' && key !== 'text') return pieceWhere(pieces.failureRoom)
        return pieceWhere(key === 'icon' ? iconOf(tile, pieces[size]) : pieces[size])
    },
    paint: (_, name, state) => {
        const tiles = STAT_PANELS()
        const tile =
            state === 'filled'
                ? name === 'failure'
                    ? tiles.filledFailed
                    : tiles.filled
                : state === 'good'
                  ? tiles.good
                  : state === 'bad'
                    ? tiles.bad
                    : state === 'noData'
                      ? tiles.noData
                      : name === 'failure'
                        ? tiles.failed
                        : tiles.plain
        return pieceWhere(statPieces(tile)[name], STAT_ON[state] ?? [])
    },
    effect: (state) => (state === 'loading' ? { layers: [DIMMED], on: [] } : undefined),
    keys: {
        Tab: () => (focusable(statPieces(STAT_PANELS().plain).cover) ? true : 'the tile takes no focus'),
        'Enter (the cover has focus)': () =>
            statPieces(STAT_PANELS().plain).cover?.attrs.type === 'button' ? true : "the tile's cover is not a native button",
        "Enter, Space, ArrowDown (the menu's button has focus)": BASE_UI('Menu', 'opens from its trigger on these keys'),
        'Escape (the menu is open)': BASE_UI('Menu', 'closes on Escape and puts focus back on its trigger'),
    },
    more: () =>
        layoutChecks('stat-panel', {
            meterMaxWidth: () => numberIn(STAT_PANEL, /flex w-full max-w-(\d+) flex-col/, 'step'),
            valueFoot: () => numberIn(STAT_PANEL, /value !== null \? 'pb-0' : 'pb-(\d+)'/, 'step'),
            meterTop: () => numberIn(STAT_PANEL, /className="mt-(\d+) mb-\d+ flex/, 'step'),
            meterFoot: () => numberIn(STAT_PANEL, /className="mt-\d+ mb-(\d+) flex/, 'step'),
            tickOverhang: () => numberIn(STAT_PANEL, /'absolute -inset-y-(\d+(?:\.\d+)?) /, 'step'),
            sparkHeight: () => {
                const share = /bottom-0 h-\[(\d+)%\]/.exec(STAT_PANEL)?.[1]
                return share === undefined ? undefined : String(Number(share) / 100)
            },
        }),
}

const THRESHOLDS = [{ color: 'good' }, { value: 90, color: 'warning' }, { value: 95, color: 'critical' }]
const thresholdLegend = (layout: 'list' | 'bar') =>
    draw(ThresholdLegend, {
        thresholds: THRESHOLDS,
        title: 'Success rate',
        layout,
        noData: true,
    })
const THRESHOLD_LEGENDS = once(() => ({
    list: thresholdLegend('list'),
    bar: thresholdLegend('bar'),
}))
/** Each piece of a time series panel's threshold legend, by its name in the spec. */
const thresholdPieces = (list: El[], bar: El[]): Record<string, El | undefined> => {
    const band = byTag(list, 'li')
    return {
        thresholdLegend: byTag(list, 'figure'),
        thresholdList: byTag(list, 'ul'),
        thresholdBand: band,
        thresholdSwatch: list.find((element) => element.parent === band && element.attrs['aria-hidden'] !== undefined),
        noDataBand: list.findLast((element) => element.tag === 'li'),
        noDataSwatch: list.findLast((element) => element.tag === 'span' && element.attrs['aria-hidden'] !== undefined),
        thresholdBar: startingWith(bar, 'flex h-2'),
    }
}
/** A threshold word, a template, filled as `thresholdBands` fills it. */
const thresholdWord = (said: string, fill: Record<string, string | number>) =>
    said.replace(/\{(\w+)\}/g, (whole, key: string) => (fill[key] === undefined ? whole : String(fill[key])))
/** The panel's field names, the defaults `usePanelFields` gives its words. */
const PANEL_FIELD_WORDS = PANEL_WORDS

const TIME_SERIES_PANEL_ADAPTER: Adapter = {
    wordObjects: { PANEL_FIELD_WORDS, THRESHOLD_LEGEND_WORDS },
    complete: ['PANEL_FIELD_WORDS', 'THRESHOLD_LEGEND_WORDS'],
    words: {
        category: 'PANEL_FIELD_WORDS.category',
        series: 'PANEL_FIELD_WORDS.series',
        value: 'PANEL_FIELD_WORDS.value',
        'threshold.below': ['THRESHOLD_LEGEND_WORDS.below', thresholdWord],
        'threshold.range': ['THRESHOLD_LEGEND_WORDS.range', thresholdWord],
        'threshold.atLeast': ['THRESHOLD_LEGEND_WORDS.atLeast', thresholdWord],
        'threshold.noData': 'THRESHOLD_LEGEND_WORDS.noData',
    },
    options: {
        fill: unionOf(TIME_SERIES_PANEL, 'SeriesFill'),
        legend: propValues(TIME_SERIES_PANEL, 'TimeSeriesPanelProps', 'legend'),
        span: Object.keys(SPAN),
        thresholdLayout: propValues(THRESHOLD_LEGEND, 'ThresholdLegendProps', 'layout'),
    },
    size: (size) => {
        if (size === 'chart')
            return {
                layers: [/bodyClassName = '([^']+)'/.exec(TIME_SERIES_PANEL)?.[1] ?? ''],
                on: [],
            }
        const { list, bar } = THRESHOLD_LEGENDS()
        return pieceWhere(thresholdPieces(list, bar)[size])
    },
    paint: (_, name, state) => {
        const { list, bar } = THRESHOLD_LEGENDS()
        const pieces = thresholdPieces(list, bar)
        if (name === 'thresholdLine')
            return drawnAs(lookClass(CHART_AXES, STEP_COLOR, 'border-'), lookClass(CHART_AXES, STEP_COLOR, 'text-'))
        if (state === 'noData') return pieceWhere(name === 'thresholdSwatch' ? pieces.noDataSwatch : pieces.noDataBand)
        return pieceWhere(pieces[name])
    },
    effect: () => skip('the time series panel states no effects'),
    keys: {
        'Enter, Space (a legend entry has focus)': () =>
            legendButton(LEGENDS().shown, 'Runs')?.attrs['aria-pressed'] !== undefined ? true : 'a legend entry is not a toggle button',
    },
    more: () =>
        layoutChecks('time-series-panel', {
            thresholdLineWidth: () => literalIn(CHART_AXES, /lineStyle: \{ color, type: 'dashed', width: ([\d.]+) \}/),
            referenceWidth: () => literalIn(CHART_CATEGORIES, /dashed \? \{ color, width: ([\d.]+), type: 'dashed' \}/),
            solidFill: () => literalIn(CHART_CATEGORIES, /opacity: stack === undefined \? ([\d.]+) :/),
        }),
}

// Code editor

const CODE_EDITOR = source('components/CodeEditor.tsx')
const codeEditor = (props: Partial<CodeEditorProps> = {}) =>
    draw(CodeEditor, {
        label: 'Definition',
        value: 'job: nightly-export',
        ...props,
    })
const CODE_EDITORS = once(() => ({
    field: codeEditor(),
    line: codeEditor({ variant: 'line' }),
    invalid: codeEditor({ invalid: true }),
    readOnly: codeEditor({ readOnly: true }),
}))
const editorBox = (elements: El[]) => byData(elements, 'data-slot', 'code-editor')

/** A rem length as the spacing step a utility class names it by: 0.75rem is 3. */
const remStep = (value: string) => {
    const rem = /^(-?\d*\.?\d+)rem$/.exec(value)?.[1]
    if (rem !== undefined) return String(Number(rem) * 4)
    return value === '0' ? '0' : undefined
}

/** A CSS color in the editor's theme as the class that draws it: `var(--x)` is x, a mix with transparent is x at its share. */
function cssColor(value: string): string | undefined {
    const plain = value.replace(/\s*!important$/, '').trim()
    if (plain === 'transparent') return 'transparent'
    const token = /^var\(--([a-z0-9-]+)\)$/.exec(plain)?.[1]
    if (token !== undefined) return token
    const mix = /^color-mix\(in oklab, var\(--([a-z0-9-]+)\) (\d+)%, transparent\)$/.exec(plain)
    return mix === null ? undefined : `${mix[1]}/${mix[2]}`
}

/** The tone colors the theme's `underline(tone)` and `dot(tone)` draw in, read from `TONES`. */
const TONE_COLORS = Object.fromEntries(
    [...(/const TONES = \{([^}]+)\}/.exec(CODE_EDITOR)?.[1] ?? '').matchAll(/(\w+): 'var\(--([a-z0-9-]+)\)'/g)].map((match) => [
        match[1],
        match[2],
    ]),
)

/** Padding as classes: one, two or four rem lengths, a pair of sides as one class where they are equal. */
function paddingClasses(value: string): string[] {
    const parts = value.split(/\s+/).map(remStep)
    if (parts.some((part) => part === undefined)) return []
    const [top, right = top, bottom = top, left = right] = parts as string[]
    const classes: string[] = []
    if (top === bottom) classes.push(`py-${top}`)
    else classes.push(`pt-${top}`, `pb-${bottom}`)
    if (left === right) classes.push(`px-${left}`)
    else classes.push(`pl-${left}`, `pr-${right}`)
    // A side at 0 says nothing a class need hold, and would stand over a piece's other padding.
    return classes.filter((one) => !one.endsWith('-0'))
}

/**
 * A style object of the editor's theme (`THEME`, `SIZES`) as the utility classes that draw the same:
 * read from the source object under its selector, each property turned into the class it equals.
 */
function themeClasses(selector: string, text = CODE_EDITOR): string {
    // The selector alone, or one of a list of selectors that share their style.
    const key = [...text.matchAll(/\n\s+'([^'\n]+)': /g)].find((match) => match[1] === selector || match[1].split(', ').includes(selector))
    if (key === undefined) return ''
    const rest = text.slice(key.index + key[0].length)
    const helper = /^(underline|dot)\('(\w+)'\)/.exec(rest)
    if (helper !== null) {
        const tone = TONE_COLORS[helper[2]]
        return helper[1] === 'underline' ? `underline mark-${tone}` : `bg-${tone} size-2`
    }
    const body = /^\{([^{}]*)\}/.exec(rest)?.[1] ?? ''
    const classes: string[] = []
    for (const [, key, value] of body.matchAll(/(\w+):\s*\n?\s*'([^']*)'/g)) {
        const shade = cssColor(value)
        if (key === 'color' && shade !== undefined) classes.push(`text-${shade}`)
        else if (key === 'backgroundColor' && shade !== undefined) classes.push(`bg-${shade}`)
        else if (key === 'background') {
            // A stack of washes: the top one is the color the piece shows over the rest.
            const top = /linear-gradient\(var\(--([a-z0-9-]+)\)/.exec(value)?.[1]
            if (top !== undefined) classes.push(`bg-${top}`)
        } else if (key === 'border' && value !== 'none') {
            const edge = /^1px solid (.+)$/.exec(value)
            const shown = edge === null ? undefined : cssColor(edge[1])
            if (shown !== undefined) classes.push('border', `border-${shown}`)
        } else if (key === 'borderTop' || key === 'borderBottom') {
            const edge = /^1px solid (.+)$/.exec(value)
            const shown = edge === null ? undefined : cssColor(edge[1])
            if (shown !== undefined)
                classes.push(`border-${key === 'borderTop' ? 't' : 'b'}`, `border-${key === 'borderTop' ? 't' : 'b'}-${shown}`)
        } else if (key === 'borderLeftColor' && shade !== undefined) classes.push(`border-l-${shade}`)
        else if (key === 'borderRadius' && value === 'var(--control-radius)') classes.push('rounded-control')
        else if (key === 'fontSize') {
            const size = /^var\(--text-([a-z0-9-]+)\)$/.exec(value)?.[1]
            if (size !== undefined) classes.push(`text-${size}`)
        } else if (key === 'fontWeight') classes.push(Object.entries(WEIGHTS).find(([, weight]) => String(weight) === value)?.[0] ?? '')
        else if (key === 'padding') classes.push(...paddingClasses(value))
        else if (key === 'width' && remStep(value) !== undefined) classes.push(`w-${remStep(value)}`)
        else if (key === 'minWidth' && remStep(value) !== undefined) classes.push(`min-w-${remStep(value)}`)
        else if (key === 'gap') {
            const [down, across = down] = value.split(/\s+/).map(remStep)
            if (down !== undefined && across !== undefined) classes.push(`gap-y-${down}`, `gap-x-${across}`)
        } else if (key === 'outline') {
            const ring = /^(\d+)px solid (.+)$/.exec(value)
            const shown = ring === null ? undefined : cssColor(ring[2])
            if (ring !== null && shown !== undefined) classes.push(`outline-${ring[1]}`, `outline-${shown}`)
        } else if (key === 'textDecoration' && value === 'underline') classes.push('underline')
        else if (key === 'backgroundImage') {
            // The indent guide: a 1px line drawn as a gradient in a color.
            const line = /^linear-gradient\(to right, var\(--([a-z0-9-]+)\) 1px/.exec(value)?.[1]
            if (line !== undefined) classes.push('border-l', `border-l-${line}`)
        }
    }
    return classes.filter(Boolean).join(' ')
}

/** The highlight style's entry that draws a token in its `code-*` color, as classes. */
const highlightClasses = (token: string) => {
    const entry = new RegExp(`\\{ tag: [^\\n]*color: 'var\\(--${token}\\)'([^\\n]*)\\}`).exec(CODE_EDITOR)
    if (entry === null) return ''
    const weight = /fontWeight: '(\d+)'/.exec(entry[1])?.[1]
    return [`text-${token}`, weight === undefined ? '' : (Object.entries(WEIGHTS).find(([, one]) => String(one) === weight)?.[0] ?? '')]
        .filter(Boolean)
        .join(' ')
}

/** A piece of the editor drawn by its theme, its states laid in order over its rest. */
const themed = (...selectors: string[]): Where => ({
    layers: selectors.map((one) => themeClasses(one)),
    on: [],
})

const FOCUSED_LINE = '&.cm-focused .cm-activeLine, &.cm-activeLine-always .cm-activeLine'
const FOCUSED_GUTTER = '&.cm-focused .cm-activeLineGutter, &.cm-activeLine-always .cm-activeLineGutter'
const SELECTION = '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection'
const COMPLETION_ROW = '.cm-tooltip.cm-tooltip-autocomplete > ul > li'

/** Where each piece of the editor is drawn, by piece and state. */
function editorPiece(name: string, state: string): Where | Skip | undefined {
    const { field, invalid, readOnly } = CODE_EDITORS()
    const box = (elements: El[], on: string[] = []) => pieceWhere(editorBox(elements), on)
    if (name === 'box') {
        if (state === 'rest') return box(field)
        if (state === 'focus') return box(field, ['focus-within'])
        if (state === 'invalid') return box(invalid)
        if (state === 'invalid+focus') return box(invalid, ['focus-within'])
        if (state === 'readOnly') {
            // The read-only ground is the editor's paper, a variable the class sets: its value read from that class.
            const paper = /\[--editor-paper:(color-mix\(in_oklab,var\(--[a-z0-9-]+\)_\d+%,var\(--[a-z0-9-]+\)\))\]/.exec(
                classesOf(editorBox(readOnly)),
            )?.[1]
            const where = box(readOnly)
            return where === undefined || paper === undefined ? where : { ...where, layers: [...where.layers, `bg-[${paper}]`] }
        }
        return undefined
    }
    if (name.startsWith('syntax-'))
        return {
            layers: [highlightClasses(`code-${name.slice('syntax-'.length)}`)],
            on: [],
        }
    const lineOf = (tone: string) => `.cm-mark-${tone}`
    switch (name) {
        case 'text':
            return themed('&')
        case 'gutter':
            return state === 'rest' ? themed('.cm-gutters') : themed('.cm-gutters', FOCUSED_GUTTER)
        case 'activeLine':
            return state === 'rest' ? themed('.cm-activeLine') : themed('.cm-activeLine', FOCUSED_LINE)
        case 'selection':
            return state === 'rest' ? themed(SELECTION) : themed(SELECTION, '&.cm-focused .cm-matchingBracket')
        case 'lineMark':
            return themed(lineOf(state))
        case 'rangeMark': {
            if (state === 'selected') return themed('.cm-lintRange-active')
            const classes = themeClasses(`.cm-lintRange-${state}`)
            return {
                layers: [classes],
                on: [],
                mark: classes
                    .split(' ')
                    .find((one) => one.startsWith('mark-'))
                    ?.replace('mark-', 'text-'),
            }
        }
        case 'lintDot':
            return themed(`.cm-lint-marker-${state}`)
        case 'tooltip':
            return state === 'rest' ? themed('.cm-tooltip') : themed('.cm-tooltip', `.cm-diagnostic-${state}`)
        case 'completion':
            return state === 'selected'
                ? themed('.cm-tooltip', COMPLETION_ROW, `${COMPLETION_ROW}[aria-selected]`)
                : themed('.cm-tooltip', COMPLETION_ROW)
        case 'foldGutter':
            return state === 'hover' ? themed('.cm-gutters', '.cm-foldGutter .cm-gutterElement:hover') : themed('.cm-gutters')
        case 'foldPlaceholder':
            return themed('.cm-foldPlaceholder')
        case 'searchPanel':
            return themed('.cm-panels', '.cm-panels-top')
        case 'bracket':
            return themed('.cm-bracket-0')
        case 'indentGuide':
            return themed('.cm-indent-guides')
        case 'placeholder':
            return themed('.cm-placeholder')
        case 'wikiLink':
            return themed('&.cm-follow-held .cm-wikiLink')
        default:
            return undefined
    }
}

/** A key the editor binds through a CodeMirror keymap it installs: the keymap's name in its source. */
const installs = (keymapName: string, when: RegExp) => () =>
    new RegExp(`keymap\\.of\\(\\[?[^\\n]*\\b${keymapName}\\b`).test(CODE_EDITOR) && when.test(CODE_EDITOR)
        ? true
        : `${keymapName} is not installed as the spec says`

/** Keys folding binds: each in the editor's fold keymap, which it installs with the fold gutter. */
const foldsOn =
    (...keys: string[]) =>
    (): true | string => {
        const bound = new Set(FOLD_KEYS.map((binding) => binding.key))
        const missing = keys.filter((key) => !bound.has(key))
        if (!/keymap\.of\(FOLD_KEYS\)/.test(CODE_EDITOR) || !/codeFolding\(\)/.test(CODE_EDITOR))
            return 'the fold keymap is not installed with folding'
        return missing.length === 0 ? true : `folding does not bind ${missing.join(', ')}`
    }

/** Says a schema issue of a kind as the words do, from a sample's values. */
const sayKind = (kind: string) => (_: never, fill: Record<string, string | number>) => {
    // A counted rule (a length, a number of items) says its count; a bound says its limit.
    const limit = Number(/^(min|max)(Length|Items)$/.test(kind) ? fill.count : fill.limit)
    const issues: Record<string, object> = {
        required: { kind: 'required', path: ['job', String(fill.property)] },
        additional: { kind: 'additional', property: String(fill.property) },
        type: { kind: 'type', expected: String(fill.expected) },
        enum: {
            kind: 'enum',
            values: String(fill.values)
                .split(', ')
                .map((one) => JSON.parse(one) as unknown),
        },
        const: {
            kind: 'const',
            value: JSON.parse(String(fill.value)) as unknown,
        },
        minimum: { kind: 'minimum', limit, exclusive: false },
        exclusiveMinimum: { kind: 'minimum', limit, exclusive: true },
        maximum: { kind: 'maximum', limit, exclusive: false },
        exclusiveMaximum: { kind: 'maximum', limit, exclusive: true },
        minLength: { kind: 'minLength', limit },
        maxLength: { kind: 'maxLength', limit },
        pattern: { kind: 'pattern', pattern: String(fill.pattern) },
        format: { kind: 'format', format: String(fill.format) },
        minItems: { kind: 'minItems', limit },
        maxItems: { kind: 'maxItems', limit },
        uniqueItems: { kind: 'uniqueItems' },
        deprecated: { kind: 'deprecated' },
        unchecked: { kind: 'unchecked', reason: String(fill.reason) },
        other: {
            kind: 'other',
            keyword: 'minLength',
            message: String(fill.message),
        },
    }
    return sayIssue(SCHEMA_WORDS, {
        path: [],
        tone: 'critical',
        ...issues[kind],
    } as unknown as Parameters<typeof sayIssue>[1])
}
const ISSUE_KINDS = [
    'required',
    'additional',
    'type',
    'enum',
    'const',
    'minimum',
    'exclusiveMinimum',
    'maximum',
    'exclusiveMaximum',
    'minLength',
    'maxLength',
    'pattern',
    'format',
    'minItems',
    'maxItems',
    'uniqueItems',
    'deprecated',
    'unchecked',
    'other',
]

/** A prop's values where its type is a union of strings and maybe boolean: the strings, and true and false. */
const withBoolean = (text: string, props: string, prop: string) => {
    const declared = new RegExp(`\\n\\s+${prop}\\?: ([^\\n]+)`).exec(text.slice(text.indexOf(`export interface ${props}`)))?.[1] ?? ''
    return [...(/\bboolean\b/.test(declared) ? ['true', 'false'] : []), ...propValues(text, props, prop)]
}

const CODE_EDITOR_ADAPTER: Adapter = {
    wordObjects: { SCHEMA_WORDS },
    complete: ['SCHEMA_WORDS'],
    words: {
        ...Object.fromEntries(
            ISSUE_KINDS.map((kind) => [
                `issue.${kind}`,
                [`SCHEMA_WORDS.${kind === 'deprecated' ? 'deprecatedKey' : kind}`, sayKind(kind)] as WordSource,
            ]),
        ),
        // The slot is the language's name as said (JSON); the function takes the language (json).
        syntax: [
            'SCHEMA_WORDS.syntax',
            (said: (language: 'json' | 'yaml') => string, fill) => said(String(fill.language).toLowerCase() as 'json'),
        ],
        deprecated: 'SCHEMA_WORDS.deprecated',
    },
    options: {
        language: (() => {
            const named = /type BuiltInLanguage = ([^\n]+)/.exec(CODE_EDITOR)?.[1] ?? ''
            return [...named.matchAll(/'([^']+)'/g)].map((match) => match[1])
        })(),
        variant: propValues(CODE_EDITOR, 'CodeEditorProps', 'variant'),
        size: propValues(CODE_EDITOR, 'CodeEditorProps', 'size'),
        activeLine: withBoolean(CODE_EDITOR, 'CodeEditorProps', 'activeLine'),
        yamlVersion: propValues(CODE_EDITOR, 'CodeEditorProps', 'yamlVersion'),
    },
    size: (size, key) => {
        const { field, line } = CODE_EDITORS()
        if (size === 'field') return pieceWhere(editorBox(field))
        if (size === 'line') return pieceWhere(editorBox(line))
        if (size === 'sm' || size === 'md' || size === 'lg') {
            const sized = /const SIZES = \{([\s\S]*?)\n\}/.exec(CODE_EDITOR)?.[1] ?? ''
            const font = new RegExp(`${size}: EditorView\\.theme\\(\\{ '&': \\{ fontSize: 'var\\(--text-([a-z0-9-]+)\\)' \\}`).exec(
                sized,
            )?.[1]
            return font === undefined ? undefined : { layers: [`text-${font}`], on: [] }
        }
        const read: Record<string, Where> = {
            text: themed('.cm-content', '.cm-line'),
            gutter: themed('.cm-lineNumbers .cm-gutterElement'),
            lintDot: key === 'icon' ? { ...themed('.cm-lint-marker-error'), on: SIZE_ON.icon } : themed('.cm-gutter-lint'),
            tooltip: themed('.cm-tooltip', '.cm-tooltip-hover .cm-hover'),
            completion: themed(COMPLETION_ROW),
            foldPlaceholder: themed('.cm-foldPlaceholder'),
            searchPanel: themed('.cm-panels', '.cm-panel.cm-search'),
        }
        return read[size]
    },
    paint: (_, name, state) => editorPiece(name, state),
    effect: () => skip('the code editor states no effects'),
    keys: {
        'Mod+Enter (onRun)': () =>
            /\.\.\.\(onRun === undefined \? \[\] : \['Mod-Enter'\]\)/.test(CODE_EDITOR) ? true : 'Mod-Enter is not bound with onRun',
        'Enter (variant line, with onRun)': () =>
            /\.\.\.\(oneLine \? \['Enter'\] : \[\]\)/.test(CODE_EDITOR) && /key === 'Enter' && oneLine/.test(CODE_EDITOR)
                ? true
                : 'Enter does not run in the line variant',
        'Tab, Shift+Tab (the editor has focus and is not read only)': installs('indentWithTab', /indentWithTab/),
        'Mod+Z, Mod+Y, Mod+Shift+Z (the editor has focus)': installs('historyKeymap', /history\(\)/),
        'Ctrl+Space (the editor has focus)': installs('completionKeymap', /autocompletion\(/),
        'ArrowDown, ArrowUp, PageDown, PageUp (the completion list is open)': installs('completionKeymap', /autocompletion\(/),
        'Enter (the completion list is open)': installs('completionKeymap', /autocompletion\(/),
        'Escape (the completion list is open)': installs('completionKeymap', /autocompletion\(/),
        "Tab, Shift+Tab (a snippet's fields are active)": () =>
            /import \{[^}]*\bsnippet\b[^}]*\} from '@codemirror\/autocomplete'/.test(source('components/code/schema.ts'))
                ? true
                : 'no snippet put in by the schema completion',
        'Mod+F (search)': installs('searchKeymap', /searchPanel\(/),
        'F3, Mod+G, Shift+F3, Mod+Shift+G (search)': installs('searchKeymap', /searchPanel\(/),
        'Escape (the find bar has focus)': installs('searchKeymap', /searchPanel\(/),
        'Mod+D, Mod+Shift+L, Mod+Alt+G (search)': installs('searchKeymap', /searchPanel\(/),
        'Ctrl+Shift+[, Ctrl+Shift+] (folding)': foldsOn('Ctrl-Shift-[', 'Ctrl-Shift-]'),
        'Ctrl+Alt+[, Ctrl+Alt+] (folding)': foldsOn('Ctrl-Alt-[', 'Ctrl-Alt-]'),
        'Mod+., Mod+Shift+. (folding)': foldsOn('Mod-.', 'Mod-Shift-.'),
        'Mod+Alt+., Mod+Alt+Shift+. (folding)': foldsOn('Mod-Alt-.', 'Mod-Alt-Shift-.'),
        'Mod+Click (markdown with onFollowLink)': () =>
            /classList\.toggle\('cm-follow-held', held\)/.test(CODE_EDITOR) && /followLinks\(/.test(CODE_EDITOR)
                ? true
                : 'no link followed on Mod and a click',
    },
    more: () =>
        layoutChecks('code-editor', {
            large: () => /export const LARGE_DOCUMENT = ([\d_]+)\b/.exec(CODE_EDITOR)?.[1].replace(/_/g, ''),
            hoverWait: () => numberIn(CODE_EDITOR, /hoverTooltip\(describe, \{ hoverTime: (\d+) \}\)/),
            lintWait: () => numberIn(CODE_EDITOR, /linter\([^\n]*\{ delay: (\d+) \}\)/),
            resolveWait: () => numberIn(CODE_EDITOR, /const RESOLVE_PAUSE = (\d+)\b/),
        }),
}

// Date field

const DATE_FIELD = source('components/DateField.tsx')
const PICKERS = source('components/pickers.tsx')
const CALENDAR = source('components/ui/calendar.tsx')
const DAY_PICK = source('components/day-pick.tsx')
const dateField = (props: Partial<Parameters<typeof DateField>[0]> = {}) =>
    draw(DateField, {
        id: 'first-run',
        label: 'First run',
        value: '2026-11-09',
        onValueChange: noop,
        ...props,
    })
const DATE_FIELDS = once(() => ({
    plain: dateField(),
    disabled: dateField({ disabled: true }),
    invalid: dateField({ error: 'Pick a later day' }),
    warning: dateField({ issues: [{ tone: 'warning', text: 'A Sunday' }] }),
}))
const dateFrame = (elements: El[]) => elements.find((element) => classesOf(element).includes('h-(--density-control)'))
const DATE_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-within'],
    keyFocus: ['focus-visible'],
    open: ['data-popup-open'],
    'invalid+focus': ['focus-within'],
    'warning+focus': ['focus-within'],
}
/** The calendar's day button, chosen (`selected-single`) or focused. */
const DAY_BUTTON = literalAfter(CALENDAR, 'function CalendarDayButton(', 'className={cn(')
/** The calendar's own classes for a kind of day (`today`, `disabled`), from its class names. */
const dayClasses = (kind: string) => literalAfter(CALENDAR, `${kind}: cn(`)
/** A day's size: the cell size the calendar sets, as a class of that many spacing steps. */
const CELL = /\[--cell-size:--spacing\((\d+)\)\]/.exec(literalAfter(CALENDAR, 'className={cn('))?.[1]
/** The calendar in its popover, which a server drawing leaves closed: its classes from the sources. */
const CALENDAR_BOX = [
    POPUP_LOOK,
    literalAfter(source('components/ui/popover.tsx'), 'data-slot="popover-content"'),
    literalAfter(PICKERS, '<PopoverContent', 'className={cn('),
]

const DATE_FIELD_ADAPTER: Adapter = {
    wordObjects: { DATE_FIELD_WORDS },
    complete: ['DATE_FIELD_WORDS'],
    words: {
        required: 'DATE_FIELD_WORDS.required',
        issueCritical: 'DATE_FIELD_WORDS.issueCritical',
        issueWarning: 'DATE_FIELD_WORDS.issueWarning',
        errors: [
            'IssueCount.errors',
            (_: never, fill) => draw(IssueCount, { critical: Number(fill.count), list: [] })[0]?.attrs['aria-label'] ?? '',
        ],
        warnings: [
            'IssueCount.warnings',
            (_: never, fill) =>
                draw(IssueCount, {
                    critical: 0,
                    warning: Number(fill.count),
                    list: [],
                })[0]?.attrs['aria-label'] ?? '',
        ],
        unreadable: 'DATE_FIELD_WORDS.unreadable',
        example: ['DATE_FIELD_WORDS.example', (said: (sample: string) => string, fill) => said(String(fill.sample))],
        under: ['DATE_FIELD_WORDS.under', (said: (min: string) => string, fill) => said(String(fill.min))],
        over: ['DATE_FIELD_WORDS.over', (said: (max: string) => string, fill) => said(String(fill.max))],
        use: ['DATE_FIELD_WORDS.use', (said: (bound: string) => string, fill) => said(String(fill.bound))],
        pick: 'DATE_FIELD_WORDS.pick',
        clear: 'DATE_FIELD_WORDS.clear',
    },
    options: {
        weekStartsOn: [...(/\n\s+weekStartsOn\?: ([^\n]+)/.exec(DATE_FIELD)?.[1] ?? '').matchAll(/\b(\d)\b/g)].map((match) => match[1]),
    },
    size: (size, key) => {
        const { plain } = DATE_FIELDS()
        if (size === 'control') return pieceWhere(dateFrame(plain))
        if (size === 'frameButton') {
            const clear = byLabel(plain, DATE_FIELD_WORDS.clear)
            return key === 'icon' ? pieceWhere(iconOf(plain, clear)) : pieceWhere(clear)
        }
        if (size === 'calendar') return { layers: [literalAfter(CALENDAR, 'className={cn(')], on: [] }
        if (size === 'day') return CELL === undefined ? undefined : { layers: [`size-${CELL}`], on: [] }
        return undefined
    },
    paint: (_, name, state) => {
        const { plain, disabled, invalid, warning } = DATE_FIELDS()
        const on = state.split('+').flatMap((one) => DATE_ON[one] ?? [])
        if (name === 'control') {
            const drawn = state.startsWith('invalid')
                ? invalid
                : state.startsWith('warning')
                  ? warning
                  : state === 'disabled'
                    ? disabled
                    : plain
            return pieceWhere(dateFrame(drawn), state.endsWith('focus') ? ['focus-within'] : on)
        }
        if (name === 'clear') return pieceWhere(byLabel(plain, DATE_FIELD_WORDS.clear), on)
        if (name === 'pick') return pieceWhere(byLabel(plain, DATE_FIELD_WORDS.pick), on)
        if (name === 'calendar') return { layers: CALENDAR_BOX, on: [] }
        if (name === 'day') {
            if (state === 'chosen') return { layers: [DAY_BUTTON], on: ['data-[selected-single=true]'] }
            if (state === 'dayFocus') return { layers: [DAY_BUTTON], on: ['group-data-[focused=true]/day'] }
            if (state === 'today') return { layers: [dayClasses('today')], on: [] }
            if (state === 'shut') return { layers: [dayClasses('disabled')], on: [] }
        }
        return undefined
    },
    effect: (state) => {
        const { plain, disabled, invalid, warning } = DATE_FIELDS()
        if (state === 'focus') return pieceWhere(dateFrame(plain), ['focus-within'])
        if (state === 'invalid+focus') return pieceWhere(dateFrame(invalid), ['focus-within'])
        if (state === 'warning+focus') return pieceWhere(dateFrame(warning), ['focus-within'])
        if (state === 'disabled') return pieceWhere(dateFrame(disabled))
        return undefined
    },
    keys: {
        Tab: () => {
            const { plain } = DATE_FIELDS()
            const input = plain.find((element) => element.tag === 'input')
            const clear = byLabel(plain, DATE_FIELD_WORDS.clear)
            const pick = byLabel(plain, DATE_FIELD_WORDS.pick)
            return focusable(input) && focusable(clear) && focusable(pick)
                ? true
                : 'the input, the clear or the pick button is out of the tab order'
        },
        'Alt+ArrowDown (the input has focus and the field can be changed)': () =>
            /if \(!event\.altKey \|\| event\.key !== 'ArrowDown'\) return/.test(DATE_FIELD) && /setOpened\(true\)/.test(DATE_FIELD)
                ? true
                : 'Alt+ArrowDown does not open the calendar',
        'Enter, Space (the pick or the clear button has focus)': () => {
            const { plain } = DATE_FIELDS()
            return byLabel(plain, DATE_FIELD_WORDS.clear)?.tag === 'button' && byLabel(plain, DATE_FIELD_WORDS.pick)?.tag === 'button'
                ? true
                : 'the clear or the pick button is not a native button'
        },
        'ArrowLeft, ArrowRight, ArrowUp, ArrowDown (the calendar is open)': skip(
            "react-day-picker's grid moves by these keys in a browser; the server draws the calendar closed",
        ),
        'PageUp, PageDown (the calendar is open)': skip("react-day-picker's grid moves by these keys in a browser"),
        'Home, End (the calendar is open)': skip("react-day-picker's grid moves by these keys in a browser"),
        'Enter, Space (the calendar is open)': () =>
            /onPick=\{\(day\) => \{\s*entry\.set\(day\)\s*setOpened\(false\)/.test(DATE_FIELD)
                ? true
                : 'picking a day does not close the calendar',
        'Escape (the calendar is open)': BASE_UI('Popover', 'closes on Escape and puts focus back on its trigger'),
    },
    more: () =>
        layoutChecks('date-field', {
            calendarLoading: () => numberIn(DAY_PICK, /flex h-72 w-(\d+) items-center/, 'step'),
        }),
}

// Side panel

const SIDE_PANEL = source('components/SidePanel.tsx')
const PANEL_TABS = [
    {
        id: 'details',
        label: 'Details',
        content: createElement('p', {}, 'run-4821'),
    },
    {
        id: 'log',
        label: 'Log',
        content: createElement('p', {}, 'fetched 1,204 records'),
    },
    {
        id: 'outputs',
        label: 'Outputs',
        content: createElement('p', {}, 'exports/harbor'),
    },
]
const SIDE_PANELS = once(() => ({
    tabbed: draw(SidePanel, { tabs: PANEL_TABS, defaultActive: 'log' }),
    titled: draw(SidePanel, { tabs: PANEL_TABS.slice(0, 1) }),
    section: draw(PanelSection, {
        title: 'Run',
        actions: createElement('button', { type: 'button' }, 'Clear'),
        children: 'nightly-export',
    }),
}))
/** The ink the shell's frame sets around its panel, which sets none of its own. */
const SHELL_INK = /className="group\/shell relative flex [^"]*\b(text-foreground)\b/.exec(SHELL)?.[1] ?? ''
const panelTab = (elements: El[], label: string) => elements.find((element) => element.attrs.role === 'tab' && element.text === label)
/** Each piece of a side panel, by its name in the spec. */
const sidePanelPieces = (): Record<string, El | undefined> => {
    const { tabbed, titled, section } = SIDE_PANELS()
    const edge = tabbed.find((element) => element.attrs.role === 'separator')
    const heading = byTag(section, 'h3')
    const row = heading?.parent
    return {
        panel: byTag(tabbed, 'aside'),
        edge,
        line: edge === undefined ? undefined : tabbed.find((element) => element.parent === edge),
        head: tabbed.find((element) => classesOf(element).split(' ').includes('h-shell-top')),
        title: byTag(titled, 'h2'),
        tabs: tabbed.find((element) => element.attrs.role === 'tablist'),
        tab: panelTab(tabbed, 'Details'),
        shown: panelTab(tabbed, 'Log'),
        section: byTag(section, 'section'),
        heading,
        headingRow: row,
        sectionActions: row === undefined ? undefined : section.find((element) => element.parent === row && element.tag === 'div'),
    }
}

const SIDE_PANEL_ADAPTER: Adapter = {
    wordObjects: { SIDE_PANEL_WORDS },
    complete: ['SIDE_PANEL_WORDS'],
    words: { resize: 'SIDE_PANEL_WORDS.resize' },
    options: { soleTab: propValues(SIDE_PANEL, 'SidePanelProps', 'soleTab') },
    size: (size) => pieceWhere(sidePanelPieces()[size]),
    paint: (_, name, state) => {
        const pieces = sidePanelPieces()
        if (name === 'title') {
            const where = pieceWhere(pieces.title)
            return where === undefined ? undefined : { ...where, around: [...(where.around ?? []), SHELL_INK] }
        }
        if (name === 'tab') return at(state === 'selected' ? pieces.shown : pieces.tab, state)
        if (name === 'edge') return at(pieces.line, state)
        return pieceWhere(pieces[name])
    },
    effect: () => skip('the side panel states no effects'),
    keys: {
        'ArrowLeft, ArrowRight, Home, End (a tab has focus)': () =>
            /<TabsPrimitive\.List\b/.test(SIDE_PANEL) && !/activateOnFocus|loopFocus=\{false\}/.test(SIDE_PANEL)
                ? true
                : "the tabs are not Base UI's tablist, which moves focus without showing a tab and wraps",
        'Enter, Space (a tab has focus)': () => (sidePanelPieces().tab?.tag === 'button' ? true : 'a tab is not a native button'),
        'ArrowLeft, ArrowRight, Home, End, Enter (the edge has focus)': () =>
            /<ResizeHandle[\s\S]*?onReset=\{held\.reset\}[\s\S]*?grows=\{-1\}/.test(SIDE_PANEL) &&
            /event\.key === forward\) step\(16\)\s+else if \(event\.key === back\) step\(-16\)/.test(RESIZE_HANDLE) &&
            /event\.key === 'Home'\) onSize\(min\)/.test(RESIZE_HANDLE) &&
            /event\.key === 'End'\) onSize\(max\)/.test(RESIZE_HANDLE) &&
            /event\.key === 'Enter' && \(onReset !== undefined \|\| reset !== undefined\)\) restore\(\)/.test(RESIZE_HANDLE)
                ? true
                : "the panel's edge misses an arrow, Home, End or Enter, or does not grow toward the start",
    },
    more: () => {
        const pieces = sidePanelPieces()
        return layoutChecks('side-panel', {
            defaultSize: () => numberIn(SIDE_PANEL, /rest: defaultSize \?\? width \?\? (\d+)/),
            minSize: () => numberIn(SIDE_PANEL, /minSize = (\d+)/),
            maxSize: () => numberIn(SIDE_PANEL, /maxSize = (\d+)/),
            resizeStep: () => numberIn(RESIZE_HANDLE, /event\.key === forward\) step\((\d+)\)/),
            edgeLine: () => lengthOn(pieces.line, READ.width),
            headStart: () => lengthOn(pieces.head, READ.padStart),
            headEnd: () => numberIn(SIDE_PANEL, /sheet \? 'pr-\d+' : 'pr-(\d+)'/, 'step'),
            headEndSheet: () => numberIn(SIDE_PANEL, /sheet \? 'pr-(\d+)'/, 'step'),
            roomy: () => numberIn(SHELL, /const ROOMY = '\(min-width: (\d+)rem\)'/, 'rem'),
            columnEase: () => durationIn(SHELL, /transition-\[grid-template-columns\] duration-(\w+)/),
        })
    },
}

// JSON tree

const JSON_TREES = once(() => ({
    folded: draw(JsonTree, {
        value: {
            job: 'nightly-export',
            records: 1204,
            retried: false,
            error: null,
            steps: ['fetch', 'upload'],
            labels: { project: 'harbor' },
        },
        open: 1,
    }),
    long: draw(JsonTree, {
        value: { steps: ['fetch', 'transform', 'validate'] },
        open: 2,
        limit: 1,
    }),
}))
const spanWith = (elements: El[], ink: string) =>
    elements.find((element) => element.tag === 'span' && classesOf(element).split(' ').includes(ink))
/** Each piece of a JSON tree, by its name in the spec. */
const jsonTreePieces = (): Record<string, El | undefined> => {
    const { folded, long } = JSON_TREES()
    const node = folded.find((element) => element.tag === 'button' && element.text.startsWith('labels'))
    return {
        tree: folded[0],
        node,
        disclosure: node === undefined ? undefined : folded.find((element) => element.tag === 'svg' && within(element, node)),
        key: folded.find((element) => element.tag === 'span' && element.text === 'job: '),
        bracket:
            node === undefined
                ? undefined
                : folded.find((element) => element.parent === node && classesOf(element) === 'text-muted-foreground'),
        count: folded.find((element) => element.tag === 'span' && classesOf(element).split(' ').includes('text-faint')),
        guide: folded.find((element) => element.tag === 'div' && classesOf(element).includes('border-l')),
        leaf: folded.find((element) => element.tag === 'div' && classesOf(element) === 'pl-4'),
        string: spanWith(folded, 'text-kind-green-ink'),
        number: spanWith(folded, 'text-kind-blue-ink'),
        boolean: spanWith(folded, 'text-kind-violet-ink'),
        null: folded.find((element) => element.tag === 'span' && element.text === 'null'),
        close: folded.find((element) => element.tag === 'div' && classesOf(element) === 'pl-4 text-muted-foreground'),
        step: long.find((element) => element.tag === 'button' && element.text.startsWith('Show')),
    }
}
const JSON_TREE_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
}

const JSON_TREE_ADAPTER: Adapter = {
    wordObjects: { JSON_TREE_WORDS },
    complete: ['JSON_TREE_WORDS'],
    words: {
        keys: ['JSON_TREE_WORDS.keys', (said: (count: number) => string, fill) => said(Number(fill.count))],
        items: ['JSON_TREE_WORDS.items', (said: (count: number) => string, fill) => said(Number(fill.count))],
        more: ['JSON_TREE_WORDS.more', (said: (count: number) => string, fill) => said(Number(fill.count))],
    },
    options: {},
    size: (size) => pieceWhere(jsonTreePieces()[size]),
    paint: (_, name, state) => pieceWhere(jsonTreePieces()[name], JSON_TREE_ON[state] ?? []),
    effect: () => skip('the JSON tree states no effects'),
    keys: {
        Tab: () => {
            const { node, step } = jsonTreePieces()
            return focusable(node) && focusable(step) ? true : 'a node or a step is out of the tab order'
        },
        'Enter, Space (a node has focus)': () => {
            const { node } = jsonTreePieces()
            return node?.tag === 'button' && node.attrs['aria-expanded'] !== undefined
                ? true
                : 'a node is not a native button with aria-expanded'
        },
        'Enter, Space (a step has focus)': () => (jsonTreePieces().step?.tag === 'button' ? true : 'the step is not a native button'),
    },
    more: () => {
        const { tree, guide, leaf } = jsonTreePieces()
        return layoutChecks('json-tree', {
            guideInset: () => numberIn(classesOf(guide), /\bml-(\d+(?:\.\d+)?)\b/, 'step'),
            entriesInset: () => numberIn(classesOf(guide), /\bpl-(\d+(?:\.\d+)?)\b/, 'step'),
            leafInset: () => lengthOn(leaf, READ.padStart),
            line: () => numberIn(classesOf(tree), /\bleading-(\d+)\b/, 'step'),
        })
    },
}

// Secret field

const SECRET_FIELD = source('components/SecretField.tsx')
const secretField = (props: Partial<SecretFieldProps> = {}) => draw(SecretField, { id: 'token', label: 'API token', ...props })
const SECRET_FIELDS = once(() => ({
    open: secretField({ value: 'harbor-key' }),
    sealed: secretField({
        sealed: true,
        setAt: '2026-11-07T09:00:00Z',
        now: new Date('2026-11-09T09:00:00Z'),
    }),
    replacing: secretField({ sealed: true, defaultReplacing: true }),
    disabled: secretField({ disabled: true }),
    invalid: secretField({ error: 'The token was refused' }),
    warning: secretField({
        issues: [{ tone: 'warning', text: 'Expires in a day' }],
    }),
}))
const secretFrame = (elements: El[]) => elements.find((element) => element.attrs['data-slot'] === 'secret-field')
const SECRET_REPLACE = SECRET_FIELD_WORDS.replaceLabel('API token')
const SECRET_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-within'],
    keyFocus: ['focus-visible'],
}

/** The secret field's frame in a state: its classes, then those of the field's box around it, which puts the issue's edge on it. */
function secretControl(state: string): Where | undefined {
    const { open, sealed, disabled, invalid, warning } = SECRET_FIELDS()
    const drawn = state.startsWith('invalid')
        ? invalid
        : state.startsWith('warning')
          ? warning
          : state === 'disabled'
            ? disabled
            : state === 'sealed'
              ? sealed
              : open
    const frame = secretFrame(drawn)
    if (frame === undefined) return undefined
    return {
        layers: [classesOf(frame), classesOf(frame.parent)],
        on: state.endsWith('focus') ? ['focus-within'] : [],
        around: ancestors(frame),
    }
}

const SECRET_FIELD_ADAPTER: Adapter = {
    wordObjects: { SECRET_FIELD_WORDS },
    complete: ['SECRET_FIELD_WORDS'],
    words: {
        required: 'SECRET_FIELD_WORDS.required',
        issueCritical: 'SECRET_FIELD_WORDS.issueCritical',
        issueWarning: 'SECRET_FIELD_WORDS.issueWarning',
        errors: [
            'IssueCount.errors',
            (_: never, fill) => draw(IssueCount, { critical: Number(fill.count), list: [] })[0]?.attrs['aria-label'] ?? '',
        ],
        warnings: [
            'IssueCount.warnings',
            (_: never, fill) =>
                draw(IssueCount, {
                    critical: 0,
                    warning: Number(fill.count),
                    list: [],
                })[0]?.attrs['aria-label'] ?? '',
        ],
        set: 'SECRET_FIELD_WORDS.set',
        setWhen: [
            'SECRET_FIELD_WORDS.setWhen',
            (said: (when: ReactNode) => ReactNode, fill) =>
                renderToStaticMarkup(createElement('span', null, said(String(fill.when)))).replace(/<[^>]+>/g, ''),
        ],
        replace: 'SECRET_FIELD_WORDS.replace',
        replaceLabel: ['SECRET_FIELD_WORDS.replaceLabel', (said: (label: string) => string, fill) => said(String(fill.label))],
        cancel: 'SECRET_FIELD_WORDS.cancel',
        show: 'SECRET_FIELD_WORDS.show',
        hide: 'SECRET_FIELD_WORDS.hide',
    },
    options: {
        requiredMark: propValues(SECRET_FIELD, 'SecretFieldProps', 'requiredMark'),
    },
    size: (size, key) => {
        const { open, sealed } = SECRET_FIELDS()
        if (size === 'control') return pieceWhere(secretFrame(open))
        if (size === 'reveal') {
            const reveal = byLabel(open, SECRET_FIELD_WORDS.show)
            return key === 'icon' ? pieceWhere(iconOf(open, reveal)) : pieceWhere(reveal)
        }
        if (size === 'action') return pieceWhere(byLabel(sealed, SECRET_REPLACE))
        if (size === 'sealedMark') return pieceWhere(iconOf(sealed, secretFrame(sealed)))
        return undefined
    },
    paint: (_, name, state) => {
        const { open, sealed, replacing } = SECRET_FIELDS()
        const on = state.split('+').flatMap((one) => SECRET_ON[one] ?? [])
        if (name === 'control') return secretControl(state)
        if (name === 'reveal') return pieceWhere(byLabel(open, SECRET_FIELD_WORDS.show), on)
        if (name === 'cancel') return pieceWhere(byText(replacing, 'button', SECRET_FIELD_WORDS.cancel), on)
        if (name === 'replace') return pieceWhere(byLabel(sealed, SECRET_REPLACE), on)
        if (name === 'sealedMark') return pieceWhere(iconOf(sealed, secretFrame(sealed)))
        if (name === 'dots') return pieceWhere(byText(sealed, 'span', '••••••••'))
        if (name === 'setNote') return pieceWhere(sealed.find((element) => element.tag === 'span' && element.text.startsWith('Set ')))
        return undefined
    },
    effect: (state) => (state === 'disabled' || state.endsWith('focus') ? secretControl(state) : undefined),
    keys: {
        Tab: () => {
            const { open, sealed, replacing, invalid } = SECRET_FIELDS()
            const stops = [
                open.find((element) => element.tag === 'input'),
                byLabel(open, SECRET_FIELD_WORDS.show),
                byText(replacing, 'button', SECRET_FIELD_WORDS.cancel),
                byLabel(sealed, SECRET_REPLACE),
                invalid.find((element) => element.attrs['aria-haspopup'] === 'dialog'),
            ]
            return stops.every(focusable) ? true : 'the input, the reveal, Cancel, Replace or the issue mark is out of the tab order'
        },
        'Enter, Space (the reveal has focus)': () => {
            const reveal = byLabel(SECRET_FIELDS().open, SECRET_FIELD_WORDS.show)
            return reveal?.tag === 'button' &&
                reveal.attrs['aria-pressed'] === 'false' &&
                /onClick=\{\(\) => setShown\(!shown\)\}/.test(SECRET_FIELD)
                ? true
                : 'the reveal is not a native toggle button'
        },
        'Enter, Space (Replace has focus)': () =>
            byLabel(SECRET_FIELDS().sealed, SECRET_REPLACE)?.tag === 'button' &&
            /moved\.current = 'input'\s*setReplacing\(true\)/.test(SECRET_FIELD)
                ? true
                : 'Replace does not open the input and move focus into it',
        'Escape (the input of a sealed field that can be changed has focus)': () =>
            /event\.key === 'Escape' && sealed && editable\) \{\s*event\.preventDefault\(\)\s*seal\(\)/.test(SECRET_FIELD) &&
            /const seal = \(\) => \{\s*moved\.current = 'replace'\s*setReplacing\(false\)\s*setShown\(false\)\s*onChange\?\.\(undefined\)/.test(
                SECRET_FIELD,
            )
                ? true
                : 'Escape does not seal the field again',
        'Enter, Space (Cancel has focus)': () =>
            byText(SECRET_FIELDS().replacing, 'button', SECRET_FIELD_WORDS.cancel)?.tag === 'button' &&
            /onClick=\{seal\}/.test(SECRET_FIELD)
                ? true
                : 'Cancel does not seal the field again',
    },
}

// Yes-no field

const YES_NO_FIELD = source('components/YesNoField.tsx')
const yesNoField = (props: Partial<YesNoFieldProps> = {}) =>
    draw(YesNoField, {
        id: 'notify',
        label: 'Notify on failure',
        value: null,
        onValueChange: noop,
        ...props,
    })
const YES_NO_FIELDS = once(() => ({
    unanswered: yesNoField(),
    answered: yesNoField({ value: true }),
    disabled: yesNoField({ disabled: true }),
    invalid: yesNoField({ error: 'Answer before you save' }),
    warned: yesNoField({
        issues: [{ tone: 'warning', text: 'Usually answered yes' }],
    }),
}))
const choiceOf = (elements: El[]) => elements.find((element) => element.attrs.role === 'group')
const optionOf = (elements: El[], label: string) =>
    elements.find((element) => element.tag === 'button' && element.attrs['aria-pressed'] !== undefined && element.text === label)
const YES_NO_ON: Record<string, string[]> = {
    hover: ['hover'],
    keyFocus: ['focus-visible'],
}

const YES_NO_FIELD_ADAPTER: Adapter = {
    wordObjects: { YES_NO_FIELD_WORDS },
    complete: ['YES_NO_FIELD_WORDS'],
    words: {
        required: 'YES_NO_FIELD_WORDS.required',
        issueCritical: 'YES_NO_FIELD_WORDS.issueCritical',
        issueWarning: 'YES_NO_FIELD_WORDS.issueWarning',
        errors: [
            'IssueCount.errors',
            (_: never, fill) => draw(IssueCount, { critical: Number(fill.count), list: [] })[0]?.attrs['aria-label'] ?? '',
        ],
        warnings: [
            'IssueCount.warnings',
            (_: never, fill) =>
                draw(IssueCount, {
                    critical: 0,
                    warning: Number(fill.count),
                    list: [],
                })[0]?.attrs['aria-label'] ?? '',
        ],
        yes: 'YES_NO_FIELD_WORDS.yes',
        no: 'YES_NO_FIELD_WORDS.no',
        clear: 'YES_NO_FIELD_WORDS.clear',
        unanswered: 'YES_NO_FIELD_WORDS.unanswered',
    },
    options: {},
    size: (size) => {
        const { unanswered, answered } = YES_NO_FIELDS()
        if (size === 'choice') return pieceWhere(choiceOf(unanswered), ['md'])
        if (size === 'option') return pieceWhere(optionOf(unanswered, YES_NO_FIELD_WORDS.yes), ['md'])
        if (size === 'clear') return pieceWhere(byText(answered, 'button', YES_NO_FIELD_WORDS.clear))
        return undefined
    },
    paint: (_, name, state) => {
        const { unanswered, answered, disabled } = YES_NO_FIELDS()
        const on = YES_NO_ON[state] ?? []
        if (name === 'choice') {
            const { invalid, warned } = YES_NO_FIELDS()
            return pieceWhere(
                choiceOf(state === 'disabled' ? disabled : state === 'invalid' ? invalid : state === 'warning' ? warned : unanswered),
            )
        }
        if (name === 'option') return pieceWhere(optionOf(state === 'chosen' ? answered : unanswered, YES_NO_FIELD_WORDS.yes), on)
        if (name === 'unanswered') return pieceWhere(byText(unanswered, 'span', YES_NO_FIELD_WORDS.unanswered))
        if (name === 'clear') return pieceWhere(byText(answered, 'button', YES_NO_FIELD_WORDS.clear), on)
        return undefined
    },
    effect: (state) => {
        if (state !== 'disabled') return undefined
        const { disabled } = YES_NO_FIELDS()
        const where = pieceWhere(choiceOf(disabled))
        return where === undefined
            ? undefined
            : {
                  ...where,
                  focusable: focusable(optionOf(disabled, YES_NO_FIELD_WORDS.yes)),
              }
    },
    keys: {
        Tab: () => {
            const { unanswered, answered, invalid } = YES_NO_FIELDS()
            const stops = [
                optionOf(unanswered, YES_NO_FIELD_WORDS.yes),
                optionOf(unanswered, YES_NO_FIELD_WORDS.no),
                byText(answered, 'button', YES_NO_FIELD_WORDS.clear),
                invalid.find((element) => element.attrs['aria-haspopup'] === 'dialog'),
            ]
            return stops.every(focusable) ? true : 'an option, Clear or the issue mark is out of the tab order'
        },
        'Enter, Space (an option has focus)': () =>
            optionOf(YES_NO_FIELDS().unanswered, YES_NO_FIELD_WORDS.yes)?.tag === 'button' &&
            /onValueChange=\{\(next\) => onValueChange\(next === 'yes'\)\}/.test(YES_NO_FIELD)
                ? true
                : 'an option is not a native button that answers with it',
        'Enter, Space (Clear has focus)': () =>
            byText(YES_NO_FIELDS().answered, 'button', YES_NO_FIELD_WORDS.clear)?.tag === 'button' &&
            /onClick=\{\(\) => onValueChange\(null\)\}/.test(YES_NO_FIELD)
                ? true
                : 'Clear does not take the answer back',
    },
    more: () =>
        layoutChecks('yes-no-field', {
            choiceGap: () => numberIn(YES_NO_FIELD, /'flex min-w-0 flex-wrap items-center gap-(\d+)'/, 'step'),
        }),
}

// Time field

const TIME_FIELD = source('components/TimeField.tsx')
const timeField = (props: Partial<TimeFieldProps> = {}) =>
    draw(TimeField, {
        id: 'window',
        label: 'Window opens',
        value: '14:30',
        onValueChange: noop,
        ...props,
    })
const TIME_FIELDS = once(() => ({
    plain: timeField({ zone: 'UTC' }),
    disabled: timeField({ disabled: true }),
    invalid: timeField({ error: 'Pick a later time' }),
    warning: timeField({
        issues: [{ tone: 'warning', text: 'After the nightly-export run' }],
    }),
}))
/** A time in the list, and the chosen one, which a server drawing leaves closed: their classes from the sources. */
const TIME_ROW = literalAfter(PICKERS, 'role="option"', 'className={cn(')
const TIME_CHOSEN = literalAfter(PICKERS, 'time === chosen && ')
const TIME_LIST = [literalAfter(PICKERS, 'role="listbox"', 'className={cn('), literalAfter(TIME_FIELD, '<TimeList', 'className=')]

const TIME_FIELD_ADAPTER: Adapter = {
    wordObjects: { TIME_FIELD_WORDS },
    complete: ['TIME_FIELD_WORDS'],
    words: {
        required: 'TIME_FIELD_WORDS.required',
        issueCritical: 'TIME_FIELD_WORDS.issueCritical',
        issueWarning: 'TIME_FIELD_WORDS.issueWarning',
        errors: [
            'IssueCount.errors',
            (_: never, fill) => draw(IssueCount, { critical: Number(fill.count), list: [] })[0]?.attrs['aria-label'] ?? '',
        ],
        warnings: [
            'IssueCount.warnings',
            (_: never, fill) =>
                draw(IssueCount, {
                    critical: 0,
                    warning: Number(fill.count),
                    list: [],
                })[0]?.attrs['aria-label'] ?? '',
        ],
        unreadable: 'TIME_FIELD_WORDS.unreadable',
        example: ['TIME_FIELD_WORDS.example', (said: (sample: string) => string, fill) => said(String(fill.sample))],
        under: ['TIME_FIELD_WORDS.under', (said: (min: string) => string, fill) => said(String(fill.min))],
        over: ['TIME_FIELD_WORDS.over', (said: (max: string) => string, fill) => said(String(fill.max))],
        use: ['TIME_FIELD_WORDS.use', (said: (bound: string) => string, fill) => said(String(fill.bound))],
        pick: 'TIME_FIELD_WORDS.pick',
        clear: 'TIME_FIELD_WORDS.clear',
        'periods.am': ['TIME_FIELD_WORDS.periods', (said: readonly string[]) => said[0]],
        'periods.pm': ['TIME_FIELD_WORDS.periods', (said: readonly string[]) => said[1]],
    },
    options: {
        clock: [...(/\n\s+clock\?: ([^\n]+)/.exec(TIME_FIELD)?.[1] ?? '').matchAll(/\b(\d+)\b/g)].map((match) => match[1]),
    },
    size: (size, key) => {
        const { plain } = TIME_FIELDS()
        if (size === 'control') return pieceWhere(dateFrame(plain))
        if (size === 'frameButton') {
            const clear = byLabel(plain, TIME_FIELD_WORDS.clear)
            return key === 'icon' ? pieceWhere(iconOf(plain, clear)) : pieceWhere(clear)
        }
        if (size === 'list') return { layers: TIME_LIST, on: [] }
        if (size === 'time') return { layers: [TIME_ROW], on: [] }
        return undefined
    },
    paint: (_, name, state) => {
        const { plain, disabled, invalid, warning } = TIME_FIELDS()
        const on = state.split('+').flatMap((one) => DATE_ON[one] ?? [])
        if (name === 'control') {
            const drawn = state.startsWith('invalid')
                ? invalid
                : state.startsWith('warning')
                  ? warning
                  : state === 'disabled'
                    ? disabled
                    : plain
            return pieceWhere(dateFrame(drawn), state.endsWith('focus') ? ['focus-within'] : on)
        }
        if (name === 'zone') return pieceWhere(byText(plain, 'span', 'UTC'))
        if (name === 'clear') return pieceWhere(byLabel(plain, TIME_FIELD_WORDS.clear), on)
        if (name === 'pick') return pieceWhere(byLabel(plain, TIME_FIELD_WORDS.pick), on)
        if (name === 'list') return { layers: CALENDAR_BOX, on: [] }
        if (name === 'time') {
            if (state === 'chosen') return { layers: [TIME_ROW, TIME_CHOSEN], on: [] }
            if (state === 'timeFocus') return { layers: [TIME_ROW], on: ['focus-visible'] }
            return { layers: [TIME_ROW], on }
        }
        return undefined
    },
    effect: (state) => {
        const { plain, disabled, invalid, warning } = TIME_FIELDS()
        if (state === 'focus') return pieceWhere(dateFrame(plain), ['focus-within'])
        if (state === 'invalid+focus') return pieceWhere(dateFrame(invalid), ['focus-within'])
        if (state === 'warning+focus') return pieceWhere(dateFrame(warning), ['focus-within'])
        if (state === 'disabled') return pieceWhere(dateFrame(disabled))
        return undefined
    },
    keys: {
        Tab: () => {
            const { plain } = TIME_FIELDS()
            const input = plain.find((element) => element.tag === 'input')
            const clear = byLabel(plain, TIME_FIELD_WORDS.clear)
            const pick = byLabel(plain, TIME_FIELD_WORDS.pick)
            return focusable(input) && focusable(clear) && focusable(pick)
                ? true
                : 'the input, the clear or the pick button is out of the tab order'
        },
        'Alt+ArrowDown (the input has focus and the field can be changed)': () =>
            /if \(!event\.altKey \|\| event\.key !== 'ArrowDown'\) return/.test(TIME_FIELD) && /setOpened\(true\)/.test(TIME_FIELD)
                ? true
                : 'Alt+ArrowDown does not open the list',
        'Enter, Space (the pick or the clear button has focus)': () => {
            const { plain } = TIME_FIELDS()
            return byLabel(plain, TIME_FIELD_WORDS.clear)?.tag === 'button' && byLabel(plain, TIME_FIELD_WORDS.pick)?.tag === 'button'
                ? true
                : 'the clear or the pick button is not a native button'
        },
        'ArrowUp, ArrowDown (the list is open)': () =>
            /ArrowDown: at \+ 1, ArrowUp: at - 1/.test(PICKERS) && /Math\.max\(0, Math\.min\(buttons\.length - 1, to\)\)/.test(PICKERS)
                ? true
                : 'the arrows do not move between the times, stopping at the ends',
        'Home, End (the list is open)': () =>
            /Home: 0, End: buttons\.length - 1/.test(PICKERS) ? true : 'Home and End do not go to the first and the last time',
        'Enter, Space (the list is open)': () =>
            /onPick=\{\(time\) => \{\s*entry\.set\(seconds \? `\$\{time\}:00` : time\)\s*setOpened\(false\)/.test(TIME_FIELD)
                ? true
                : 'picking a time does not close the list',
        'Escape (the list is open)': BASE_UI('Popover', 'closes on Escape and puts focus back on its trigger'),
    },
    more: () =>
        layoutChecks('time-field', {
            listMaxHeight: () => numberIn(TIME_FIELD, /className="max-h-(\d+) /, 'step'),
        }),
}

// Computed field

const computedField = (props: Partial<ComputedFieldProps> = {}) =>
    draw(ComputedField, {
        id: 'depth',
        label: 'Depth',
        value: '4.2',
        unit: 'm',
        why: 'The level less the zero',
        formula: 'level - zero',
        ...props,
    })
const COMPUTED_FIELDS = once(() => ({ valued: computedField() }))
const computedInput = (elements: El[]) => elements.find((element) => element.tag === 'input')

const COMPUTED_FIELD_ADAPTER: Adapter = {
    wordObjects: { COMPUTED_FIELD_WORDS },
    complete: ['COMPUTED_FIELD_WORDS'],
    words: {
        pending: 'COMPUTED_FIELD_WORDS.pending',
        computed: 'COMPUTED_FIELD_WORDS.computed',
    },
    options: {},
    size: (size, key) => {
        const { valued } = COMPUTED_FIELDS()
        if (size === 'control') return pieceWhere(computedInput(valued))
        if (size === 'why') {
            const row = valued.find((element) => element.tag === 'span' && element.parent?.attrs.id === 'depth-help')
            return key === 'icon' ? pieceWhere(iconOf(valued, row)) : pieceWhere(row)
        }
        return undefined
    },
    paint: (_, name, state) => {
        const { valued } = COMPUTED_FIELDS()
        const row = valued.find((element) => element.tag === 'span' && element.parent?.attrs.id === 'depth-help')
        if (name === 'control') return pieceWhere(computedInput(valued), state === 'focus' ? ['focus-visible'] : [])
        if (name === 'hint') return pieceWhere(byText(valued, 'span', COMPUTED_FIELD_WORDS.computed))
        if (name === 'whyIcon') return pieceWhere(iconOf(valued, row))
        if (name === 'why') return pieceWhere(valued.find((element) => element.attrs.id === 'depth-help')?.parent)
        if (name === 'formula') return pieceWhere(byText(valued, 'span', 'level - zero'))
        return undefined
    },
    effect: (state) => (state === 'focus' ? pieceWhere(computedInput(COMPUTED_FIELDS().valued), ['focus-visible']) : undefined),
    keys: {
        Tab: () => (focusable(computedInput(COMPUTED_FIELDS().valued)) ? 'the value is in the tab order' : true),
    },
}

// Repeated group

const REPEATED_GROUP = source('components/RepeatedGroup.tsx')
const REPEATED_DRAG = source('components/RepeatedDrag.tsx')
const SORTABLE = source('components/Sortable.tsx')
const STEP_ROWS = [{ key: 'fetch' }, { key: 'upload' }]
const repeatedGroup = (props: Partial<RepeatedGroupProps> = {}) =>
    draw(
        TooltipProvider,
        {},
        createElement(RepeatedGroup, {
            label: 'Steps',
            rows: STEP_ROWS,
            children: () => null,
            onAdd: noop,
            onRemove: noop,
            onMove: noop,
            ...props,
        }),
    )
const REPEATED_GROUPS = once(() => ({
    plain: repeatedGroup(),
    marked: repeatedGroup({
        required: true,
        description: 'Each step runs after the one before.',
        error: 'Add a step',
    }),
    worded: repeatedGroup({ required: true, requiredMark: 'word' }),
}))
const groupHead = (elements: El[]) => elements.find((element) => classesOf(element).includes('min-h-(--density-control-sm)'))
const rowHeadOf = (elements: El[]) =>
    elements.find((element) => element.tag === 'div' && element.parent?.tag === 'section' && classesOf(element).includes('-my-1'))

const REPEATED_GROUP_ADAPTER: Adapter = {
    wordObjects: { REPEATED_GROUP_WORDS },
    complete: ['REPEATED_GROUP_WORDS'],
    words: {
        add: 'REPEATED_GROUP_WORDS.add',
        remove: 'REPEATED_GROUP_WORDS.remove',
        moveUp: 'REPEATED_GROUP_WORDS.moveUp',
        moveDown: 'REPEATED_GROUP_WORDS.moveDown',
        item: ['REPEATED_GROUP_WORDS.item', (said: (place: number) => string, fill) => said(Number(fill.place))],
        itemAction: [
            'REPEATED_GROUP_WORDS.itemAction',
            (said: (action: string, item: string) => string, fill) => said(String(fill.action), String(fill.item)),
        ],
        first: 'REPEATED_GROUP_WORDS.first',
        last: 'REPEATED_GROUP_WORDS.last',
        required: 'REPEATED_GROUP_WORDS.required',
        issueCritical: 'REPEATED_GROUP_WORDS.issueCritical',
        issueWarning: 'REPEATED_GROUP_WORDS.issueWarning',
    },
    options: {
        requiredMark: propValues(REPEATED_GROUP, 'RepeatedGroupProps', 'requiredMark'),
    },
    size: (size, key) => {
        const { plain, marked } = REPEATED_GROUPS()
        switch (size) {
            case 'group':
                return pieceWhere(plain.find((element) => element.tag === 'fieldset'))
            case 'head':
                return pieceWhere(groupHead(plain))
            case 'title':
                return pieceWhere(plain.find((element) => element.attrs.tabindex === '-1'))
            case 'issueMark':
                return pieceWhere(marked.find((element) => classesOf(element).includes('size-(--density-control-sm)')))
            case 'row':
                return pieceWhere(plain.find((element) => element.tag === 'section'))
            case 'rowHead':
                return pieceWhere(rowHeadOf(plain))
            case 'move':
                return pieceWhere(
                    byLabel(plain, REPEATED_GROUP_WORDS.itemAction(REPEATED_GROUP_WORDS.moveUp, REPEATED_GROUP_WORDS.item(2))),
                )
            case 'grip':
                return key === 'gap'
                    ? {
                          layers: [literalAfter(REPEATED_DRAG, '<SortableItem', 'className=')],
                          on: [],
                      }
                    : undefined
            default:
                return undefined
        }
    },
    paint: (_, name, state) => {
        const { plain, marked, worded } = REPEATED_GROUPS()
        const on = state === 'hover' ? ['hover'] : state === 'shut' ? ['aria-disabled'] : []
        const { moveUp, moveDown, remove, item, itemAction } = REPEATED_GROUP_WORDS
        switch (name) {
            case 'title':
                return pieceWhere(plain.find((element) => element.attrs.tabindex === '-1'))
            case 'requiredStar':
                return pieceWhere(marked.find((element) => element.tag === 'span' && element.text === '*'))
            case 'requiredWord':
                return pieceWhere(byText(worded, 'span', REPEATED_GROUP_WORDS.required))
            case 'description':
                return pieceWhere(marked.find((element) => element.tag === 'p'))
            case 'row':
                return pieceWhere(plain.find((element) => element.tag === 'section'))
            case 'itemName':
                return pieceWhere(byText(plain, 'span', item(1)))
            case 'add':
                return pieceWhere(byText(plain, 'button', REPEATED_GROUP_WORDS.add), on)
            // The first row's Move up and the last row's Move down are the shut ones.
            case 'moveUp':
                return pieceWhere(byLabel(plain, itemAction(moveUp, item(state === 'shut' ? 1 : 2))), on)
            case 'moveDown':
                return pieceWhere(byLabel(plain, itemAction(moveDown, item(state === 'shut' ? 2 : 1))), on)
            case 'remove':
                return pieceWhere(
                    plain.find((element) => element.tag === 'button' && element.attrs['aria-label'] === itemAction(remove, item(1))),
                    on,
                )
            default:
                return undefined
        }
    },
    effect: (state) => {
        if (state !== 'shut') return undefined
        const shut = byLabel(
            REPEATED_GROUPS().plain,
            REPEATED_GROUP_WORDS.itemAction(REPEATED_GROUP_WORDS.moveUp, REPEATED_GROUP_WORDS.item(1)),
        )
        return shut === undefined
            ? undefined
            : {
                  layers: [classesOf(shut)],
                  on: ['aria-disabled'],
                  around: ancestors(shut),
                  focusable: focusable(shut),
              }
    },
    keys: {
        Tab: () => {
            const { plain } = REPEATED_GROUPS()
            const { moveUp, moveDown, item, itemAction } = REPEATED_GROUP_WORDS
            return focusable(byText(plain, 'button', REPEATED_GROUP_WORDS.add)) &&
                focusable(byLabel(plain, itemAction(moveDown, item(1)))) &&
                focusable(byLabel(plain, itemAction(moveUp, item(1))))
                ? true
                : 'Add or a Move, a shut one included, is out of the tab order'
        },
        'Enter, Space (Add, a Move or a Remove has focus)': () =>
            byText(REPEATED_GROUPS().plain, 'button', REPEATED_GROUP_WORDS.add) !== undefined &&
            byLabel(REPEATED_GROUPS().plain, REPEATED_GROUP_WORDS.itemAction(REPEATED_GROUP_WORDS.moveDown, REPEATED_GROUP_WORDS.item(1)))
                ?.tag === 'button'
                ? true
                : 'Add or a Move is not a native button',
        'ArrowUp, ArrowDown (a grip has focus, inside a RepeatedDrag)': () =>
            /<SortableGrip/.test(REPEATED_DRAG) && sortableStep('ArrowUp', 'list') === -1 && sortableStep('ArrowDown', 'list') === 1
                ? true
                : 'the grip does not move its row with the arrows',
        'Enter, Space (a grip has focus, inside a RepeatedDrag)': () =>
            /useSensor\(KeyboardSensor/.test(DRAG_DROP) ? true : 'no keyboard sensor picks a row up in the drag scope',
        'Escape (a row is picked up)': () =>
            /useSensor\(KeyboardSensor/.test(DRAG_DROP) ? true : 'no keyboard sensor puts a row back in the drag scope',
    },
    more: () =>
        layoutChecks('repeated-group', {
            descriptionPull: () => numberIn(REPEATED_GROUP, /<p className="-mt-(\d+) /, 'step'),
            rowHeadPull: () => numberIn(REPEATED_GROUP, /<div className="-my-(\d+) /, 'step'),
            gripTop: () => numberIn(REPEATED_DRAG, /<SortableGrip type="button" className="mt-(\d+)"/, 'step'),
        }),
}

// Period picker

const PERIOD_PICKER = source('components/PeriodPicker.tsx')
const PERIODS = source('lib/periods.ts')
const periodPicker = (props: Partial<PeriodPickerProps> = {}) =>
    draw(PeriodPicker, {
        type: 'monthly',
        value: '202610',
        onValueChange: noop,
        today: '2026-11-08',
        ...props,
    })
const PERIOD_PICKERS = once(() => ({
    plain: periodPicker(),
    empty: periodPicker({ value: null }),
    disabled: periodPicker({ disabled: true }),
    typed: periodPicker({ value: '202401' }),
    typedDisabled: periodPicker({ value: '202401', disabled: true }),
    refused: periodPicker({ value: 'harbor' }),
    // In a field with a critical issue, the trigger wears the edge.
    inField: draw(Field, {
        id: 'period',
        label: 'Period',
        error: 'Choose a period',
        children: createElement(PeriodPicker, {
            type: 'monthly',
            value: '202610',
            onValueChange: noop,
            today: '2026-11-08',
        }),
    }),
}))
const periodTrigger = (elements: El[]) => elements.find((element) => element.attrs['data-slot'] === 'select-trigger')
const periodTyped = (elements: El[]) =>
    elements.find((element) => element.tag === 'input' && element.attrs['aria-label'] === PERIOD_PICKER_WORDS.typed)
const periodIdOf = (elements: El[]) => elements.find((element) => element.tag === 'span' && classesOf(element).includes('font-mono'))
const triggerOn = (elements: El[], on: string[]): Where | undefined => {
    const trigger = periodTrigger(elements)
    return trigger === undefined
        ? undefined
        : {
              layers: [classesOf(trigger)],
              on,
              around: ancestors(trigger),
              focusable: focusable(trigger),
          }
}
/** A word of the period labels that is one entry of a list or a record. */
const entry = (path: string, at: string | number): WordSource => [path, (said: Record<string | number, string>) => said[at]]

const PERIOD_PICKER_ADAPTER: Adapter = {
    wordObjects: { PERIOD_PICKER_WORDS },
    complete: ['PERIOD_PICKER_WORDS'],
    words: {
        empty: 'PERIOD_PICKER_WORDS.empty',
        otherType: [
            'PERIOD_PICKER_WORDS.otherType',
            (said: (id: unknown, its: unknown, wanted: unknown, example: unknown) => string, fill) =>
                said(fill.id, fill.its, fill.wanted, fill.example),
        ],
        notPeriod: [
            'PERIOD_PICKER_WORDS.notPeriod',
            (said: (text: unknown, wanted: unknown, example: unknown) => string, fill) => said(fill.text, fill.wanted, fill.example),
        ],
        ...Object.fromEntries(
            PERIOD_PICKER_WORDS.monthNames.map((_, at) => [`monthNames.${String(at)}`, entry('PERIOD_PICKER_WORDS.monthNames', at)]),
        ),
        ...Object.fromEntries(
            PERIOD_PICKER_WORDS.shortMonthNames.map((_, at) => [
                `shortMonthNames.${String(at)}`,
                entry('PERIOD_PICKER_WORDS.shortMonthNames', at),
            ]),
        ),
        ...Object.fromEntries(
            Object.keys(PERIOD_PICKER_WORDS.types).map((type) => [`types.${type}`, entry('PERIOD_PICKER_WORDS.types', type)]),
        ),
        day: [
            'PERIOD_PICKER_WORDS.day',
            (said: (month: unknown, date: unknown, year: unknown) => string, fill) => said(fill.month, fill.date, fill.year),
        ],
        week: [
            'PERIOD_PICKER_WORDS.week',
            (said: (week: unknown, year: unknown, startMonth: unknown, startDate: unknown) => string, fill) =>
                said(fill.week, fill.year, fill.startMonth, fill.startDate),
        ],
        month: ['PERIOD_PICKER_WORDS.month', (said: (month: unknown, year: unknown) => string, fill) => said(fill.month, fill.year)],
        months: [
            'PERIOD_PICKER_WORDS.months',
            (said: (first: unknown, last: unknown, year: unknown) => string, fill) => said(fill.first, fill.last, fill.year),
        ],
        year: ['PERIOD_PICKER_WORDS.year', (said: (year: unknown) => string, fill) => said(fill.year)],
        issueCritical: 'PERIOD_PICKER_WORDS.issueCritical',
        issueWarning: 'PERIOD_PICKER_WORDS.issueWarning',
        other: 'PERIOD_PICKER_WORDS.other',
        typed: 'PERIOD_PICKER_WORDS.typed',
        placeholder: 'PERIOD_PICKER_WORDS.placeholder',
    },
    options: {
        type: [...(/export type PeriodType = ([^\n]+)/.exec(PERIODS)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]),
    },
    size: (size) => {
        const { plain, typed } = PERIOD_PICKERS()
        switch (size) {
            case 'picker':
                return pieceWhere(plain[0])
            case 'trigger':
                return triggerOn(plain, ['data-[size=default]'])
            case 'row':
                return pieceWhere(periodIdOf(plain)?.parent)
            case 'periodId':
                return pieceWhere(periodIdOf(plain))
            case 'typed':
                return pieceWhere(periodTyped(typed))
            default:
                return undefined
        }
    },
    paint: (_, name, state) => {
        const { plain, empty, disabled, typed, typedDisabled, refused } = PERIOD_PICKERS()
        switch (name) {
            case 'trigger':
                if (state === 'placeholder') return triggerOn(empty, ['data-placeholder'])
                if (state === 'disabled') return triggerOn(disabled, ['disabled'])
                if (state === 'fieldInvalid') return triggerOn(PERIOD_PICKERS().inField, [])
                return triggerOn(plain, state === 'focus' ? ['focus-visible'] : [])
            case 'list':
                return { layers: [POPUP_LOOK, SELECT_LIST.list], on: [] }
            case 'row':
                return { layers: [SELECT_LIST.row], on: rowOn(state) }
            case 'periodId':
                return {
                    layers: [SELECT_LIST.row, classesOf(periodIdOf(plain))],
                    on: rowOn(state),
                }
            case 'separator':
                return { layers: [SELECT_LIST.separator], on: [] }
            case 'typed': {
                const drawn = state.startsWith('invalid') ? refused : state === 'disabled' ? typedDisabled : typed
                const on = state === 'disabled' ? ['disabled'] : state.endsWith('typedFocus') ? ['focus-visible'] : []
                return pieceWhere(periodTyped(drawn), state.startsWith('invalid') ? ['aria-invalid', ...on] : on)
            }
            default:
                return undefined
        }
    },
    effect: (state) => {
        const { disabled, typed, refused } = PERIOD_PICKERS()
        if (state === 'typedFocus') return pieceWhere(periodTyped(typed), ['focus-visible'])
        if (state === 'invalid+typedFocus') return pieceWhere(periodTyped(refused), ['aria-invalid', 'focus-visible'])
        if (state === 'disabled') return triggerOn(disabled, ['disabled'])
        return undefined
    },
    keys: {
        Tab: () => {
            const { plain, typed, disabled } = PERIOD_PICKERS()
            return focusable(periodTrigger(plain)) && focusable(periodTyped(typed)) && !focusable(periodTrigger(disabled))
                ? true
                : 'the trigger or the typed input is out of the tab order, or a disabled one in it'
        },
        'Enter, Space, ArrowDown, ArrowUp (the trigger has focus)': () => {
            const trigger = periodTrigger(PERIOD_PICKERS().plain)
            return trigger?.tag === 'button' && trigger.attrs.role === 'combobox' ? true : "the trigger is not Base UI's combobox button"
        },
        'ArrowDown, ArrowUp (the list is open)': BASE_UI('select', 'moves the highlight'),
        'Enter, Space (a row is highlighted)': () =>
            /if \(next === OTHER\) \{\s*setTyping\(true\)/.test(PERIOD_PICKER) ? true : 'Other period does not open the typed input',
        'Escape (the list is open)': () => focusBack(SELECT),
    },
    more: () =>
        layoutChecks('period-picker', {
            listMaxHeight: () => numberIn(PERIOD_PICKER, /<SelectContent alignItemWithTrigger=\{false\} className="max-h-(\d+)"/, 'step'),
            issueRoom: () => numberIn(PERIOD_PICKER, /cn\('pr-(\d+)', ISSUE_EDGE\.critical\)/, 'step'),
        }),
}

// Tree select

const TREE_SELECT = source('components/TreeSelect.tsx')
const TREE = source('components/Tree.tsx')
const POPOVER = source('components/ui/popover.tsx')
const BARE_INPUT = literalAfter(source('components/ui/input.tsx'), 'const BARE =')
const REGIONS: TreeNode[] = [
    {
        id: 'europe',
        label: 'Europe',
        icon: Folder,
        meta: 2,
        children: [
            {
                id: 'norway',
                label: 'Norway',
                children: [
                    { id: 'bergen', label: 'Bergen' },
                    { id: 'oslo', label: 'Oslo' },
                ],
            },
            { id: 'portugal', label: 'Portugal' },
        ],
    },
]
const treeSelect = (props: Partial<TreeSelectProps> = {}) =>
    draw(TreeSelect, {
        nodes: REGIONS,
        value: ['bergen'],
        onValueChange: noop,
        ...props,
    })
const tree = (props: Partial<TreeProps> = {}) =>
    draw(Tree, {
        label: TREE_SELECT_WORDS.search,
        nodes: REGIONS,
        selected: ['bergen'],
        defaultExpanded: ['europe', 'norway'],
        unavailable: (node: TreeNode) => (node.id === 'oslo' ? 'Outside the assignment' : undefined),
        ...props,
    })
const TREE_SELECTS = once(() => ({
    plain: treeSelect(),
    empty: treeSelect({ value: [] }),
    several: treeSelect({ value: ['bergen', 'portugal'] }),
    refused: treeSelect({ invalid: true }),
    single: tree(),
    multiple: tree({ selection: 'multiple' }),
    found: tree({ query: 'Ber' }),
}))
const treeTrigger = (elements: El[]) => elements.find((element) => element.attrs['data-slot'] === 'popover-trigger')
const treeRow = (elements: El[], id: string) =>
    elements.find((element) => element.attrs.role === 'treeitem' && element.attrs['data-id'] === id)
/** A node's own icon, after its toggle's chevron: the first row's 16 icon. */
const nodeIcon = (elements: El[]) => {
    const row = treeRow(elements, 'europe')
    return row === undefined
        ? undefined
        : elements.find((element) => element.tag === 'svg' && classesOf(element).includes('size-4') && within(element, row))
}
const treeToggle = (elements: El[]) =>
    elements.find((element) => element.tag === 'button' && element.attrs.tabindex === '-1' && classesOf(element).includes('size-5'))
/** The popup's parts, which open in a portal no server drawing reaches: their classes are read from the sources. */
const TREE_SELECT_POPUP = {
    popup: [POPUP_LOOK, literalAfter(POPOVER, 'data-slot="popover-content"'), literalAfter(TREE_SELECT, '<PopoverContent', 'className=')],
    searchBar: literalAfter(TREE_SELECT, '<PopoverContent', '<div className='),
    searchIcon: literalAfter(TREE_SELECT, '<Search className='),
    search: [BARE_INPUT, literalAfter(TREE_SELECT, 'aria-label={words.search}', 'className=')],
    clear: literalAfter(TREE_SELECT, '!optional && (', 'className='),
    clearIcon: literalAfter(TREE_SELECT, '!optional && (', '<X className='),
    list: /<div className="(max-h-\d+ overflow-y-auto p-\d+)"/.exec(TREE_SELECT)?.[1] ?? '',
    clearRow: literalAfter(TREE_SELECT, 'aria-pressed={value.length === 0}', 'className={cn('),
    clearRowChosen: literalAfter(TREE_SELECT, 'aria-pressed={value.length === 0}', 'value.length === 0 &&'),
    statusRow: literalAfter(TREE, 'key={`${row.node.id}:status`}', 'className='),
    failed: literalAfter(TREE, 'key={`${row.node.id}:status`}', '<span className="size-5 shrink-0" aria-hidden />', '<span className='),
    retry: literalAfter(TREE, 'onClick={() => retry(row.node.id)}', 'className='),
    retryIcon: literalAfter(TREE, 'onClick={() => retry(row.node.id)}', '<RotateCw className='),
    trailPath: literalAfter(TREE, '<span className="max-w-2/3 shrink-0 truncate">', '<span className='),
    note: literalAfter(TREE, "note === 'searching' ? (", '<p className='),
}
const TREE_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
    rowFocus: ['focus-visible'],
    invalid: ['aria-invalid'],
    'invalid+focus': ['aria-invalid', 'focus-visible'],
    'chosen+hover': ['hover'],
    checked: ['data-checked'],
    mixed: ['data-indeterminate'],
    shut: ['disabled'],
}
const treeKey = (pattern: RegExp, missing: string) => () => (pattern.test(TREE) ? true : missing)

const TREE_SELECT_ADAPTER: Adapter = {
    wordObjects: { TREE_SELECT_WORDS },
    complete: ['TREE_SELECT_WORDS'],
    words: {
        placeholder: 'TREE_SELECT_WORDS.placeholder',
        search: 'TREE_SELECT_WORDS.search',
        clear: 'TREE_SELECT_WORDS.clear',
        empty: 'TREE_SELECT_WORDS.empty',
        selected: ['TREE_SELECT_WORDS.selected', (said: (count: number) => string, fill) => said(Number(fill.count))],
        loading: 'TREE_SELECT_WORDS.loading',
        failed: 'TREE_SELECT_WORDS.failed',
        retry: 'TREE_SELECT_WORDS.retry',
        searching: 'TREE_SELECT_WORDS.searching',
        searchFailed: 'TREE_SELECT_WORDS.searchFailed',
    },
    options: {},
    size: (size, key) => {
        const { plain, single, multiple } = TREE_SELECTS()
        const trigger = treeTrigger(plain)
        const literal = (classes: string): Where => ({ layers: [classes], on: [] })
        switch (size) {
            case 'trigger':
                return pieceWhere(trigger)
            case 'value':
                return pieceWhere(plain.find((element) => element.tag === 'span' && element.parent === trigger))
            case 'chevron':
                return pieceWhere(iconOf(plain, trigger))
            case 'searchBar':
                return literal(TREE_SELECT_POPUP.searchBar)
            case 'searchIcon':
                return literal(TREE_SELECT_POPUP.searchIcon)
            case 'search':
                return { layers: TREE_SELECT_POPUP.search, on: [] }
            case 'clear':
                return literal(key === 'icon' ? TREE_SELECT_POPUP.clearIcon : TREE_SELECT_POPUP.clear)
            case 'list':
                return literal(TREE_SELECT_POPUP.list)
            case 'clearRow':
                return literal(TREE_SELECT_POPUP.clearRow)
            case 'row':
                return pieceWhere(treeRow(single, 'europe'))
            case 'toggle':
                return key === 'icon' ? pieceWhere(iconOf(single, treeToggle(single))) : pieceWhere(treeToggle(single))
            case 'icon':
                return pieceWhere(nodeIcon(single))
            case 'checkbox':
                return pieceWhere(multiple.find((element) => element.attrs['data-slot'] === 'checkbox'))
            case 'statusRow':
                return literal(TREE_SELECT_POPUP.statusRow)
            case 'retry':
                return literal(key === 'icon' ? TREE_SELECT_POPUP.retryIcon : TREE_SELECT_POPUP.retry)
            case 'note':
                return literal(TREE_SELECT_POPUP.note)
            default:
                return undefined
        }
    },
    paint: (_, name, state) => {
        const { plain, empty, several, refused, single, multiple, found } = TREE_SELECTS()
        const on = state.split('+').flatMap((one) => TREE_ON[one] ?? [])
        const literal = (...layers: string[]): Where => ({ layers, on })
        switch (name) {
            case 'trigger':
                return pieceWhere(treeTrigger(state.startsWith('invalid') ? refused : plain), on)
            case 'value':
                return pieceWhere(
                    empty.find(
                        (element) =>
                            element.tag === 'span' && element.text === TREE_SELECT_WORDS.placeholder && element.parent?.tag === 'span',
                    ),
                )
            case 'path':
                return pieceWhere(plain.find((element) => element.tag === 'span' && element.text === 'Europe / Norway'))
            case 'count':
                return pieceWhere(several.find((element) => element.attrs['aria-label'] === TREE_SELECT_WORDS.selected(2)))
            case 'chevron':
                return pieceWhere(iconOf(plain, treeTrigger(plain)))
            case 'popup':
                return { layers: TREE_SELECT_POPUP.popup, on: [] }
            case 'searchBar':
                return literal(TREE_SELECT_POPUP.searchBar)
            case 'searchIcon':
                return literal(TREE_SELECT_POPUP.searchIcon)
            case 'search':
                return { layers: TREE_SELECT_POPUP.search, on: [] }
            case 'clear':
                return literal(TREE_SELECT_POPUP.clear)
            case 'clearRow':
                return literal(TREE_SELECT_POPUP.clearRow, ...(state.startsWith('chosen') ? [TREE_SELECT_POPUP.clearRowChosen] : []))
            case 'row':
                return pieceWhere(treeRow(single, state.startsWith('chosen') ? 'bergen' : state === 'shut' ? 'oslo' : 'europe'), on)
            case 'toggle':
                return pieceWhere(treeToggle(single), on)
            case 'icon':
                return pieceWhere(nodeIcon(single))
            case 'checkbox':
                return pieceWhere(
                    multiple.find((element) => element.attrs['data-slot'] === 'checkbox'),
                    on,
                )
            case 'match':
                return pieceWhere(found.find((element) => element.tag === 'mark'))
            case 'trailPath':
                return literal(TREE_SELECT_POPUP.trailPath)
            case 'reason':
                return pieceWhere(single.find((element) => element.tag === 'span' && element.attrs.title === 'Outside the assignment'))
            case 'meta':
                return pieceWhere(
                    single.find((element) => element.tag === 'span' && element.text === '2' && classesOf(element).includes('tabular-nums')),
                )
            case 'loadingRow':
                return literal(TREE_SELECT_POPUP.statusRow)
            case 'failedRow':
                return literal(TREE_SELECT_POPUP.statusRow, TREE_SELECT_POPUP.failed)
            case 'retry':
                return literal(TREE_SELECT_POPUP.retry)
            case 'note':
                return literal(TREE_SELECT_POPUP.note)
            default:
                return undefined
        }
    },
    effect: (state) => {
        const { plain, refused } = TREE_SELECTS()
        if (state === 'focus') return pieceWhere(treeTrigger(plain), ['focus-visible'])
        if (state === 'invalid+focus') return pieceWhere(treeTrigger(refused), ['aria-invalid', 'focus-visible'])
        return undefined
    },
    keys: {
        Tab: () => (focusable(treeTrigger(TREE_SELECTS().plain)) ? true : 'the trigger is out of the tab order'),
        'Enter, Space (the trigger has focus)': () =>
            treeTrigger(TREE_SELECTS().plain)?.tag === 'button' ? true : "the trigger is not Base UI's popover button",
        'ArrowDown, ArrowUp (a row has focus)': treeKey(
            /event\.key === 'ArrowDown'[\s\S]*event\.key === 'ArrowUp'/,
            'the tree does not move by ArrowDown and ArrowUp',
        ),
        'Home, End (a row has focus)': treeKey(
            /event\.key === 'Home'[\s\S]*event\.key === 'End'/,
            'the tree does not move by Home and End',
        ),
        'ArrowRight (a row has focus)': treeKey(
            /event\.key === 'ArrowRight' && branch && !expanded\) toggle/,
            'ArrowRight does not open a branch',
        ),
        'ArrowLeft (a row has focus)': treeKey(
            /event\.key === 'ArrowLeft' && branch && expanded && matches === null\) toggle/,
            'ArrowLeft does not close a branch',
        ),
        'Enter, Space (a row has focus)': () =>
            /event\.key === 'Enter' \|\| event\.key === ' '\) choose\(current\)/.test(TREE) &&
            /if \(!multiple\) \{\s*setOpen\(false\)/.test(TREE_SELECT)
                ? true
                : 'a row is not chosen by Enter or Space, or a single choice does not close the popup',
        'Escape (the popup is open)': () => focusBack(POPOVER),
    },
    more: () =>
        layoutChecks('tree-select', {
            popupMinWidth: () => numberIn(TREE_SELECT_POPUP.popup[2], /\bmin-w-(\d+)\b/, 'step'),
            popupOffset: () => numberIn(POPOVER, /sideOffset = (\d+),/),
            listMaxHeight: () => numberIn(TREE_SELECT_POPUP.list, /\bmax-h-(\d+)\b/, 'step'),
            indent: () => numberIn(TREE, /paddingLeft: `calc\(\$\{row\.level - 1\} \* (\d+)rem/, 'rem'),
            indentStart: () => numberIn(TREE, /paddingLeft: `calc\(\$\{row\.level - 1\} \* \d+rem \+ ([\d.]+)rem\)`/, 'rem'),
        }),
}

// Prompt

const PROMPT = source('components/PromptDialog.tsx')

/** The prompt is the dialog's frame with one field: its looks are parts/dialog's and the field's, so its words, width and keys are its own. */
const PROMPT_ADAPTER: Adapter = {
    wordObjects: { PROMPT_DIALOG_WORDS },
    complete: ['PROMPT_DIALOG_WORDS'],
    words: {
        submit: 'PROMPT_DIALOG_WORDS.submit',
        submitting: 'PROMPT_DIALOG_WORDS.submitting',
        cancel: 'PROMPT_DIALOG_WORDS.cancel',
        empty: 'PROMPT_DIALOG_WORDS.empty',
        failed: 'PROMPT_DIALOG_WORDS.failed',
    },
    options: {},
    size: () => undefined,
    paint: () => undefined,
    effect: () => undefined,
    keys: {
        'Enter (the field has focus, and Submit is not shut or busy)': () =>
            /event\.key !== 'Enter'/.test(PROMPT) && /if \(busy \|\| why !== undefined\) return/.test(PROMPT)
                ? true
                : 'Enter in the field does not submit, or submits while shut or busy',
        'Escape (not busy, or busy past busy-release)': () =>
            /<DialogShell/.test(PROMPT) && !/dismissible=\{false\}/.test(PROMPT) ? true : 'the prompt is not a dismissible DialogShell',
        Tab: () => (/<DialogShell/.test(PROMPT) ? true : 'the prompt is not drawn in DialogShell, which holds focus inside'),
    },
    more: () => {
        const wanted = SPECS.get('prompt')?.layout?.width
        const value = typeof wanted === 'object' && 'value' in wanted ? wanted.value : wanted
        const named = /width="(\w+)"/.exec(PROMPT)?.[1]
        return [check('layout.width', String(value), named === undefined ? undefined : widthFrom(DIALOG_WIDTHS[named]))]
    },
}

// Group label

const GROUP_LABEL = source('components/GroupLabel.tsx')

const GROUP_LABEL_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: { as: propValues(GROUP_LABEL, 'GroupLabelProps', 'as') },
    size: () => undefined,
    paint: () => pieceWhere(draw(GroupLabel, { children: 'Runs' })[0]),
    effect: () => skip('the group label states no effects'),
    keys: {},
}

// Unfoldable

const UNFOLDABLES = once(() => ({
    shut: draw(Unfoldable, {
        heading: 'Steps',
        aside: '3',
        summary: 'fetch, transform, upload',
        children: createElement('p', {}, 'fetch'),
    }),
    forced: draw(Unfoldable, {
        heading: 'Steps',
        forced: true,
        children: createElement('p', {}, 'fetch'),
    }),
}))
/** Each piece of an unfoldable, by its name in the spec. */
const unfoldablePieces = (state = 'rest'): Record<string, El | undefined> => {
    const { shut, forced } = UNFOLDABLES()
    const drawn = state === 'forced' ? forced : shut
    const row = shut.find((element) => element.tag === 'button')
    return {
        unfoldable: shut[0],
        row,
        chevron: drawn.find((element) => element.tag === 'svg'),
        aside: shut.find((element) => element.tag === 'div' && /\btext-xs\b/.test(classesOf(element)) && element.text === '3'),
        summary: shut.find((element) => element.attrs['data-slot'] === 'unfoldable-summary'),
    }
}
const UNFOLDABLE_ON: Record<string, string[]> = {
    hover: ['hover'],
    focus: ['focus-visible'],
}

const UNFOLDABLE_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {},
    size: (size) => pieceWhere(unfoldablePieces()[size]),
    paint: (_, name, state) => pieceWhere(unfoldablePieces(state)[name], UNFOLDABLE_ON[state] ?? []),
    effect: () => skip('the unfoldable states no effects'),
    keys: {
        'Tab (it unfolds and is not forced)': () => (focusable(unfoldablePieces().row) ? true : 'the row is out of the tab order'),
        'Enter, Space (the row has focus)': () => {
            const row = unfoldablePieces().row
            return row?.tag === 'button' && 'aria-expanded' in row.attrs ? true : 'the row is not a native button with aria-expanded'
        },
    },
    more: () =>
        layoutChecks('unfoldable', {
            indent: () => numberIn(classesOf(unfoldablePieces().summary), /\bpl-(\d+(?:\.\d+)?)\b/, 'step'),
        }),
}

// Choice list

const CHOICE_LIST = source('components/ChoiceList.tsx')
const CHOICES = once(() =>
    draw(ChoiceList, {
        options: [
            { value: 'paper', label: 'Paper', description: 'Light and warm' },
            { value: 'steel', label: 'Steel' },
        ],
        value: 'paper',
        onValueChange: () => undefined,
        label: 'Theme',
    }),
)
/** Each piece of a choice list, by its name in the spec: the chosen row's, or the other's. */
const choicePieces = (chosen: boolean): Record<string, El | undefined> => {
    const elements = CHOICES()
    const rows = elements.filter((element) => element.tag === 'label')
    const row = chosen ? rows[0] : rows[1]
    const inRow = (test: (element: El) => boolean) =>
        row === undefined ? undefined : elements.find((element) => within(element, row) && test(element))
    return {
        list: elements.find((element) => element.attrs.role === 'radiogroup'),
        row,
        radio: inRow((element) => element.attrs['data-slot'] === 'radio-group-item'),
        label: inRow((element) => element.tag === 'span' && /\bfont-medium\b/.test(classesOf(element))),
        description:
            rows[0] === undefined
                ? undefined
                : elements.find((element) => within(element, rows[0]) && /\btext-xs\b/.test(classesOf(element))),
    }
}

const CHOICE_LIST_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {},
    size: (size) => pieceWhere(choicePieces(true)[size]),
    paint: (_, name, state) => {
        const pieces = choicePieces(state === 'chosen')
        if (name === 'label') return inside(pieces.row, pieces.label)
        if (name === 'radio')
            return pieceWhere(pieces.radio, state === 'chosen' ? ['data-checked'] : state === 'focus' ? ['focus-visible'] : [])
        return pieceWhere(pieces[name], state === 'hover' ? ['hover'] : [])
    },
    effect: () => skip('the choice list states no effects'),
    keys: {
        // Base UI's roving focus makes the active radio the tab stop once hydrated; the server marks it.
        Tab: () =>
            'data-composite-item-active' in (choicePieces(true).radio?.attrs ?? {}) ? true : 'the chosen radio is not the tab stop',
        'ArrowDown, ArrowRight (a choice has focus)': () =>
            /<RadioGroup\b/.test(CHOICE_LIST) ? true : "the list is not Base UI's radio group, which moves and chooses by the arrows",
        'ArrowUp, ArrowLeft (a choice has focus)': () =>
            /<RadioGroup\b/.test(CHOICE_LIST) ? true : "the list is not Base UI's radio group, which moves and chooses by the arrows",
        'Space (a choice has focus)': () => (choicePieces(false).radio?.attrs.role === 'radio' ? true : "a choice is not Base UI's radio"),
    },
}

// Badge

const BADGE = source('components/ui/badge.tsx')
const KIND_SOURCE = source('lib/kind.ts')
const badgeWhere = (props: Partial<BadgeProps>, on: string[] = []) => pieceWhere(draw(Badge, { children: 'v2.4.1', ...props })[0], on)

const BADGE_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        variant: variantKeys(BADGE, 'variant'),
        kind: [...(/export type KindColor = ([^\n]+)/.exec(KIND_SOURCE)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]),
    },
    size: () => badgeWhere({}),
    paint: (_, name, state) => {
        const on = state === 'hover' ? ['hover'] : state === 'focus' ? ['focus-visible'] : []
        const kind = /^kind-(\w+)$/.exec(name)?.[1]
        return kind === undefined ? badgeWhere({ variant: name as never }, on) : badgeWhere({ kind: kind as never }, on)
    },
    effect: (state) => (state === 'focus' ? badgeWhere({}, ['focus-visible']) : undefined),
    keys: {
        Tab: () => (/useRender\(/.test(BADGE) ? true : 'a badge cannot be drawn as another element, such as a link'),
    },
}

// Stat

const STAT = source('components/Stat.tsx')
const STATS = once(() => {
    const common = {
        label: 'Runs today',
        value: '1,204',
        unit: 'runs',
        change: '+12%',
        note: 'vs last week',
    }
    return {
        plain: draw(Stat, common),
        good: draw(Stat, { ...common, good: true }),
        bad: draw(Stat, { ...common, good: false }),
        tile: draw(Stat, { ...common, variant: 'tile', onSelect: () => undefined }),
        lg: draw(Stat, { ...common, variant: 'tile', size: 'lg' }),
    }
})
/** Each piece of a stat, by its name in the spec. */
const statTilePieces = (elements: El[]): Record<string, El | undefined> => {
    const container = elements[0]
    const valueRow = elements.find((element) => element.tag === 'div' && /\bitems-baseline\b/.test(classesOf(element)))
    const children = elements.filter((element) => element.parent === container)
    return {
        container,
        tile: container,
        cover: elements.find((element) => element.tag === 'button'),
        label: children.find((element) => element.tag === 'span' && /\bitems-center\b/.test(classesOf(element))),
        value:
            valueRow === undefined
                ? undefined
                : elements.find((element) => element.parent === valueRow && /\btabular-nums\b/.test(classesOf(element))),
        valueRow,
        unit: valueRow === undefined ? undefined : elements.find((element) => element.parent === valueRow && element.text === 'runs'),
        change: elements.find((element) => element.tag === 'span' && /\bgap-0\.5\b/.test(classesOf(element))),
        note: children.filter((element) => element.tag === 'span').at(-1),
    }
}

const STAT_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        variant: propValues(STAT, 'StatProps', 'variant'),
        size: propValues(STAT, 'StatProps', 'size'),
    },
    size: (size) => {
        const { plain, tile, lg } = STATS()
        if (size === 'md') return pieceWhere(statTilePieces(tile).value)
        if (size === 'lg') return pieceWhere(statTilePieces(lg).value)
        if (size === 'tile') return pieceWhere(statTilePieces(tile).container)
        if (size === 'value') return pieceWhere(statTilePieces(plain).valueRow)
        return pieceWhere(statTilePieces(plain)[size])
    },
    paint: (group, name, state) => {
        const stats = STATS()
        const on = state === 'hover' ? ['hover'] : state === 'focus' ? ['focus-visible'] : []
        if (group === 'variants') return pieceWhere(statTilePieces(name === 'tile' ? stats.tile : stats.plain).container, on)
        const drawn = state === 'good' ? stats.good : state === 'bad' ? stats.bad : stats.plain
        return pieceWhere(statTilePieces(drawn)[name], on)
    },
    effect: () => skip('the stat states no effects'),
    keys: {
        Tab: () => (focusable(statTilePieces(STATS().tile).cover) ? true : 'the tile is out of the tab order'),
        'Enter (the tile has focus)': () =>
            statTilePieces(STATS().tile).cover?.tag === 'button' ? true : 'the tile is not a native button',
    },
}

// Description list

const DESCRIPTION_FACTS = [
    { term: 'Job', value: 'nightly-export' },
    { term: 'Owner', value: null },
]
const DESCRIPTION_LISTS = once(() => ({
    side: draw(DescriptionList, { items: DESCRIPTION_FACTS }),
    stacked: draw(DescriptionList, {
        items: DESCRIPTION_FACTS,
        layout: 'stacked',
        columns: 2,
    }),
    row: draw(DescriptionList, { items: DESCRIPTION_FACTS, layout: 'row' }),
}))

const DESCRIPTION_LIST_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        layout: propValues(DESCRIPTION_LIST, 'DescriptionListProps', 'layout'),
        size: propValues(DESCRIPTION_LIST, 'DescriptionListProps', 'size'),
    },
    size: (size) => {
        const drawn = DESCRIPTION_LISTS()[size as 'side' | 'stacked' | 'row'] as El[] | undefined
        return drawn === undefined ? undefined : pieceWhere(byTag(drawn, 'dl'))
    },
    paint: (_, name, state) => {
        const { side } = DESCRIPTION_LISTS()
        const values = side.filter((element) => element.tag === 'dd')
        if (name === 'term') return pieceWhere(byTag(side, 'dt'))
        return inside(byTag(side, 'dl'), state === 'missing' ? values[1] : values[0])
    },
    effect: () => skip('the description list states no effects'),
    keys: {},
    more: () =>
        layoutChecks('description-list', {
            rowGap: () => numberIn(classesOf(byTag(DESCRIPTION_LISTS().side, 'dl')), /\bgap-y-(\d+(?:\.\d+)?)\b/, 'step'),
            termWidth: () => numberIn(DESCRIPTION_LIST, /termWidth = '(\d+(?:\.\d+)?)rem'/, 'rem'),
            termMax: () => {
                const share = /(\d+)%/.exec(DESCRIPTION_LIST)?.[1]
                return share === undefined ? undefined : String(Number(share) / 100)
            },
        }),
}

// API link

const API_PATH = '/api/jobs/nightly-export'
const API_LINKS = once(() => ({
    plain: draw(ApiLink, { path: API_PATH }),
    linked: draw(ApiLink, {
        path: API_PATH,
        href: 'https://api.example.org/docs',
    }),
    write: draw(ApiLink, { method: 'POST', path: API_PATH }),
    delete: draw(ApiLink, { method: 'DELETE', path: API_PATH }),
    open: draw(ApiLink, { path: API_PATH, open: true }),
}))
const methodOf = (elements: El[]) => elements.find((element) => element.tag === 'span' && /\bfont-medium\b/.test(classesOf(element)))

const API_LINK_ADAPTER: Adapter = {
    wordObjects: { API_LINK_WORDS },
    complete: ['API_LINK_WORDS'],
    words: {
        copy: 'API_LINK_WORDS.copy',
        copied: 'API_LINK_WORDS.copied',
        opens: 'API_LINK_WORDS.opens',
    },
    options: {},
    size: () => pieceWhere(API_LINKS().plain[0]),
    paint: (group, name, state) => {
        const links = API_LINKS()
        const on = state === 'hover' ? ['hover'] : state === 'focus' ? ['focus-visible'] : []
        if (group === 'variants') return pieceWhere((name === 'open' ? links.open : links.plain)[0], on)
        if (name === 'method')
            return pieceWhere(methodOf(state === 'write' ? links.write : state === 'delete' ? links.delete : links.plain))
        if (name === 'arrow') return pieceWhere(links.open.find((element) => element.tag === 'svg'))
        if (state === 'rest') return pieceWhere(links.plain.find((element) => element.tag === 'span' && element.attrs.title === API_PATH))
        return pieceWhere(
            links.linked.find((element) => element.tag === 'a'),
            on,
        )
    },
    effect: () => skip('the API link states no effects'),
    keys: {
        Tab: () => {
            const { linked } = API_LINKS()
            const link = linked.find((element) => element.tag === 'a')
            const copy = linked.find((element) => element.tag === 'button')
            return focusable(link) && focusable(copy) ? true : 'the path or the copy button is out of the tab order'
        },
        'Enter (the path or the chip (open) has focus)': () =>
            API_LINKS().open[0]?.tag === 'a' &&
            API_LINKS().linked.some((element) => element.tag === 'a' && element.attrs.href !== undefined)
                ? true
                : 'the path or the open chip is not a link',
        'Enter, Space (the copy button has focus)': () =>
            API_LINKS().plain.some((element) => element.tag === 'button') ? true : 'the copy button is not a native button',
    },
    more: () =>
        layoutChecks('api-link', {
            chipStart: () => lengthOn(API_LINKS().plain[0], READ.padStart),
        }),
}

// Issue count

const ISSUE_MARK = source('components/IssueMark.tsx')
const ISSUE_ENTRY = {
    label: 'Job name',
    issue: {
        tone: 'critical' as const,
        text: 'A job named nightly-export already exists.',
    },
    onGo: noop,
}
const ISSUE_COUNTS = once(() => ({
    critical: draw(IssueCount, { critical: 2, warning: 1, list: [ISSUE_ENTRY] }),
    warning: draw(IssueCount, { critical: 0, warning: 1, list: [ISSUE_ENTRY] }),
}))
const ISSUE_COUNT_SOURCE = ISSUE_MARK.slice(ISSUE_MARK.indexOf('export function IssueCount'))
/** The list and its entries open only on a press, which no server drawing makes: their classes are read from the source. */
const ISSUE_LIST = literalAfter(ISSUE_COUNT_SOURCE, 'side="top" align="start"', 'className=')
const ISSUE_ENTRY_CLASSES = literalAfter(ISSUE_COUNT_SOURCE, 'entry.onGo()', 'className=')
const issueCountPieces = (elements: El[]): Record<string, El | undefined> => ({
    face: elements.find((element) => element.tag === 'button'),
    figure: elements.find((element) => element.tag === 'span' && /\bpx-2\b/.test(classesOf(element))),
})
const ISSUE_COUNT_ON: Record<string, string> = {
    hover: 'hover',
    open: 'data-popup-open',
    focus: 'focus-visible',
}

const ISSUE_COUNT_ADAPTER: Adapter = {
    wordObjects: { ISSUE_COUNT_WORDS },
    complete: ['ISSUE_COUNT_WORDS'],
    words: {
        errors: ['ISSUE_COUNT_WORDS.errors', (said: (count: number) => string, fill) => said(Number(fill.count))],
        warnings: ['ISSUE_COUNT_WORDS.warnings', (said: (count: number) => string, fill) => said(Number(fill.count))],
    },
    options: {},
    size: (size) => {
        if (size === 'list') return { layers: [ISSUE_LIST], on: [] }
        if (size === 'entry') return { layers: [ISSUE_ENTRY_CLASSES], on: [] }
        return pieceWhere(issueCountPieces(ISSUE_COUNTS().critical)[size])
    },
    paint: (_, name, state) => {
        const states = state.split('+')
        const on = states.flatMap((one) => (ISSUE_COUNT_ON[one] === undefined ? [] : [ISSUE_COUNT_ON[one]]))
        if (name === 'entry') return { layers: [ISSUE_ENTRY_CLASSES], on }
        const counts = ISSUE_COUNTS()
        return pieceWhere(issueCountPieces(states.includes('warning') ? counts.warning : counts.critical)[name], on)
    },
    effect: () => skip('the issue count states no effects'),
    keys: {
        Tab: () => (focusable(issueCountPieces(ISSUE_COUNTS().critical).face) ? true : 'the face is out of the tab order'),
        'Enter, Space (the face has focus)': () =>
            issueCountPieces(ISSUE_COUNTS().critical).face?.tag === 'button' ? true : 'the face is not a native button',
        'Enter, Space (an entry has focus)': () =>
            /<button\s+key=\{index\}\s+type="button"/.test(ISSUE_COUNT_SOURCE) ? true : 'an entry is not a native button',
        'Escape (the list is open)': () => (/<Popover\b/.test(ISSUE_COUNT_SOURCE) ? true : "the list is not Base UI's popover"),
    },
}

// Server menu

const SERVER_MENU = source('components/ServerMenu.tsx')
const SERVER_MENUS = once(() => draw(ServerMenu, { name: 'api', version: 'v2.4.1', state: 'up' }))
/** Each piece of a server menu, by its name in the spec; the menu opens only on a press, so its classes are read from the source. */
const serverMenuWhere = (name: string, on: string[] = []): Where | undefined => {
    const elements = SERVER_MENUS()
    const face = elements.find((element) => element.tag === 'button')
    switch (name) {
        case 'face':
            return pieceWhere(face, on)
        case 'chevron':
            return pieceWhere(elements.filter((element) => element.tag === 'svg').at(-1), on)
        case 'version':
            return pieceWhere(
                elements.find((element) => element.attrs['data-slot'] === 'badge'),
                on,
            )
        case 'menu':
            return {
                layers: [literalAfter(SERVER_MENU, '<DropdownMenuContent align="end" className=')],
                on,
            }
        case 'info':
            return {
                layers: [literalAfter(SERVER_MENU, '</DropdownMenuGroup>', '<div className=')],
                on,
            }
        default:
            return undefined
    }
}

const SERVER_MENU_ADAPTER: Adapter = {
    wordObjects: { SERVER_MENU_WORDS },
    complete: ['SERVER_MENU_WORDS'],
    words: {
        up: 'SERVER_MENU_WORDS.up',
        down: 'SERVER_MENU_WORDS.down',
        checking: 'SERVER_MENU_WORDS.checking',
        check: 'SERVER_MENU_WORDS.check',
        label: 'SERVER_MENU_WORDS.label',
        checkedAt: ['SERVER_MENU_WORDS.checkedAt', (said: (ago: string) => string, fill) => said(String(fill.ago))],
    },
    options: {
        state: [...(/export type ServerState = ([^\n]+)/.exec(SERVER_MENU)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]),
    },
    size: (size) => serverMenuWhere(size),
    paint: (_, name) => serverMenuWhere(name),
    effect: () => skip('the server menu states no effects'),
    keys: {
        Tab: () => (focusable(SERVER_MENUS().find((element) => element.tag === 'button')) ? true : 'the face is out of the tab order'),
        'Enter, Space, ArrowDown (the face has focus)': () =>
            /<DropdownMenuTrigger render=\{button\}/.test(SERVER_MENU) ? true : "the face does not open parts/dropdown-menu's menu",
        'Escape (the menu is open)': () => (/<DropdownMenu\b/.test(SERVER_MENU) ? true : "the menu is not parts/dropdown-menu's"),
    },
}

// Item card

const ITEM_CARD = source('components/ItemCard.tsx')
const ITEM_CARDS = once(() => ({
    full: draw(ItemCard, {
        title: 'Harbor',
        code: 'harbor',
        icon: createElement(Folder),
        status: 'running',
        description: 'Nightly exports to the archive.',
        facts: [{ label: 'Jobs', value: 12 }],
        menu: createElement('div', {}, 'Rename'),
        onSelect: noop,
        selected: true,
    }),
    plain: draw(ItemCard, { title: 'Harbor', onSelect: noop }),
}))
/** Each piece of an item card, by its name in the spec. */
const itemCardPieces = (elements: El[]): Record<string, El | undefined> => {
    const slot = (name: string) => elements.find((element) => element.attrs['data-slot'] === `item-card-${name}`)
    return {
        card: elements.find((element) => element.attrs['data-slot'] === 'item-card'),
        cover: slot('cover'),
        body: slot('body'),
        head: slot('head'),
        icon: slot('icon'),
        check: slot('check'),
        menu: slot('menu'),
        status: slot('status'),
        description: slot('description'),
        facts: slot('facts'),
    }
}

const ITEM_CARD_ADAPTER: Adapter = {
    wordObjects: { ITEM_CARD_WORDS },
    complete: ['ITEM_CARD_WORDS'],
    words: { menu: 'ITEM_CARD_WORDS.menu' },
    options: {},
    size: (size) => pieceWhere(itemCardPieces(ITEM_CARDS().full)[size]),
    paint: (_, name, state) => {
        const cards = ITEM_CARDS()
        const on = state === 'hover' ? ['hover'] : state === 'focus' ? ['focus-visible'] : []
        if (name === 'card') {
            if (state === 'selected') return pieceWhere(itemCardPieces(cards.full).card)
            if (state === 'focus') return pieceWhere(itemCardPieces(cards.plain).cover, on)
            return pieceWhere(itemCardPieces(cards.plain).card, on)
        }
        return pieceWhere(itemCardPieces(cards.full)[name], on)
    },
    effect: () => skip('the item card states no effects'),
    keys: {
        Tab: () => {
            const { cover, menu } = itemCardPieces(ITEM_CARDS().full)
            return focusable(cover) && focusable(menu) ? true : 'the card or its menu is out of the tab order'
        },
        'Enter (the card has focus)': () =>
            itemCardPieces(ITEM_CARDS().plain).cover?.tag === 'button' ? true : 'the card is not a native button',
        'Enter, Space, ArrowDown (the menu button has focus)': () =>
            /<DropdownMenuTrigger\b/.test(ITEM_CARD) ? true : "the menu is not parts/dropdown-menu's",
    },
    more: () =>
        layoutChecks('item-card', {
            factMin: () => numberIn(ITEM_CARD, /minmax\((\d+(?:\.\d+)?)rem,1fr\)/, 'rem'),
        }),
}

// Sortable grid

const SORTABLE_GRIDS = once(() =>
    draw(SortableGrid<string>, {
        items: ['harbor', 'juniper', 'larkspur'],
        itemKey: (item) => item,
        itemLabel: (item) => item,
        renderItem: (item) => createElement('div', {}, item),
        onMove: noop,
    }),
)

const SORTABLE_GRID_ADAPTER: Adapter = {
    wordObjects: { SORTABLE_WORDS },
    complete: ['SORTABLE_WORDS'],
    words: {
        move: ['SORTABLE_WORDS.move', (said: (item: string) => string, fill) => said(String(fill.item))],
        moved: [
            'SORTABLE_WORDS.moved',
            (said: (item: string, place: number, count: number) => string, fill) =>
                said(String(fill.item), Number(fill.place), Number(fill.count)),
        ],
    },
    options: { handle: propValues(SORTABLE, 'SortableGridProps', 'handle') },
    size: (size) => (size === 'grid' ? pieceWhere(byTag(SORTABLE_GRIDS(), 'ul')) : undefined),
    paint: (_, name, state) =>
        name === 'item' ? pieceWhere(byTag(SORTABLE_GRIDS(), 'li'), state === 'focus' ? ['focus-visible'] : []) : undefined,
    effect: (state) => (state === 'dragging' ? { layers: [literalAfter(SORTABLE, 'sortable.isDragging &&')], on: [] } : undefined),
    keys: {
        Tab: () => (focusable(byTag(SORTABLE_GRIDS(), 'li')) ? true : 'a card is out of the tab order'),
        'ArrowUp, ArrowLeft (a card has focus)': () =>
            sortableStep('ArrowUp', 'grid') === -1 && sortableStep('ArrowLeft', 'grid') === -1
                ? true
                : 'the arrows back do not move a card',
        'ArrowDown, ArrowRight (a card has focus)': () =>
            sortableStep('ArrowDown', 'grid') === 1 && sortableStep('ArrowRight', 'grid') === 1 ? true : 'the arrows on do not move a card',
        'Space, Enter (a card has focus)': () =>
            /KeyboardSensor/.test(DRAG_DROP) ? true : "the drag engine's keyboard sensor is not used",
        'Escape (a card is being moved)': () => (/KeyboardSensor/.test(DRAG_DROP) ? true : "the drag engine's keyboard sensor is not used"),
    },
    more: () =>
        layoutChecks('sortable-grid', {
            minItemWidth: () => numberIn(SORTABLE, /minItemWidth = '(\d+(?:\.\d+)?)rem'/, 'rem'),
        }),
}

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

// Markdown view

const MARKDOWN_VIEW = source('components/markdown-view.tsx')
/** A text with every piece the spec paints: a quote, a rule, a table, code, a link, a tag, highlights, embeds and the five callouts. */
const MARKDOWN_TEXT = [
    '# One',
    '## Two',
    '### Three',
    '#### Four',
    '',
    'Words with `code`, a [link](https://example.org), ==marked== words, #harbor and ![[Nightly export]].',
    '',
    '![[Retry a run]]',
    '',
    '> A quote.',
    '',
    '---',
    '',
    '| Job | State |',
    '| --- | --- |',
    '| nightly-export | failed |',
    '',
    ...(['note', 'tip', 'important', 'warning', 'caution'] as const).flatMap((kind) => [`> [!${kind}]`, `> The ${kind}.`, '']),
    '> [!tip]- Folded',
    '> Out of sight.',
].join('\n')
const markdownView = once(() => ({
    message: draw(PlainMarkdown, {
        content: MARKDOWN_TEXT,
        highlight: 'words',
        links: { onOpen: () => undefined, onTag: () => undefined, embed: (target) => (target === 'Retry a run' ? 'drawn' : null) },
    }),
    document: draw(PlainMarkdown, { content: MARKDOWN_TEXT, scale: 'document' }),
}))
/** The root's own classes read through one of its descendant selectors, such as `[&_blockquote]`. */
const markdownThrough = (scale: 'message' | 'document', selector: string): Where | undefined => {
    const root = markdownView()[scale][0]
    return root === undefined ? undefined : { layers: [classesOf(root)], on: [selector], around: [] }
}
const MARKDOWN_PIECES: Record<string, () => Where | undefined> = {
    body: () => pieceWhere(markdownView().message[0]),
    quote: () => markdownThrough('message', '[&_blockquote]'),
    rule: () => markdownThrough('message', '[&_hr]'),
    tableCell: () => markdownThrough('message', '[&_td]'),
    tableHead: () => markdownThrough('message', '[&_th]'),
    inlineCode: () => markdownThrough('message', '[&_:not(pre)>code]'),
    link: () => markdownThrough('message', '[&_a]'),
    mark: () => markdownThrough('message', '[&_mark[data-marked]]'),
    tag: () => pieceWhere(markdownView().message.find((element) => element.attrs['data-tag'] !== undefined)),
    searchMark: () =>
        pieceWhere(markdownView().message.find((element) => element.tag === 'mark' && element.attrs['data-marked'] === undefined)),
    embedFrame: () => pieceWhere(markdownView().message.find((element) => element.attrs['data-embed'] === 'Nightly export')),
    embedRule: () => pieceWhere(markdownView().message.find((element) => element.attrs['data-embed'] === 'Retry a run')),
    ...Object.fromEntries(
        (['message', 'document'] as const).flatMap((scale) =>
            [1, 2, 3, 4].map((level) => [`${scale}Heading${String(level)}`, () => markdownThrough(scale, `[&_h${String(level)}]`)]),
        ),
    ),
}
/** A callout's box and its title, by kind. */
const calloutWhere = (kind: string): Where | undefined => {
    const elements = markdownView().message
    const frame = elements.find((element) => element.tag === 'div' && element.attrs['data-callout'] === kind)
    const title = frame === undefined ? undefined : elements.find((element) => element.tag === 'p' && element.parent?.parent === frame)
    return inside(frame, title)
}

const MARKDOWN_VIEW_ADAPTER: Adapter = {
    wordObjects: { MARKDOWN_WORDS },
    complete: [],
    words: {
        note: 'MARKDOWN_WORDS.note',
        tip: 'MARKDOWN_WORDS.tip',
        important: 'MARKDOWN_WORDS.important',
        warning: 'MARKDOWN_WORDS.warning',
        caution: 'MARKDOWN_WORDS.caution',
    },
    options: {
        scale: propValues(MARKDOWN_VIEW, 'MarkdownProps', 'scale'),
        inlineCode: [...(/export type MarkdownInlineCode = ([^\n]+)/.exec(MARKDOWN_VIEW)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
            (match) => match[1],
        ),
        frontmatter: [...(/export type MarkdownFrontmatter = ([^\n]+)/.exec(MARKDOWN_VIEW)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
            (match) => match[1],
        ),
    },
    size: () => skip('the markdown view has no sizes'),
    paint: (group, name, state) => {
        if (state !== 'rest') return skip(`no state of its own on ${name}`)
        if (group === 'variants') return calloutWhere(name)
        return MARKDOWN_PIECES[name]?.()
    },
    effect: () => skip('the markdown view states no effects'),
    keys: {
        Tab: () => (focusable(markdownView().message.find((element) => element.tag === 'a')) ? true : 'no link takes focus'),
        Enter: () =>
            markdownView().message.some((element) => element.tag === 'a' && element.attrs.href !== undefined)
                ? true
                : 'no link has an address',
        "Enter, Space (a folding callout's title has focus)": () =>
            markdownView().message.some((element) => element.tag === 'summary') ? true : 'a folding callout has no summary',
    },
    more: () => {
        const root = classesOf(markdownView().message[0])
        const frame = classesOf(markdownView().message.find((element) => element.tag === 'div' && element.attrs['data-callout'] === 'note'))
        return layoutChecks('markdown-view', {
            blockGap: () => numberIn(root, /\[&_p\]:my-(\d+(?:\.\d+)?)/, 'step'),
            listInset: () => numberIn(root, /\[&_ul\]:pl-(\d+(?:\.\d+)?)/, 'step'),
            quoteInset: () => numberIn(root, /\[&_blockquote\]:pl-(\d+(?:\.\d+)?)/, 'step'),
            cellPadX: () => numberIn(root, /\[&_td\]:px-(\d+(?:\.\d+)?)/, 'step'),
            cellPadY: () => numberIn(root, /\[&_td\]:py-(\d+(?:\.\d+)?)/, 'step'),
            calloutPadX: () => numberIn(frame, /(?:^|\s)px-(\d+(?:\.\d+)?)/, 'step'),
            calloutPadY: () => numberIn(frame, /(?:^|\s)py-(\d+(?:\.\d+)?)/, 'step'),
            calloutGap: () => numberIn(frame, /(?:^|\s)gap-(\d+(?:\.\d+)?)/, 'step'),
        })
    },
}

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
    'run-timeline': RUN_TIMELINE_ADAPTER,
    'clip-timeline': CLIP_TIMELINE_ADAPTER,
    'emoji-picker': EMOJI_PICKER_ADAPTER,
    'reaction-bar': REACTION_BAR_ADAPTER,
    composer: COMPOSER_ADAPTER,
    'message-composer': MESSAGE_COMPOSER_ADAPTER,
    'call-bar': CALL_BAR_ADAPTER,
    letter: LETTER_ADAPTER,
    'detail-pane': DETAIL_PANE_ADAPTER,
    'board-item-panel': BOARD_ITEM_PANEL_ADAPTER,
    chart: CHART_ADAPTER,
    'dashboard-panel': DASHBOARD_PANEL_ADAPTER,
    'stat-panel': STAT_PANEL_ADAPTER,
    'time-series-panel': TIME_SERIES_PANEL_ADAPTER,
    'code-editor': CODE_EDITOR_ADAPTER,
    'date-field': DATE_FIELD_ADAPTER,
    banner: BANNER_ADAPTER,
    problem: PROBLEM_ADAPTER,
    'side-panel': SIDE_PANEL_ADAPTER,
    'json-tree': JSON_TREE_ADAPTER,
    'secret-field': SECRET_FIELD_ADAPTER,
    'yes-no-field': YES_NO_FIELD_ADAPTER,
    'time-field': TIME_FIELD_ADAPTER,
    'computed-field': COMPUTED_FIELD_ADAPTER,
    'repeated-group': REPEATED_GROUP_ADAPTER,
    'period-picker': PERIOD_PICKER_ADAPTER,
    'tree-select': TREE_SELECT_ADAPTER,
    prompt: PROMPT_ADAPTER,
    'group-label': GROUP_LABEL_ADAPTER,
    unfoldable: UNFOLDABLE_ADAPTER,
    'choice-list': CHOICE_LIST_ADAPTER,
    badge: BADGE_ADAPTER,
    stat: STAT_ADAPTER,
    'description-list': DESCRIPTION_LIST_ADAPTER,
    'api-link': API_LINK_ADAPTER,
    'issue-count': ISSUE_COUNT_ADAPTER,
    'server-menu': SERVER_MENU_ADAPTER,
    'item-card': ITEM_CARD_ADAPTER,
    'sortable-grid': SORTABLE_GRID_ADAPTER,
    'markdown-view': MARKDOWN_VIEW_ADAPTER,
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
            else if (key === 'width') found = resolve(where.layers, where.on, READ.width) ?? resolve(where.layers, where.on, READ.minWidth)
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

// Message ids: each word's id and its English in the catalogs every package writes (`bun run messages`)

const CATALOG: Record<string, string> = Object.assign(
    {},
    ...readdirSync(join(ROOT, 'packages')).flatMap((pkg) => {
        try {
            return [JSON.parse(readFileSync(join(ROOT, 'packages', pkg, 'messages', 'en.json'), 'utf8')) as Record<string, string>]
        } catch {
            return []
        }
    }),
) as Record<string, string>

function messageChecks(spec: Spec): Check[] {
    const checks: Check[] = []
    for (const [key, message] of Object.entries(spec.messages ?? {})) {
        if (message === null) continue
        const held = CATALOG[message.id]
        checks.push(check(`messages.${key}`, `${message.id}: ${message.en}`, held === undefined ? 'no such id' : `${message.id}: ${held}`))
        if (held === undefined) continue
        const word = spec.words[key]
        const say = (values: Record<string, unknown>) => {
            try {
                return formatMessage(held, { ...message.with, ...values })
            } catch (error) {
                return `a message that cannot be read: ${(error as Error).message}`
            }
        }
        // A plain word whose braces the part fills itself is the message as it reads.
        if (typeof word === 'string' && say({}) === word) continue
        const samples = spec.samples?.[key]
        if (samples !== undefined) {
            for (const sample of samples)
                checks.push(check(`messages.${key} with ${JSON.stringify(sample.with)}`, sample.says, say(sample.with)))
        } else if (typeof word === 'string') checks.push(check(`messages.${key} says`, word, say({})))
        else {
            checks.push(check(`messages.${key} says one`, filled(word.one, { count: 1 }), say({ count: 1 })))
            checks.push(check(`messages.${key} says other`, filled(word.other, { count: 5 }), say({ count: 5 })))
        }
    }
    for (const key of Object.keys(spec.words)) {
        if (spec.messages !== undefined && !(key in spec.messages)) checks.push(check(`messages.${key}`, 'its message id', 'no entry'))
    }
    return checks
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
        ...messageChecks(spec),
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
        it("keys its words by the catalogs' message ids", () => holds(id, 'messages.'))
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
