// @vitest-environment happy-dom
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CalendarClock, Folder, Play, Server, Workflow } from 'lucide-react'
import { act, createElement, Fragment, useState, type ComponentType, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { API_LINK_WORDS, ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { ChoiceList } from '@winterop-com/sokkel-ui/ChoiceList'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { ITEM_CARD_WORDS, ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Badge, type BadgeProps } from '@winterop-com/sokkel-ui/primitives/badge'
import { CHIP_WORDS, Chip, type ChipProps } from '@winterop-com/sokkel-ui/Chip'
import { SERVER_MENU_WORDS, ServerMenu } from '@winterop-com/sokkel-ui/ServerMenu'
import { SORTABLE_WORDS, SortableGrid, sortableStep } from '@winterop-com/sokkel-ui/Sortable'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { Unfoldable } from '@winterop-com/sokkel-ui/Unfoldable'
import { BOARD_CHECKLIST_WORDS, BOARD_ITEM_PANEL_WORDS, BoardChecklist, BoardItemPanel } from '@winterop-com/sokkel-ui/board/BoardItemPanel'
import { Banner, BANNER_WORDS, type BannerTone } from '@winterop-com/sokkel-ui/Banner'
import { CALL_BAR_SHORTCUTS, CALL_BAR_WORDS, CallBar, type CallBarProps } from '@winterop-com/sokkel-ui/CallBar'
import { CALL_TILE_WORDS, CallTile } from '@winterop-com/sokkel-ui/CallTile'
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
    type ComposerMentions,
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
import { CodeEditor, SCHEMA_WORDS, sayIssue, type CodeEditorProps } from '@winterop-com/sokkel-ui/CodeEditor'
import { COMPUTED_FIELD_WORDS, ComputedField, type ComputedFieldProps } from '@winterop-com/sokkel-ui/ComputedField'
import { DATE_FIELD_WORDS, DateField } from '@winterop-com/sokkel-ui/DateField'
import { DetailPane } from '@winterop-com/sokkel-ui/DetailPane'
import { DIALOG_SHELL_WORDS, DialogShell, type DialogShellProps } from '@winterop-com/sokkel-ui/DialogShell'
import { EMOJI_PICKER_WORDS, EmojiPicker, type EmojiPickerProps } from '@winterop-com/sokkel-ui/EmojiPicker'
import { Field, FIELD_WORDS } from '@winterop-com/sokkel-ui/Field'
import { useOverlayRoute } from '@winterop-com/sokkel-ui/hooks/use-overlay-route'
import { usePaletteShortcut } from '@winterop-com/sokkel-ui/hooks/use-palette-shortcut'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { ISSUE_COUNT_WORDS, ISSUE_WORDS, IssueCount } from '@winterop-com/sokkel-ui/IssueMark'
import { JSON_TREE_WORDS, JsonTree } from '@winterop-com/sokkel-ui/JsonTree'
import { Letter, LETTER_WORDS } from '@winterop-com/sokkel-ui/Letter'
import { MESSAGE_COMPOSER_WORDS, MessageComposer, type MessageComposerProps } from '@winterop-com/sokkel-ui/MessageComposer'
import { PageHeader, PAGE_HEADER_WORDS, type PageHeaderProps } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState, PAGE_STATE_WORDS, type PageStateProps } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DialogFooter, DialogHeader } from '@winterop-com/sokkel-ui/primitives/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    standInOpens,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
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
import { RailDrops } from '@winterop-com/sokkel-ui/RailDrops'
import { ResizeHandle, type ResizeHandleProps } from '@winterop-com/sokkel-ui/ResizeHandle'
import {
    RUN_TIMELINE_WORDS,
    RunTimeline,
    timelineTicks,
    type RunTimelineLane,
    type RunTimelineProps,
} from '@winterop-com/sokkel-ui/RunTimeline'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { SECRET_FIELD_WORDS, SecretField, type SecretFieldProps } from '@winterop-com/sokkel-ui/SecretField'
import { Section, type SectionProps } from '@winterop-com/sokkel-ui/Section'
import { SelectField, type SelectFieldProps } from '@winterop-com/sokkel-ui/SelectField'
import { Problem, PROBLEM_WORDS } from '@winterop-com/sokkel-ui/Problem'
import { FRESHNESS_WORDS, Freshness, freshnessTick, type FreshnessProps } from '@winterop-com/sokkel-ui/Freshness'
import { PLAYBACK_TIMELINE_WORDS, PlaybackTimeline, scrubTime, type PlaybackTimelineProps } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { TASK_CARD_WORDS, TASK_STATES, TaskCard, taskStatuses, type TaskCardProps } from '@winterop-com/sokkel-ui/TaskCard'
import { TRACK_CARD_WORDS, TrackCard, type TrackCardProps } from '@winterop-com/sokkel-ui/TrackCard'
import { DETECTION_OVERLAY_WORDS, DetectionOverlay, type DetectionOverlayProps } from '@winterop-com/sokkel-ui/DetectionOverlay'
import { VIDEO_FOLLOW_WORDS, VideoFollow, type VideoFollowProps } from '@winterop-com/sokkel-ui/VideoFollow'
import { CAMERA_WALL_WORDS, CameraWall, type CameraWallProps } from '@winterop-com/sokkel-ui/CameraWall'
import { DETECTION_TIMELINE_WORDS, DetectionTimeline, type DetectionTimelineProps } from '@winterop-com/sokkel-ui/DetectionTimeline'
import { DETECTION_GALLERY_WORDS, DetectionGallery, type DetectionGalleryProps } from '@winterop-com/sokkel-ui/DetectionGallery'
import { PICTURE_ZONES_WORDS, PictureZones, type PictureZone, type PictureZonesProps } from '@winterop-com/sokkel-ui/PictureZones'
import { CAMERA_CONTROL_WORDS, CameraControl, type CameraControlProps, type CameraMove } from '@winterop-com/sokkel-ui/CameraControl'
import { COLOR_FIELD_WORDS, COLOR_PICKER_WORDS, ColorField, ColorPicker } from '@winterop-com/sokkel-ui/ColorField'
import { TAGS_FIELD_WORDS, TagsField, type TagsFieldProps } from '@winterop-com/sokkel-ui/TagsField'
import {
    STATUS_WALL_WORDS,
    StatusTile,
    StatusWall,
    WALL_STATUSES,
    wallSeriesPath,
    type StatusTileProps,
    type StatusWallProps,
    type WallStatus,
} from '@winterop-com/sokkel-ui/StatusWall'
import { ALERT_TICKER_WORDS, AlertTicker, type AlertTickerItem, type AlertTickerProps } from '@winterop-com/sokkel-ui/AlertTicker'
import { Kiosk, type KioskProps } from '@winterop-com/sokkel-ui/Kiosk'
import { TrackGlyph, type TrackGlyphProps } from '@winterop-com/sokkel-ui/TrackGlyph'
import { TRACK_ROSTER_WORDS, TrackRoster, type TrackRosterItem, type TrackRosterProps } from '@winterop-com/sokkel-ui/TrackRoster'
import { TRACK_NAMES_WORDS } from '@winterop-com/sokkel-ui/lib/tracks'
import { MARKDOWN_WORDS, PlainMarkdown } from '@winterop-com/sokkel-ui/PlainMarkdown'
import { PERIOD_PICKER_WORDS, PeriodPicker, type PeriodPickerProps } from '@winterop-com/sokkel-ui/PeriodPicker'
import { ProblemLine } from '@winterop-com/sokkel-ui/ProseText'
import { PROMPT_DIALOG_WORDS, PromptDialog, type PromptDialogProps } from '@winterop-com/sokkel-ui/PromptDialog'
import { REPEATED_GROUP_WORDS, RepeatedGroup, type RepeatedGroupProps } from '@winterop-com/sokkel-ui/RepeatedGroup'
import { SettingRow } from '@winterop-com/sokkel-ui/SettingRow'
import { SETTINGS_DIALOG_WORDS, SettingsDialog } from '@winterop-com/sokkel-ui/SettingsDialog'
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
import type { FeatureCollection } from 'geojson'
import { CoverageLayer, SWEEP } from '@winterop-com/sokkel-ui-maps/CoverageLayer'
import { UNIT_SYMBOLS } from '@winterop-com/sokkel-ui-maps/geodesy'
import { LINK_WORDS, LinkLayer, type LinkLayerProps, type MapLink } from '@winterop-com/sokkel-ui-maps/LinkLayer'
import { ZoneLayer, type Zone, type ZoneLayerProps } from '@winterop-com/sokkel-ui-maps/ZoneLayer'
import type { LngLat } from '@winterop-com/sokkel-ui-maps/geometry'
import { MAP_COMPASS_WORDS, MapCompass } from '@winterop-com/sokkel-ui-maps/MapCompass'
import { MAP_COORDINATES_WORDS, MapCoordinates, scaleBar } from '@winterop-com/sokkel-ui-maps/MapCoordinates'
import { MAP_FOLLOW_WORDS, MapFollow } from '@winterop-com/sokkel-ui-maps/MapFollow'
import { MAP_GO_TO_WORDS, MapGoTo } from '@winterop-com/sokkel-ui-maps/MapGoTo'
import { MAP_RULER_WORDS, MapRuler } from '@winterop-com/sokkel-ui-maps/MapRuler'
import { TRACK_WORDS, TrackLayer, type Track, type TrackLayerProps } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import { MapContext, type MapContextValue } from '../packages/maps/src/context'
import { labelRegistry } from '../packages/maps/src/layer'

// A part's checks are made once, live probes and all, inside its first test; on a busy machine that
// takes longer than the 5 seconds a test gets by default.
vi.setConfig({ testTimeout: 60_000 })

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
 *   keys      each binding does what it says when its key is pressed on the part drawn in a page (happy-dom),
 *             or, where a press cannot reach it, is handled where the source shows it
 *   layout    each length a part's layout gives that its classes or its source show
 *
 * Where the code and the spec differ, the spec's `drift` entries for sokkel-ui say so on purpose:
 * `DRIFT` names the checks each entry covers, and a covered check that no longer differs fails, so
 * fixed drift leaves the spec. `PENDING` holds differences where the spec is to change, until the
 * pin moves past the change. Anything else that differs fails. What cannot be read without a
 * browser is said beside each part, with the reason, rather than passed in silence.
 */

// The palette's dialog opens in a portal, which a server drawing leaves out: there its box is drawn in place, with the
// classes the palette gives it. Drawn in the page, it is the dialog itself.
vi.mock('@winterop-com/sokkel-ui/primitives/command', async (original) => {
    const module = await original<typeof import('@winterop-com/sokkel-ui/primitives/command')>()
    const react = await import('react')
    const never = () => () => undefined
    return {
        ...module,
        CommandDialog: (props: Parameters<typeof module.CommandDialog>[0]) =>
            react.useSyncExternalStore(
                never,
                () => true,
                () => false,
            )
                ? react.createElement(module.CommandDialog, props)
                : react.createElement('div', { 'data-slot': 'dialog-content', className: props.className }, props.children),
    }
})

// Base UI's menu, which a menu drawn in the page fetches after its first paint, never arrives here: once it has, an open
// menu's parts would draw in the server drawings below with no root around them. Menus in the page stay stand-ins.
vi.mock('../packages/core/src/components/ui/menu-engine', () => ({ Menu: undefined }))

// No canvas paints in happy-dom, so the maps' colors cannot be resolved to rgb: each style layer keeps the CSS color it is given,
// which names its tokens.
vi.mock('../packages/maps/src/color', () => ({
    resolveColors: <K extends string>(_scope: HTMLElement, colors: Record<K, string>) => ({ ...colors }),
}))

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
    /** `preview` while a new part's looks may still move: its sizes, paints and layout are not checked. */
    status?: 'preview' | 'stable'
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
/** The styles without the text size levels, which move the steps from the md breakpoint up: a spec gives the regular sizes. */
const REGULAR_TEXT = STYLES.replace(/^@media \(min-width: [^)]+\) \{\n {4}(?::root|html\[data-text-size=)[\s\S]*?\n\}\n/gm, '')
/** Each text size and role: its size, line height and weight as tokens.css writes them. */
const TEXT = new Map<string, { size: string; leading?: string; weight?: string; tracking?: string }>()
for (const match of REGULAR_TEXT.matchAll(/--text-([a-z0-9]+(?:-[a-z0-9]+)*)(--line-height|--font-weight|--letter-spacing)?: ([^;]+);/g)) {
    const [, name, part, value] = match
    const entry = TEXT.get(name) ?? { size: '' }
    if (part === undefined) entry.size = value
    else if (part === '--line-height') entry.leading = value
    else if (part === '--font-weight') entry.weight = value
    else entry.tracking = value
    TEXT.set(name, entry)
}
/** The weight each `font-*` class sets: normal is Tailwind's 400, the rest the weight tokens tokens.css writes. */
const WEIGHTS: Record<string, number> = {
    'font-normal': 400,
    ...Object.fromEntries([...STYLES.matchAll(/--font-weight-([a-z]+): (\d+);/g)].map((match) => [`font-${match[1]}`, Number(match[2])])),
}
/** The `font-*` class a style's weight is: a number, or a weight token (`var(--font-weight-semibold)`). */
const weightClass = (value: string) => {
    const token = /^var\(--font-weight-([a-z]+)\)$/.exec(value)?.[1]
    return token === undefined ? (Object.entries(WEIGHTS).find(([, weight]) => String(weight) === value)?.[0] ?? '') : `font-${token}`
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

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** Draws an element in the page (happy-dom), hands its box to `look`, and takes it down after. */
function live<T>(element: ReactElement, look: (box: HTMLElement) => T): T {
    const box = document.createElement('div')
    document.body.append(box)
    const root = createRoot(box)
    try {
        act(() => root.render(element))
        return look(box)
    } finally {
        act(() => root.unmount())
        box.remove()
    }
}

/** Draws an element in the page as `live` does, for a look that waits on the page. */
async function liveWaiting<T>(element: ReactElement, look: (box: HTMLElement) => Promise<T>): Promise<T> {
    const box = document.createElement('div')
    document.body.append(box)
    const root = createRoot(box)
    try {
        await act(async () => root.render(element))
        return await look(box)
    } finally {
        act(() => root.unmount())
        box.remove()
    }
}

/**
 * Lets the page run its timers, effects and fetches until `found` holds, for ten seconds at most;
 * whether it held. It returns as soon as `found` holds, so the room is only spent on a busy machine.
 */
async function until(found: () => boolean): Promise<boolean> {
    for (let round = 0; round < 500 && !found(); round++) await act(() => new Promise((done) => setTimeout(done, 20)))
    return found()
}

/** Presses a key on an element, as a browser sends it, and returns the event; nothing when there is no element. */
function press(target: Element | null | undefined, key: string, init: KeyboardEventInit = {}): KeyboardEvent | undefined {
    if (target === null || target === undefined) return undefined
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    act(() => {
        target.dispatchEvent(event)
    })
    return event
}

/** Presses a key as `press` does, and lets the page finish what the press queued, such as a focus moved a microtask later. */
async function pressWaiting(
    target: Element | null | undefined,
    key: string,
    init: KeyboardEventInit = {},
): Promise<KeyboardEvent | undefined> {
    if (target === null || target === undefined) return undefined
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
    await act(async () => {
        target.dispatchEvent(event)
        await Promise.resolve()
    })
    return event
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
    if (value === 'inherit') return 'inherit'
    // currentColor, at an alpha or not: the piece's own ink, read where the color is asked for.
    if (/^current(\/\d+)?$/.test(value)) return value
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
    // `text-current` passes the ink around it on, as no ink of its own does.
    const own = resolve(where.layers, on, READ.ink)
    if (own !== undefined && own !== 'current') return own
    for (const classes of where.around ?? []) {
        const passed = resolve([classes], on.includes('dark') ? ['dark'] : [], READ.ink)
        if (passed !== undefined && passed !== 'current') return passed
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
    const found =
        key === 'rule'
            ? (resolve(where.layers, on, READ.rule) ?? (resolve(where.layers, on, READ.ruleWidth) === undefined ? undefined : BORDER))
            : key === 'placeholder'
              ? resolve(where.layers, [...on, 'placeholder'], READ.ink)
              : resolve(where.layers, on, READ[key])
    // An edge, ground or rule in currentColor is the piece's own ink where it sets one, else the ink around it.
    const current = found === undefined ? null : /^current(\/\d+)?$/.exec(found)
    if (current === null) return found
    const own = resolve(where.layers, on, READ.ink)
    return own === undefined || own === 'current' ? 'inherit' : `${own}${current[1] ?? ''}`
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
    saturation: 70,
    brightness: 85,
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
    distance: '57.7 km',
    bearing: '308°',
    name: 'Patrol 7',
    index: 2,
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
    /**
     * For each binding (its keys, then `when`), whether the part handles it: true, or what is found
     * instead. A probe that waits on the page (a menu's parts loading, an effect) answers in a promise.
     */
    keys: Record<string, (() => true | string | Promise<true | string>) | Skip>
    /** Other checks a spec asks of this part, by key. */
    more?: () => Check[] | Promise<Check[]>
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

const TEXT_FIELD = source('components/TextField.tsx')
const field = (props: Partial<Parameters<typeof TextField>[0]> = {}) => draw(TextField, { id: 'name', label: 'Name', ...props })
const REFUSED = { error: 'Use letters and digits' }
/** What a one-line text field with `onEnter` and `onEscape` hears when the key is pressed in its input. */
const fieldHears = (key: string) => {
    const said: string[] = []
    const props = { id: 'name', label: 'Name', onEnter: () => said.push('enter'), onEscape: () => said.push('escape') }
    live(createElement(TextField, props), (box) => press(box.querySelector('input'), key))
    return said.join(' ')
}
/** Whether a press on a field's label focuses a control a label cannot name natively, such as a picker's face. */
const labelFocuses = () =>
    live(
        createElement(Field, { id: 'when', label: 'When', children: createElement('div', { id: 'when', role: 'combobox', tabIndex: 0 }) }),
        (box) => {
            act(() => box.querySelector('label')?.click())
            return document.activeElement === box.querySelector('#when')
        },
    )
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
        'Enter (a one-line input with onEnter)': () => (fieldHears('Enter') === 'enter' ? true : 'no Enter handled for onEnter'),
        'Escape (a one-line input with onEscape)': () => (fieldHears('Escape') === 'escape' ? true : 'no Escape handled for onEscape'),
        'Enter, Space (the mark has focus)': () =>
            field(REFUSED).find((element) => element.attrs['aria-haspopup'] === 'dialog')?.tag === 'button'
                ? true
                : 'the mark is not a native button',
        'Escape (the popover is open)': skip("Base UI's popover closes on Escape in a browser; the server draws it closed"),
        'Click label': () => (labelFocuses() ? true : 'no press on the label focuses the control'),
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
            tableReorders() === '0>1 1>0' ? true : 'no Alt with the arrows',
        'Shift+Click (selectable)': () =>
            tableChooses({ metaKey: true }, { shiftKey: true }) === 'nightly-export | nightly-export sync-inventory rebuild-index'
                ? true
                : 'no range on Shift and a press',
        'Mod+Click (selectable)': () =>
            tableChooses({ metaKey: true }, { ctrlKey: true }) === 'nightly-export | nightly-export rebuild-index'
                ? true
                : 'no row on Ctrl or Cmd and a press',
        'ArrowLeft, ArrowRight, Enter (a handle has focus)': () =>
            handleHears('ArrowRight') === '216' && handleHears('ArrowLeft') === '184' && handleHears('Enter') === 'reset'
                ? true
                : 'the handle misses a key',
        'ArrowUp (the table view, a sortable head drawn)': () =>
            headEntered(['name', 'state'], 'state') === 'state' &&
            headEntered(['name', 'state'], undefined) === 'name' &&
            inHeads(undefined, ['ArrowUp']).focus === 'name' &&
            inHeads('state', ['ArrowUp']).focus === 'state'
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
            inHeads(undefined, ['ArrowUp', 'ArrowRight', 'Enter']).sorted === 'state asc' &&
            inHeads('state', ['ArrowUp', ' ']).sorted === 'state desc'
                ? true
                : "Enter or Space in the head row does not turn the head's order",
        'ArrowDown (in the head row)': () =>
            headStep(['name', 'state'], 'state', 'ArrowDown') === 'rows' &&
            JSON.stringify(inHeads(undefined, ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowDown'])) ===
                JSON.stringify({ focus: 'grid', active: 'nightly-export' })
                ? true
                : 'Down in the head row does not go back to the first row',
        'Enter, F2, a character (editing)': () => {
            const editing = source('components/table-editing.tsx')
            // A typed character opening the editor is a press a browser makes; Enter and F2 are read here.
            return /\bF2: /.test(editing) && /Enter/.test(editing) ? true : 'the editor misses Enter or F2'
        },
    },
}

/**
 * The selections a selectable table hands out when its first row is pressed with `first` held,
 * then its last with `last` held, each as the keys it holds.
 */
function tableChooses(first: MouseEventInit, last: MouseEventInit): string {
    const said: string[] = []
    const props = {
        columns: COLUMNS,
        rows: JOBS,
        rowKey: (job: Job) => job.id,
        selectable: true,
        onSelectionChange: (chosen: ReadonlySet<string>) => said.push([...chosen].join(' ')),
    }
    live(createElement(DataTable<Job>, props), (box) => {
        const pressRow = (key: string, init: MouseEventInit) =>
            act(() => {
                box.querySelector(`[data-row="${key}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }))
            })
        pressRow(JOBS[0].id, first)
        pressRow(JOBS[2].id, last)
    })
    return said.join(' | ')
}

/** Columns that both sort, for the head row's keys. */
const SORTING: DataColumn<Job>[] = [COLUMNS[0], { ...COLUMNS[1], sortValue: (job) => job.state }]

/**
 * Where the keys are after pressing each key in a table whose heads both sort, sorted at first by
 * `by`: the head whose button has the focus, or the grid and its active row; and the last order
 * the table handed out.
 */
function inHeads(by: string | undefined, keys: string[]): { focus?: string; active?: string; sorted?: string } {
    let sorted: string | undefined
    const props = {
        columns: SORTING,
        rows: JOBS,
        rowKey: (job: Job) => job.id,
        defaultSort: by === undefined ? null : { column: by, direction: 'asc' as const },
        onSortChange: (next: { column: string; direction: string } | null) => {
            sorted = next === null ? 'none' : `${next.column} ${next.direction}`
        },
    }
    return live(createElement(DataTable<Job>, props), (box) => {
        const grid = box.querySelector<HTMLElement>('[role="grid"]')
        grid?.focus()
        for (const key of keys) press(document.activeElement, key)
        const focused = document.activeElement
        const head = focused?.closest('[role="columnheader"]')?.getAttribute('data-track') ?? undefined
        const active = box.querySelector('[data-active]')?.getAttribute('data-row') ?? undefined
        const focus = head ?? (focused === grid ? 'grid' : undefined)
        return {
            ...(focus === undefined ? {} : { focus }),
            ...(active === undefined ? {} : { active }),
            ...(sorted === undefined ? {} : { sorted }),
        }
    })
}

/** Whether the table's key map moves on each key. */
/**
 * The moves a table with `onReorder` asks for, each as `from>to`, when Down makes the first row
 * active and Alt and Down are pressed, then Down makes the second active and Alt and Up are pressed.
 */
function tableReorders(): string {
    const said: string[] = []
    const props = {
        columns: COLUMNS,
        rows: JOBS,
        rowKey: (job: Job) => job.id,
        onReorder: (from: number, to: number) => said.push(`${from}>${to}`),
    }
    live(createElement(DataTable<Job>, props), (box) => {
        const grid = box.querySelector('[role="grid"]')
        press(grid, 'ArrowDown')
        press(grid, 'ArrowDown', { altKey: true })
        press(grid, 'ArrowDown')
        press(grid, 'ArrowUp', { altKey: true })
    })
    return said.join(' ')
}

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
/**
 * What a resize handle sized 200 between 100 and 400 asks for when a key is pressed on it: the size
 * it sends, `reset`, `expand` for a collapsed panel's edge (`onExpand`), or nothing.
 */
function handleHears(key: string, props: Partial<ResizeHandleProps> = {}): string {
    const said: string[] = []
    const handle: ResizeHandleProps = {
        target: { current: null },
        size: 200,
        min: 100,
        max: 400,
        label: 'Width',
        onSize: (size) => said.push(String(size)),
        onReset: () => said.push('reset'),
        ...props,
    }
    live(createElement(ResizeHandle, handle), (box) => press(box.querySelector('[role="separator"]'), key))
    return said.join(' ')
}
/** The step an arrow moves a resize handle by, in pixels. */
const handleStep = () => String(Number(handleHears('ArrowRight')) - 200)
/** Whether the edge's keys hold: the arrows step it, Home and End send it to its limits, Enter puts it back. */
const handleKeys = () =>
    handleHears('ArrowRight') === '216' &&
    handleHears('ArrowLeft') === '184' &&
    handleHears('Home') === '100' &&
    handleHears('End') === '400' &&
    handleHears('Enter') === 'reset'

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
/** A rail with the places drawn in the page, its box handed to `look`. */
const liveRail = <T>(props: Partial<RailProps>, look: (box: HTMLElement) => T) =>
    live(
        createElement(Rail, { name: 'Tidevann', mark: 'T', markHref: '#/', groups: PLACES, onCollapsedChange: () => undefined, ...props }),
        look,
    )
/** The expanded rail's Projects parent: the button that folds it. */
const railParent = (box: HTMLElement) =>
    [...box.querySelectorAll('button[aria-expanded]')].find((button) => button.textContent?.startsWith('Projects'))
/**
 * The moves a rail group with `onReorder`, inside `RailDrops`, asks for when Alt and Down are pressed
 * on its first entry and Alt and Up on its second, each as `from>to`.
 */
function railReorders(): string {
    const said: string[] = []
    const groups = [{ ...PLACES[0], onReorder: (from: number, to: number) => said.push(`${from}>${to}`) }]
    const entry = (box: HTMLElement, id: string) => box.querySelector(`[data-rail-entry="${id}"] a`)
    live(
        createElement(RailDrops, null, createElement(Rail, { name: 'Tidevann', mark: 'T', groups, onCollapsedChange: () => undefined })),
        (box) => {
            press(entry(box, 'runs'), 'ArrowDown', { altKey: true })
            press(entry(box, 'runs'), 'ArrowDown')
            press(entry(box, 'schedules'), 'ArrowUp', { altKey: true })
        },
    )
    return said.join(' ')
}
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
        collapseWith: propValues(RAIL, 'RailProps', 'collapseWith'),
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
            liveRail({}, (box) => {
                press(railParent(box), 'ArrowRight')
                return railParent(box)?.getAttribute('aria-expanded') === 'true'
            })
                ? true
                : 'no ArrowRight unfolds a parent',
        'ArrowLeft (an unfolded parent in the expanded rail, or one of its entries)': () =>
            liveRail({ defaultExpanded: ['projects'] }, (box) => {
                press(railParent(box), 'ArrowLeft')
                const folded = railParent(box)?.getAttribute('aria-expanded') === 'false'
                press(railParent(box), 'ArrowRight')
                const entry = [...box.querySelectorAll('[data-rail-children] a')].find((link) => link.textContent === 'harbor')
                press(entry, 'ArrowLeft')
                return folded && railParent(box)?.getAttribute('aria-expanded') === 'false' && document.activeElement === railParent(box)
            })
                ? true
                : 'no ArrowLeft folds a parent and goes back to its row',
        'Enter, Space, ArrowRight (collapsed, with onCollapsedChange)': () => {
            const expands = (key: string) => {
                const said: boolean[] = []
                liveRail({ collapsed: true, onCollapsedChange: (next) => said.push(next) }, (box) =>
                    press(box.querySelector('[role="separator"]'), key),
                )
                return said.join(' ') === 'false'
            }
            return expands('Enter') &&
                expands(' ') &&
                expands('ArrowRight') &&
                handleHears('ArrowLeft', { onExpand: () => undefined }) === ''
                ? true
                : "the collapsed rail's edge does not expand on Enter, Space and the arrow"
        },
        "ArrowLeft, ArrowRight, Home, End, Enter (the expanded rail's edge has focus)": () =>
            liveRail({}, (box) => box.querySelector('[role="separator"]') !== null) && handleKeys()
                ? true
                : "the rail's edge misses an arrow, Home, End or Enter",
        'Alt+ArrowUp, Alt+ArrowDown (a group with onReorder, inside RailDrops)': () =>
            railReorders() === '0>1 1>0' ? true : 'no Alt with the arrows moves an entry',
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
                resizeStep: handleStep,
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
            live(createElement(SearchField, { value: '', onChange: noop }), (box) => {
                press(document.body, '/')
                return document.activeElement === box.querySelector('input')
            })
                ? true
                : 'the search field is not focused by /',
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
            menuTrigger()?.tag === 'button' &&
            standInOpens('ArrowDown', true) &&
            standInOpens('ArrowUp', true) &&
            !standInOpens('Enter', true)
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
const SHUT_REASON = 'The name is unchanged.'
/** The confirm a dialog draws with a reason or busy, as the dialog hands them to its button. */
const confirmWhere = (state: 'shut' | 'busy') => {
    const confirm = {
        label: 'Save',
        onConfirm: noop,
        ...(state === 'shut' ? { why: SHUT_REASON } : { busy: true }),
    }
    const handed = live(
        createElement(DialogShell, {
            open: true,
            onOpenChange: noop,
            title: 'Rename',
            confirm,
        }),
        () => {
            const verb = [...document.querySelectorAll('[role="dialog"] button')].find((one) => one.textContent === 'Save')
            if (state === 'busy') return verb?.getAttribute('aria-busy') === 'true'
            const said = verb?.getAttribute('aria-describedby')?.split(' ') ?? []
            return said.some((id) => document.getElementById(id)?.textContent === SHUT_REASON)
        },
    )
    if (!handed) return undefined
    return buttonWhere(button(state === 'shut' ? { reason: SHUT_REASON } : { busy: true }), 'disabled')
}

/** The release a busy dialog is drawn with here, in ms: short, so the wait runs out within a probe. */
const RELEASE_HERE = 60

/**
 * What Escape does to an open dialog with the props: `closes`, `held`, or for one still held once
 * it has waited past its busy release, `held, then closes`.
 */
async function dialogEscapes(props: Partial<DialogShellProps>): Promise<string> {
    let closed = false
    const all = {
        open: true,
        onOpenChange: (next: boolean) => {
            closed ||= !next
        },
        title: 'Rename',
        busyRelease: RELEASE_HERE,
        ...props,
    }
    return liveWaiting(createElement(DialogShell, all), async () => {
        const escape = () => press(document.activeElement ?? document.body, 'Escape')
        escape()
        if (closed) return 'closes'
        if (props.confirm?.busy !== true) return 'held'
        await act(() => new Promise((done) => setTimeout(done, RELEASE_HERE * 2)))
        escape()
        return closed ? 'held, then closes' : 'held'
    })
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
        'Escape (dismissible, and not busy or busy past busy-release)': async () =>
            (await dialogEscapes({})) === 'closes' &&
            (await dialogEscapes({ dismissible: false })) === 'held' &&
            (await dialogEscapes({
                confirm: { label: 'Save', onConfirm: noop, busy: true },
            })) === 'held, then closes'
                ? true
                : 'Escape is not held while the dialog cannot be dismissed, or while busy before the wait',
        'Enter (the confirm has focus (initialFocus confirm opens on it), not shut or busy)': async () =>
            firstButton(button())?.tag === 'button' &&
            (await liveWaiting(
                createElement(DialogShell, {
                    open: true,
                    onOpenChange: noop,
                    title: 'Rename',
                    initialFocus: 'confirm',
                    confirm: { label: 'Save', onConfirm: noop },
                }),
                () => until(() => document.activeElement?.textContent === 'Save'),
            ))
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

/**
 * Draws an open settings dialog in the page on a section that resets and one that does not, with
 * `active` shown, and hands `look` what it has said (`active <id>`, `reset <id>`) and a way to find
 * a button in the page by its words.
 */
const liveSettings = <T>(active: string, look: (said: string[], button: (words: string) => HTMLButtonElement | undefined) => T) => {
    const said: string[] = []
    const groups = [
        {
            id: 'workspace',
            sections: [
                {
                    id: 'appearance',
                    label: 'Appearance',
                    settings: [{ id: 'density', title: 'Density', control: 'Compact' }],
                },
                {
                    id: 'notifications',
                    label: 'Notifications',
                    reset: false,
                    settings: [{ id: 'digest', title: 'Digest', control: 'Daily' }],
                },
            ],
        },
    ]
    const props = {
        open: true,
        onOpenChange: noop,
        groups,
        active,
        onActiveChange: (id: string) => said.push(`active ${id}`),
        search: '',
        onSearchChange: noop,
        onReset: (id?: string) => said.push(`reset ${String(id)}`),
    }
    return live(createElement(SettingsDialog, props), () =>
        look(said, (words) => [...document.querySelectorAll('button')].find((one) => one.textContent === words)),
    )
}

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
            liveSettings('appearance', (said, button) => {
                const entry = button('Notifications')
                act(() => entry?.click())
                return entry?.tagName === 'BUTTON' && entry.type === 'button' && said.join(' ') === 'active notifications'
            })
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
                liveSettings('appearance', (_, button) => button(SETTINGS_DIALOG_WORDS.reset) !== undefined) &&
                    liveSettings('notifications', (_, button) => button(SETTINGS_DIALOG_WORDS.reset) === undefined)
                    ? 'no Reset to defaults for a section with reset false'
                    : undefined,
            ),
            check(
                'states.confirming',
                'a ConfirmDialog with a destructive resetConfirm',
                liveSettings('appearance', (said, button) => {
                    act(() => button(SETTINGS_DIALOG_WORDS.reset)?.click())
                    const asked = said.length === 0 && document.querySelectorAll('[role="dialog"]').length === 2
                    const confirm = button(SETTINGS_DIALOG_WORDS.resetConfirm)
                    const destructive = confirm?.className.includes('text-destructive') === true
                    act(() => confirm?.click())
                    return asked && destructive && said.join(' ') === 'reset appearance'
                })
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
/** An open palette drawn in the page, and what the probes do to it. */
interface PalettePage {
    /** What the palette said, in order: `run <command>` and `open false`. */
    said: string[]
    /** Presses a key in the search. */
    key: (key: string, init?: KeyboardEventInit) => void
    /** The label of the active row. */
    active: () => string | null | undefined
    /** A row by its label. */
    row: (label: string) => Element | undefined
    /** Settles the running nightly-export, fulfilled. */
    settle: () => Promise<void>
    /** Lets the page run for `ms`. */
    wait: (ms: number) => Promise<void>
}

/**
 * Draws an open palette in the page on two commands, nightly-export, whose run waits until the
 * probe settles it, and sync-inventory, refused with `refusal` (an Error's words, or none), with a
 * busy release of `RELEASE_HERE`, and hands `look` the page.
 */
function livePalette<T>(look: (page: PalettePage) => T | Promise<T>, refusal?: string): Promise<T> {
    const said: string[] = []
    let settle: () => void = noop
    const groups = [
        {
            title: 'Jobs',
            commands: [
                {
                    id: 'nightly-export',
                    label: 'nightly-export',
                    onSelect: () => {
                        said.push('run nightly-export')
                        return new Promise<void>((done) => (settle = done))
                    },
                },
                {
                    id: 'sync-inventory',
                    label: 'sync-inventory',
                    onSelect: () => {
                        said.push('run sync-inventory')
                        return Promise.reject(refusal === undefined ? undefined : new Error(refusal))
                    },
                },
            ],
        },
    ]
    const props = {
        open: true,
        onOpenChange: (next: boolean) => said.push(`open ${String(next)}`),
        busyRelease: RELEASE_HERE,
        groups,
    }
    const rows = () => [...document.querySelectorAll('[cmdk-item]')]
    const wait = (ms: number) => act(() => new Promise<void>((done) => setTimeout(done, ms)))
    return liveWaiting(createElement(CommandPalette, props), async () =>
        look({
            said,
            key: (key, init) => void press(document.querySelector('[cmdk-input]'), key, init),
            active: () => rows().find((row) => row.getAttribute('data-selected') === 'true')?.textContent,
            row: (name) => rows().find((row) => row.textContent === name),
            settle: () =>
                act(async () => {
                    settle()
                    await Promise.resolve()
                }),
            wait,
        }),
    )
}

/** Whether a component that binds `usePaletteShortcut` opens its palette on `init`'s K pressed in a field. */
const shortcutOpensPalette = (init: KeyboardEventInit) => {
    let opened = false
    const Opener = () => {
        usePaletteShortcut(() => {
            opened = true
        })
        return createElement('input', { 'aria-label': 'Name' })
    }
    return live(createElement(Opener), (box) => {
        press(box.querySelector('input'), 'k', init)
        return opened
    })
}

/** Whether a running command's row is busy with the palette held open until it settles, and whether a refusal is said under the rows. */
async function paletteStates(): Promise<{ busy: boolean; refused: boolean }> {
    const busy = await livePalette(async (page) => {
        page.key('Enter')
        const running = page.row('nightly-export')?.getAttribute('aria-busy') === 'true' && page.said.join(' ') === 'run nightly-export'
        await page.settle()
        return running && page.said.join(' ') === 'run nightly-export open false'
    })
    const refusedAs = (refusal: string | undefined) =>
        livePalette(async (page) => {
            page.key('ArrowDown')
            page.key('Enter')
            await page.wait(0)
            const list = document.querySelector('[cmdk-list]')
            const words = refusal ?? COMMAND_PALETTE_WORDS.refused
            const said = [...document.querySelectorAll('[role="dialog"] *')].find(
                (one) => one.children.length === 0 && one.textContent === words,
            )
            const under =
                list !== null && said !== undefined && (list.compareDocumentPosition(said) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
            return under && page.said.join(' ') === 'run sync-inventory'
        }, refusal)
    const refused = (await refusedAs('The worker is offline.')) && (await refusedAs(undefined))
    return { busy, refused }
}

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
        'Mod+K': async () => {
            const opens =
                shortcutOpensPalette({ ctrlKey: true }) &&
                onApple(() => shortcutOpensPalette({ metaKey: true }) && shortcutOpensPalette({ ctrlKey: true }))
            // An open palette closes itself on the same keys, in a Shell or not, held while a command runs.
            const closes =
                (await livePalette((page) => {
                    page.key('k', { ctrlKey: true })
                    return page.said.join(' ') === 'open false'
                })) &&
                (await livePalette((page) => {
                    page.key('Enter')
                    page.key('k', { ctrlKey: true })
                    return page.said.join(' ') === 'run nightly-export'
                }))
            return opens && closes ? true : `usePaletteShortcut opens ${String(opens)}, the open palette closes ${String(closes)}`
        },
        'a character (the palette is open)': () =>
            bySlot(PALETTES().full, 'command-input')?.tag === 'input' ? true : "the search is not cmdk's input",
        'ArrowDown, ArrowUp (the palette is open)': () =>
            livePalette((page) => {
                const steps = ['ArrowUp', 'ArrowDown', 'ArrowDown'].map((key) => {
                    page.key(key)
                    return page.active()
                })
                if (steps.join(' ') !== 'nightly-export sync-inventory sync-inventory') return 'the palette loops at its ends'
                // cmdk's Ctrl+N, Ctrl+J, Ctrl+P and Ctrl+K are off, so Ctrl+K is the palette's key alone.
                const vim = ['p', 'k', 'n', 'j'].map((key) => {
                    page.key(key, { ctrlKey: true })
                    return page.active()
                })
                return vim.every((one) => one === 'sync-inventory') ? true : "cmdk's own Ctrl keys move the active row"
            }),
        'Home, End (the palette is open)': skip('cmdk moves the active row to the ends in a browser; the server draws none active'),
        'Enter (a row is active and no command is running, or Stop waiting is active)': async () =>
            (await livePalette(async (page) => {
                page.key('Enter')
                page.key('ArrowDown')
                page.key('Enter')
                await page.wait(RELEASE_HERE * 2)
                for (const key of ['ArrowUp', 'ArrowUp', 'Enter']) page.key(key)
                return page.said.join(' ')
            })) === 'run nightly-export open false'
                ? true
                : 'a choice made while a command runs is not ignored, or Stop waiting does not close',
        'Escape (the palette is open, and no command is running or it has run busy-release)': async () =>
            (await livePalette((page) => {
                page.key('Escape')
                return page.said.join(' ')
            })) === 'open false' &&
            (await livePalette(async (page) => {
                page.key('Enter')
                page.key('Escape')
                const held = page.said.join(' ')
                await page.wait(RELEASE_HERE * 2)
                page.key('Escape')
                return `${held} | ${page.said.join(' ')}`
            })) === 'run nightly-export | run nightly-export open false'
                ? true
                : 'a running command does not hold the palette open until the wait',
    },
    more: async () => {
        const { full } = PALETTES()
        const meta = spanOf(full, '4m 12s')
        const states = await paletteStates()
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
                states.busy ? 'the palette open, the row busy, until the promise settles' : undefined,
            ),
            check(
                'states.refused',
                "the rejection's words, else words.refused, under the rows",
                states.refused ? "the rejection's words, else words.refused, under the rows" : undefined,
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

/** What a shell with a palette and shortcuts, both held shut from outside, asks to open when the key is pressed on the page. */
/** What `run` gives on an Apple device, where Mod is ⌘. */
function onApple<T>(run: () => T): T {
    const platform = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    try {
        return run()
    } finally {
        platform.mockRestore()
    }
}

const shellHears = (key: string, init: KeyboardEventInit) => {
    const said: string[] = []
    const props = {
        rail: null,
        children: 'Run 1842',
        palette: [],
        paletteOpen: false,
        onPaletteOpenChange: (open: boolean) => said.push(open ? 'palette' : 'palette shut'),
        shortcuts: [],
        shortcutsOpen: false,
        onShortcutsOpenChange: (open: boolean) => said.push(open ? 'shortcuts' : 'shortcuts shut'),
    }
    live(createElement(Shell, props), () => press(document.body, key, init))
    return said.join(' ')
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
            shellHears('k', { ctrlKey: true }) === 'palette' &&
            onApple(() => shellHears('k', { metaKey: true }) === 'palette' && shellHears('k', { ctrlKey: true }) === 'palette')
                ? true
                : 'the palette is not bound to Mod+K and Ctrl+K',
        '?': () => (shellHears('?', { shiftKey: true }) === 'shortcuts' ? true : 'the shortcuts dialog is not bound to ?'),
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
/** Whether the arrows move the focus along a row of buttons, stopping at its first and last as every list of choices does. */
function stopsAtEnds(buttons: readonly HTMLElement[]): boolean {
    const first = buttons[0]
    const last = buttons.at(-1)
    if (buttons.length < 3 || first === undefined || last === undefined) return false
    act(() => first.focus())
    press(first, 'ArrowLeft')
    const heldFirst = document.activeElement === first
    press(first, 'ArrowRight')
    const stepped = document.activeElement === buttons[1]
    press(buttons[1], 'ArrowLeft')
    const back = document.activeElement === first
    act(() => last.focus())
    press(last, 'ArrowRight')
    return heldFirst && stepped && back && document.activeElement === last
}

// Run timeline

const RUN_TIMELINE = source('components/RunTimeline.tsx')
const TIME_AXIS = source('lib/time-axis.ts')
const TIME_TICKS = source('components/time-axis.tsx')
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
/**
 * The shifts, in ms, a timeline snapped to `snap` asks for when a key is pressed on its handle, with
 * sync-inventory chosen and its next run 6 hours after now. Drawn in the page, where nothing is laid
 * out, the axis takes the 640 pixels the timeline falls back on.
 */
function runShifts(key: string, snap: number, init: KeyboardEventInit = {}): string {
    const said: number[] = []
    const props: RunTimelineProps = {
        lanes: RUN_LANES,
        from: NOON - 12 * HOURS,
        to: NOON + 12 * HOURS,
        now: NOON,
        timeZone: 'UTC',
        selected: 'sync-inventory',
        snap,
        onShift: (shift) => said.push(shift.by),
    }
    live(createElement(RunTimeline, props), (box) => press(box.querySelector('[data-shift-handle]'), key, init))
    return said.join(' ')
}
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
            runShifts('ArrowRight', HOURS) === String(HOURS) &&
            runShifts('ArrowLeft', HOURS) === String(-HOURS) &&
            runShifts('ArrowLeft', 6 * HOURS) === ''
                ? true
                : 'the handle does not shift by the arrows, held to now',
        'Shift+ArrowLeft, Shift+ArrowRight (the handle has focus)': () => {
            const tick = timelineTicks(NOON - 12 * HOURS, NOON + 12 * HOURS, 640, 'UTC').step
            return tick !== HOURS &&
                runShifts('ArrowRight', HOURS, { shiftKey: true }) === String(tick) &&
                runShifts('ArrowLeft', HOURS, { shiftKey: true }) === String(-tick)
                ? true
                : 'Shift does not shift by a tick'
        },
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
                tickRoom: () => numberIn(TIME_AXIS, /const TICK_ROOM = (\d+)\b/),
                nowRoom: () => numberIn(TIME_TICKS, /const MARK_ROOM = (\d+)\b/),
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
/**
 * What a clip timeline at 25 frames a second, its playhead at 2 and harbor-wide chosen, says when a
 * key is pressed on the juniper-pan clip, the focus inside the timeline: each callback it calls, as
 * `playhead:<seconds>`, `chosen:<ids>`, `moved:<id>@<start>`, `split:<id>@<at>` or `deleted:<ids>`.
 */
function clipHears(key: string, init: KeyboardEventInit = {}, props: Partial<ClipTimelineProps> = {}): string {
    const said: string[] = []
    const at = (seconds: number) => String(Math.round(seconds * 1000) / 1000)
    const all: ClipTimelineProps = {
        tracks: CLIP_TRACKS,
        clips: CLIPS,
        duration: 12,
        fps: 25,
        playhead: 2,
        selected: ['wide'],
        onPlayheadChange: (seconds) => said.push(`playhead:${at(seconds)}`),
        onSelectedChange: (ids) => said.push(`chosen:${ids.join(',')}`),
        onClipsChange: (changes) => said.push(...changes.map((change) => `moved:${change.id}@${at(change.start ?? NaN)}`)),
        onSplit: (id, seconds) => said.push(`split:${id}@${at(seconds)}`),
        onDelete: (ids, ripple) => said.push(`deleted:${ids.join(',')}${ripple ? ' rippled' : ''}`),
        ...props,
    }
    live(createElement(ClipTimeline, all), (box) => press(box.querySelector('[data-clip="pan"]'), key, init))
    return said.join(' ')
}
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
            clipHears('Enter') === 'chosen:pan' && clipHears(' ', { shiftKey: true }) === 'chosen:wide,pan'
                ? true
                : 'Enter and Space do not choose a clip',
        'ArrowLeft, ArrowRight (focus is inside the timeline)': () =>
            clipHears('ArrowRight') === 'playhead:2.04' &&
            clipHears('ArrowLeft') === 'playhead:1.96' &&
            clipHears('ArrowRight', { shiftKey: true }) === 'playhead:3'
                ? true
                : 'the arrows do not move the playhead a frame, a second with Shift',
        'Home, End (focus is inside the timeline)': () =>
            clipHears('Home') === 'playhead:0' && clipHears('End') === 'playhead:12' ? true : 'Home and End do not reach the ends',
        'Alt+ArrowLeft, Alt+ArrowRight (focus is inside the timeline and onClipsChange is given)': () =>
            clipHears('ArrowRight', { altKey: true }, { selected: ['pan'] }) === 'moved:pan@6.04' &&
            clipHears('ArrowRight', { altKey: true }, { selected: ['pan'], onClipsChange: undefined }) === ''
                ? true
                : 'Alt and the arrows do not move the chosen clips a frame',
        'S (focus is inside the timeline and onSplit is given)': () =>
            clipHears('s') === 'split:wide@2' &&
            clipHears('S') === 'split:wide@2' &&
            clipHears('s', { ctrlKey: true }) === '' &&
            clipHears('s', { altKey: true }) === '' &&
            clipHears('s', {}, { onSplit: undefined }) === ''
                ? true
                : 'S does not split',
        'Delete, Backspace (focus is inside the timeline, onDelete is given and a clip is chosen)': () =>
            clipHears('Delete') === 'deleted:wide' &&
            clipHears('Backspace') === 'deleted:wide' &&
            clipHears('Delete', { shiftKey: true }) === 'deleted:wide rippled' &&
            clipHears('Delete', {}, { selected: [] }) === ''
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
/** An emoji picker drawn in the page once its emoji have loaded and its whole grid is drawn, handed to `look`. */
const livePicker = <T>(props: Partial<EmojiPickerProps>, look: (box: HTMLElement) => T | Promise<T>) =>
    liveWaiting(createElement(EmojiPicker, { onPick: noop, recent: [], autoFocus: false, ...props }), async (box) => {
        await until(() => box.querySelector('[data-index]') !== null)
        // The rest of the grid is drawn a frame after the first.
        await act(() => new Promise((done) => setTimeout(done, 50)))
        return look(box)
    })
const emojiCell = (box: HTMLElement, index: number) => box.querySelector(`[data-index="${String(index)}"]`)
/** Presses Escape on an element; whether the press went on past the part to the page, as it would to a popover or dialog around it. */
function escapesPast(target: Element | null): boolean {
    let past = false
    const hear = () => {
        past = true
    }
    document.addEventListener('keydown', hear)
    press(target, 'Escape')
    document.removeEventListener('keydown', hear)
    return past
}
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
            livePicker({}, (box) => {
                press(box.querySelector('input'), 'ArrowDown')
                return document.activeElement === emojiCell(box, 0)
            }).then((entered) => (entered ? true : 'Down from the search does not enter the grid')),
        'Enter (the search has focus and holds a query that found any)': () => {
            const picked: string[] = []
            return livePicker({ defaultQuery: 'thumbs', onPick: (_, name) => picked.push(name) }, (box) => {
                press(box.querySelector('input'), 'Enter')
                return picked.join() === 'thumbs up'
            }).then((picks) => (picks ? true : 'Enter in the search does not pick the first found'))
        },
        'ArrowLeft, ArrowRight (a cell has focus)': () =>
            livePicker({}, (box) => {
                press(emojiCell(box, 0), 'ArrowRight')
                const right = document.activeElement === emojiCell(box, 1)
                press(emojiCell(box, 1), 'ArrowLeft')
                press(emojiCell(box, 0), 'ArrowLeft')
                return right && document.activeElement === emojiCell(box, 0)
            }).then((moves) => (moves ? true : 'the arrows do not move across the cells, stopping at the ends')),
        'ArrowUp, ArrowDown (a cell has focus)': () =>
            livePicker({}, (box) => {
                press(emojiCell(box, 0), 'ArrowDown')
                const down = document.activeElement === emojiCell(box, 8)
                press(emojiCell(box, 8), 'ArrowUp')
                const up = document.activeElement === emojiCell(box, 0)
                press(emojiCell(box, 0), 'ArrowUp')
                return down && up && document.activeElement === box.querySelector('input')
            }).then((moves) => (moves ? true : 'Up and Down do not move by rows, Up from the first back to the search')),
        'Home, End (a cell has focus)': () =>
            livePicker({}, (box) => {
                const cells = box.querySelectorAll('[data-index]')
                press(emojiCell(box, 0), 'End')
                const end = document.activeElement === cells[cells.length - 1]
                press(cells[cells.length - 1], 'Home')
                return end && document.activeElement === emojiCell(box, 0)
            }).then((moves) => (moves ? true : 'Home and End do not reach the ends')),
        'Enter, Space (a cell has focus)': () => {
            const picked: string[] = []
            return livePicker({ onPick: (emoji, name) => picked.push(`${emoji} ${name}`) }, (box) => {
                const cell = emojiCell(box, 3)
                act(() => (cell as HTMLButtonElement | null)?.click())
                return (
                    cell instanceof HTMLButtonElement &&
                    cell.type === 'button' &&
                    picked.length === 1 &&
                    picked[0].startsWith(cell.textContent)
                )
            }).then((picks) => (picks ? true : 'a cell is not a native button that picks'))
        },
        'ArrowLeft, ArrowRight (a tab has focus)': () =>
            livePicker({}, (box) => stopsAtEnds([...box.querySelectorAll<HTMLElement>('[role="toolbar"] button')])).then((stops) =>
                stops ? true : 'the arrows do not move between the tabs, stopping at the ends',
            ),
        'Enter, Space (a tab has focus)': () =>
            livePicker({ defaultQuery: 'cat' }, (box) => {
                const tab = box.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')[2]
                const searched = box.querySelector('input')?.value === 'cat'
                act(() => tab.click())
                return emojiTab(emojiPicker(), false)?.attrs.type === 'button' && searched && box.querySelector('input')?.value === ''
            }).then((clears) => (clears ? true : 'a tab is not a native button that clears the search')),
        'Escape (focus is in the picker and the tone choice is not open)': () => {
            let closed = 0
            return livePicker({ defaultQuery: 'cat', onClose: () => closed++ }, (box) => {
                const input = box.querySelector('input')
                const first = escapesPast(input)
                const cleared = closed === 0 && input?.value === ''
                press(input, 'Escape')
                return !first && cleared && closed === 1
            }).then((holds) => (holds ? true : 'Escape does not clear the search, then call onClose'))
        },
        'Escape (the tone choice is open)': () => {
            let closed = 0
            return livePicker({ onClose: () => closed++ }, async (box) => {
                const toneButton = () => box.querySelector(`button[aria-label="${EMOJI_PICKER_WORDS.skinTone}"][aria-expanded]`)
                act(() => (toneButton() as HTMLButtonElement | null)?.click())
                const opened = box.querySelector('[role="radiogroup"]') !== null
                const past = escapesPast(box.querySelector('[role="radio"]'))
                const shut = box.querySelector('[role="radiogroup"]') === null
                return opened && !past && shut && closed === 0 && (await until(() => document.activeElement === toneButton()))
            }).then((holds) => (holds ? true : 'Escape does not close the tone choice, focus back on its button'))
        },
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
            live(createElement(ReactionBar, { onReact: noop, selected: ['❤️'] }), (box) =>
                stopsAtEnds([...box.querySelectorAll<HTMLElement>('button')]),
            ) && byLabel(REACTION_BARS().md, REACTION_BAR_WORDS.more)?.attrs['data-reaction'] !== undefined
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
const TOUCH_READ_ONCE = /const \[touch\] = useState\(touchTyping\)/
const touchScreen = () => /'\(pointer: coarse\) and \(hover: none\)'/.test(source('lib/keys.ts'))
/** The people the suggestions list for a bare `@`. */
const MENTION_PEOPLE = [
    { id: 'ada', name: 'ada' },
    { id: 'grace', name: 'grace' },
    { id: 'linus', name: 'linus' },
]
/**
 * What a composer whose text ends with a bare `@`, its suggestions open on `people`, does with each
 * key pressed in turn in its text: `change:<text>` when it puts a person in, `kept` when it keeps the
 * key from the text, `line` when it leaves the key to the text; then `open` or `shut` for the list.
 */
function mentionsHear(keys: string[], people: ComposerMentions['people'] = MENTION_PEOPLE): string {
    const said: string[] = []
    const props = {
        value: 'Ask @',
        onChange: (text: string) => said.push(`change:${text}`),
        onSend: () => said.push('send'),
        mentions: { people, defaultOpen: true },
    }
    return live(createElement(Composer, props), (box) => {
        for (const key of keys) {
            const before = said.length
            const event = press(box.querySelector('textarea'), key)
            if (said.length === before) said.push(event?.defaultPrevented === true ? 'kept' : 'line')
        }
        said.push(box.querySelector('[role="listbox"]') === null ? 'shut' : 'open')
        return said.join(' ')
    })
}
const MENTION_PROBES: Adapter['keys'] = {
    'ArrowDown, ArrowUp (the suggestion list is open)': () =>
        mentionsHear(['ArrowUp', 'Enter']) === 'kept change:Ask @ada  shut' &&
        mentionsHear(['ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']) === 'kept kept kept change:Ask @linus  shut' &&
        mentionsHear(['ArrowDown', 'ArrowDown', 'ArrowUp', 'Enter']) === 'kept kept kept change:Ask @grace  shut'
            ? true
            : 'the arrows do not move through the people, stopping at the ends',
    'Enter, Tab (the suggestion list is open)': () =>
        mentionsHear(['Enter']) === 'change:Ask @ada  shut' &&
        mentionsHear(['ArrowDown', 'Tab']) === 'kept change:Ask @grace  shut' &&
        mentionsHear(['Enter', 'Tab'], () => new Promise(() => undefined)) === 'kept kept open'
            ? true
            : 'Enter and Tab do not put the person in, waiting on a search',
    'Escape (the suggestion list is open)': () =>
        mentionsHear(['Escape']) === 'kept shut' ? true : 'Escape does not close the suggestions',
}
/** A composer that takes the text, the send and the change of text, and the props each draws with. */
type TextComposer = ComponentType<{
    value: string
    onChange: (value: string) => void
    onSend: () => void
    mentions?: ComposerMentions
}>
/**
 * What a composer drawn in the page (a desktop screen) does when a key is pressed in its text:
 * `send`, `change:<text>` when it puts a suggestion in, `kept` when it keeps the key from the text
 * without sending, or `line` when it leaves the key to the text.
 */
function composerHears(composer: TextComposer, props: object, key: string, init: KeyboardEventInit = {}): string {
    const said: string[] = []
    const all = {
        value: 'Did nightly-export finish?',
        onChange: (text: string) => said.push(`change:${text}`),
        onSend: () => said.push('send'),
        ...props,
    }
    live(createElement(composer, all), (box) => {
        const event = press(box.querySelector('textarea'), key, init)
        if (said.length === 0) said.push(event?.defaultPrevented === true ? 'kept' : 'line')
    })
    return said.join(' ')
}
/**
 * Whether Enter sends a text that is ready, keeps an unready one (`unready`) without sending, puts
 * the chosen suggestion in when the list is open, and leaves the key alone while an input method composes.
 */
const entersAsSend = (composer: TextComposer, props: object, unready: object) =>
    composerHears(composer, props, 'Enter') === 'send' &&
    composerHears(composer, { ...props, ...unready }, 'Enter') === 'kept' &&
    composerHears(composer, { ...props, value: 'Ask @ad', mentions: MENTIONING }, 'Enter') === 'change:Ask @ada ' &&
    composerHears(composer, props, 'Enter', { isComposing: true }) === 'line'
/** People to mention, the list open on the mention the text ends with. */
const MENTIONING: ComposerMentions = { people: [{ id: 'ada', name: 'ada' }], defaultOpen: true }
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
            entersAsSend(Composer, { onAttach: noop }, { value: '', attachments: [] })
                ? true
                : 'Enter does not send when ready, past the suggestions, a touch screen and an input method',
        'Shift+Enter (the text has focus)': () =>
            composerHears(Composer, {}, 'Enter', { shiftKey: true }) === 'line'
                ? true
                : 'Shift+Enter does not leave the line break to the text',
        'Enter (the text has focus on a touch screen)': () =>
            TOUCH_READ_ONCE.test(COMPOSER) && touchScreen() ? true : 'a touch screen is not read once from a coarse pointer with no hover',
        ...MENTION_PROBES,
        'Escape (a dictation hears, transcribes or has failed)': () => {
            const cancels = (state: 'idle' | 'recording' | 'transcribing' | 'error') => {
                const props = { value: '', onChange: noop, onSend: noop, dictation: { transcribe: async () => '', defaultState: state } }
                return live(createElement(Composer, props), (box) => {
                    const strip = () => box.querySelector(`[aria-label="${COMPOSER_DICTATION_WORDS.recording}"], [role="alert"]`)
                    const shown = strip() !== null || box.textContent?.includes(COMPOSER_DICTATION_WORDS.transcribing) === true
                    const past = escapesPast(box.querySelector('textarea'))
                    return shown && !past && strip() === null && !box.textContent?.includes(COMPOSER_DICTATION_WORDS.transcribing)
                })
            }
            const idlePasses = live(createElement(Composer, { value: '', onChange: noop, onSend: noop }), (box) =>
                escapesPast(box.querySelector('textarea')),
            )
            return cancels('recording') && cancels('transcribing') && cancels('error') && idlePasses
                ? true
                : 'Escape does not cancel the dictation'
        },
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
            entersAsSend(MessageComposer, {}, { value: '  ' })
                ? true
                : 'Enter does not send a text that holds something, past the suggestions, a touch screen and an input method',
        'Shift+Enter (the text has focus)': () =>
            composerHears(MessageComposer, {}, 'Enter', { shiftKey: true }) === 'line'
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
const callBar = (props: Partial<CallBarProps> = {}) => draw(TooltipProvider, {}, callBarOf(props))
/** A call bar drawn in the page, handed to `look`. */
const liveCallBar = <T>(look: (box: HTMLElement) => T) => live(createElement(TooltipProvider, {}, callBarOf({})), look)
/** A call bar with every control, its devices' menus and its more menu. */
const callBarOf = (props: Partial<CallBarProps>) =>
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
    })
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
/** The bar's own words: the reaction bar's are parts/reaction-bar's, passed through `reactionBar`. */
const { reactionBar: _callReactionWords, ...CALL_BAR_OWN } = CALL_BAR_WORDS
const toolbarOf = (elements: El[]) => elements.find((element) => element.attrs.role === 'toolbar')
/** The bar's surface, holding its tray over its toolbar. */
const callPanelOf = (elements: El[]) => byData(elements, 'data-slot', 'call-bar-panel')

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
            // The pad is the surface's; the gap is the toolbar's, between its controls.
            bar: pieceWhere(key === 'gap' ? toolbarOf(plain) : callPanelOf(plain)),
            tray: pieceWhere(callPanelOf(plain)),
            control: pieceWhere(byLabel(plain, CALL_BAR_WORDS.share), key === 'icon' ? SIZE_ON.icon : []),
            devices: pieceWhere(byLabel(plain, CALL_BAR_WORDS.microphoneDevices), key === 'icon' ? SVG_ON : []),
            leave: pieceWhere(byLabel(plain, CALL_BAR_WORDS.leave), key === 'icon' ? SIZE_ON.icon : []),
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
                return pieceWhere(callPanelOf(plain))
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
            liveCallBar((box) => stopsAtEnds([...box.querySelectorAll<HTMLElement>('[data-call-control]')]))
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
        'Escape (a menu or the tray of the bar is open)': () =>
            live(createElement(TooltipProvider, {}, callBarOf({ defaultOpenMenu: 'reactions' })), (box) => {
                const tray = box.querySelector<HTMLElement>('[data-slot="call-bar-tray"]')
                if (tray === null) return 'the reactions do not open in the bar'
                if (document.activeElement?.hasAttribute('data-reaction') !== true) return 'focus does not go to the first reaction'
                press(tray.querySelector('[data-reaction]'), 'Escape')
                const toggle = box.querySelector<HTMLElement>(`[aria-label="${CALL_BAR_WORDS.reactions}"]`)
                return box.querySelector('[data-slot="call-bar-tray"]') === null && toggle !== null && document.activeElement === toggle
                    ? true
                    : 'Escape does not close the tray with focus back on the reactions toggle'
            }),
    },
    more: () =>
        layoutChecks('call-bar', {
            midRoom: () => numberIn(CALL_BAR, /const MID = (\d+)\b/, 'rem'),
            narrowRoom: () => numberIn(CALL_BAR, /const NARROW = (\d+)\b/, 'rem'),
            menuOffset: () => numberIn(CALL_BAR, /const MENU_OFFSET = (\d+)\b/),
        }),
}

// Call tile

const CALL_TILES = once(() => ({
    plain: draw(CallTile, { name: 'Grace Holm' }),
    marked: draw(CallTile, { name: 'Grace Holm', muted: true, handRaised: true }),
}))
const callTilePieces = (elements: El[]) => ({
    container: byData(elements, 'data-slot', 'call-tile'),
    picture: byData(elements, 'data-slot', 'avatar'),
    name: byData(elements, 'data-slot', 'call-tile-name'),
    icon: elements.find((element) => element.tag === 'svg'),
})
/** The picture's size, a clamp of a least, a share of the tile's width and a most, as drawn: in px and percent. */
const tilePicture = () => {
    const sized = /\bsize-\[clamp\(([\d.]+)rem,([\d.]+)cqw,([\d.]+)rem\)\]/.exec(classesOf(callTilePieces(CALL_TILES().plain).picture))
    return sized === null ? undefined : { least: Number(sized[1]) * 16, share: Number(sized[2]), most: Number(sized[3]) * 16 }
}

const CALL_TILE_ADAPTER: Adapter = {
    wordObjects: { CALL_TILE_WORDS },
    complete: ['CALL_TILE_WORDS'],
    words: { muted: 'CALL_TILE_WORDS.muted', handRaised: 'CALL_TILE_WORDS.handRaised' },
    options: {},
    size: (size, key) => {
        const pieces = callTilePieces(CALL_TILES().marked)
        if (size === 'picture') return skip('a clamp the size reader cannot resolve: its least, share and most are read in more')
        return pieceWhere(key === 'icon' ? pieces.icon : pieces.name)
    },
    paint: (_, name) => pieceWhere(callTilePieces(CALL_TILES().plain)[name as 'container' | 'name']),
    effect: () => skip('a tile states no effects'),
    keys: {},
    more: () => {
        const picture = tilePicture()
        const name = classesOf(callTilePieces(CALL_TILES().plain).name)
        return [
            check(
                'layout.unselectable (anatomy.container: nothing in it is selectable)',
                'select-none',
                /\bselect-none\b/.test(classesOf(callTilePieces(CALL_TILES().plain).container)) ? 'select-none' : 'selectable',
            ),
            check('sizes.picture.width', '64', picture === undefined ? undefined : String(picture.least)),
            check('sizes.picture.height', '64', picture === undefined ? undefined : String(picture.least)),
            ...layoutChecks('call-tile', {
                pictureShare: () => (picture === undefined ? undefined : String(picture.share)),
                pictureMax: () => (picture === undefined ? undefined : String(picture.most)),
                nameInset: () => {
                    const start = resolve([name], [], lengthOf('left-'))
                    return start === resolve([name], [], lengthOf('bottom-')) ? start : undefined
                },
            }),
        ]
    },
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
        } else if (key === 'fontWeight') classes.push(weightClass(value))
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
    const weight = /fontWeight: '([^']+)'/.exec(entry[1])?.[1]
    return [`text-${token}`, weight === undefined ? '' : weightClass(weight)].filter(Boolean).join(' ')
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

/**
 * A code editor drawn in the page with the props, its document `job: nightly-export` unless given, and
 * the keys pressed in turn in its text (each a key and what is held with it), handed to `look` with
 * what it said (`change:<document>`, `run:<document>`) and the editor's box.
 */
function editorHears<T>(
    props: Partial<CodeEditorProps>,
    keys: [string, KeyboardEventInit?][],
    look: (said: string[], box: HTMLElement, events: (KeyboardEvent | undefined)[]) => T,
): T {
    const said: string[] = []
    const all = {
        label: 'Definition',
        value: EDITED,
        onChange: (value: string) => said.push(`change:${value}`),
        ...props,
    }
    return live(createElement(CodeEditor, all), (box) => {
        const events = keys.map(([key, init]) => press(box.querySelector('.cm-content'), key, init))
        return look(said, box, events)
    })
}

/**
 * What an empty editor offering three jobs, which it lists in alphabetical order, says as Ctrl+Space
 * opens its completion list and each key is pressed in turn after: the list `open` on its chosen
 * row, then that row or `shut` after each press, then what it changed.
 */
function completes(keys: [string, KeyboardEventInit?][]): Promise<string> {
    const said: string[] = []
    const props = {
        label: 'Definition',
        value: '',
        onChange: (value: string) => said.push(`change:${value}`),
        completions: [{ label: 'nightly-export' }, { label: 'sync-inventory' }, { label: 'send-digest' }],
    }
    return liveWaiting(createElement(CodeEditor, props), async (box) => {
        const content = box.querySelector('.cm-content')
        const chosen = () => document.querySelector('.cm-tooltip-autocomplete [aria-selected="true"]')?.textContent ?? undefined
        const seen: string[] = []
        press(content, ' ', { ctrlKey: true })
        if (!(await until(() => chosen() !== undefined))) return 'never opened'
        seen.push(`open ${String(chosen())}`)
        // CodeMirror takes no key that moves or puts in until the list has been open its interaction delay.
        await act(() => new Promise((done) => setTimeout(done, 100)))
        for (const [key, init] of keys) {
            press(content, key, init)
            // The list is drawn again on the next frame.
            await act(() => new Promise((done) => setTimeout(done, 20)))
            const now = chosen()
            seen.push(now === undefined ? 'shut' : now)
        }
        return [...seen, ...said].join(' ')
    })
}

/** The document `editorHears` draws unless given one. */
const EDITED = 'job: nightly-export'

/** A key the editor binds through a CodeMirror keymap it installs: the keymap's name in its source. */
const installs = (keymapName: string, when: RegExp) => () =>
    new RegExp(`keymap\\.of\\(\\[?[^\\n]*\\b${keymapName}\\b`).test(CODE_EDITOR) && when.test(CODE_EDITOR)
        ? true
        : `${keymapName} is not installed as the spec says`

/**
 * Whether folding binds each pair of keys, a key that folds and one that unfolds: in a JSON editor
 * with folding, the first folds its object at the caret and the second opens it again.
 */
const foldsOn =
    (...pairs: [string, KeyboardEventInit][][]) =>
    (): true | string => {
        const missing = pairs.flatMap(([fold, unfold]) =>
            editorHears({ language: 'json', folding: true, value: '{\n  "job": "nightly-export"\n}' }, [], (_, box) => {
                const folds = () => box.querySelectorAll('.cm-foldPlaceholder').length
                const content = box.querySelector('.cm-content')
                press(content, ...fold)
                const shut = folds()
                press(content, ...unfold)
                return shut === 1 && folds() === 0 ? [] : [`${fold[0]} ${unfold[0]}`]
            }),
        )
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
        'Mod+Enter (onRun)': () => {
            const ran: string[] = []
            const onRun = (value: string) => void ran.push(`run:${value}`)
            // CodeMirror reads Mod (Ctrl here, not a Mac) when it loads; without onRun the key is its own, a new line.
            const kept = editorHears({ onRun }, [['Enter', { ctrlKey: true }]], (said) => said.length === 0)
            const free = editorHears({}, [['Enter', { ctrlKey: true }]], (said) => said.length === 1)
            return kept && free && ran.join(' ') === 'run:job: nightly-export' ? true : 'Mod-Enter is not bound with onRun'
        },
        'Enter (variant line, with onRun)': () => {
            const ran: string[] = []
            const onRun = (value: string) => void ran.push(`run:${value}`)
            // A line runs on Enter and never breaks; a field breaks its line and runs nothing.
            const line = editorHears({ variant: 'line', onRun }, [['Enter']], (said) => said.join(' '))
            const held = editorHears(
                { variant: 'line' },
                [['Enter']],
                (said, _, [event]) => event?.defaultPrevented === true && said.length === 0,
            )
            const field = editorHears({ onRun }, [['Enter']], (said) => said.length)
            return line === '' && held && field === 1 && ran.join(' ') === 'run:job: nightly-export'
                ? true
                : 'Enter does not run in the line variant'
        },
        'Tab, Shift+Tab (the editor has focus and is not read only)': () => {
            const indents = editorHears({}, [['Tab'], ['Tab', { shiftKey: true }]], (said) => said)
            const readOnly = editorHears(
                { readOnly: true },
                [['Tab']],
                (said, _, [event]) => said.length === 0 && event?.defaultPrevented !== true,
            )
            return indents.length === 2 && indents[0] !== `change:${EDITED}` && indents[1] === `change:${EDITED}` && readOnly
                ? true
                : 'indentWithTab is not installed as the spec says'
        },
        'Mod+Z, Mod+Y, Mod+Shift+Z (the editor has focus)': () => {
            const undo: [string, KeyboardEventInit] = ['z', { ctrlKey: true }]
            // CodeMirror binds Mod+Shift+Z on a Mac and on Linux only, by the platform it reads when it loads, which here is neither.
            const steps = editorHears({}, [['Tab'], undo, ['y', { ctrlKey: true }], undo], (said) =>
                said.map((one) => (one === `change:${EDITED}` ? 'back' : 'on')).join(' '),
            )
            return steps === 'on back on back' ? true : 'historyKeymap is not installed as the spec says'
        },
        'Ctrl+Space (the editor has focus)': async () =>
            (await completes([])) === 'open nightly-export' ? true : 'completionKeymap is not installed as the spec says',
        'ArrowDown, ArrowUp, PageDown, PageUp (the completion list is open)': async () =>
            // A page is as many rows as the list's height holds, which happy-dom does not lay out: the arrows are pressed.
            (await completes([['ArrowDown'], ['ArrowDown'], ['ArrowUp']])) === 'open nightly-export send-digest sync-inventory send-digest'
                ? true
                : 'completionKeymap is not installed as the spec says',
        'Enter (the completion list is open)': async () =>
            (await completes([['ArrowDown'], ['Enter']])) === 'open nightly-export send-digest shut change:send-digest'
                ? true
                : 'completionKeymap is not installed as the spec says',
        'Escape (the completion list is open)': async () =>
            (await completes([['Escape']])) === 'open nightly-export shut' ? true : 'completionKeymap is not installed as the spec says',
        "Tab, Shift+Tab (a snippet's fields are active)": () =>
            /import \{[^}]*\bsnippet\b[^}]*\} from '@codemirror\/autocomplete'/.test(source('components/code/schema.ts'))
                ? true
                : 'no snippet put in by the schema completion',
        'Mod+F (search)': installs('searchKeymap', /searchPanel\(/),
        'F3, Mod+G, Shift+F3, Mod+Shift+G (search)': installs('searchKeymap', /searchPanel\(/),
        'Escape (the find bar has focus)': installs('searchKeymap', /searchPanel\(/),
        'Mod+D, Mod+Shift+L, Mod+Alt+G (search)': installs('searchKeymap', /searchPanel\(/),
        'Ctrl+Shift+[, Ctrl+Shift+] (folding)': foldsOn([
            ['{', { ctrlKey: true, shiftKey: true, keyCode: 219 }],
            ['}', { ctrlKey: true, shiftKey: true, keyCode: 221 }],
        ]),
        'Ctrl+Alt+[, Ctrl+Alt+] (folding)': foldsOn([
            ['[', { ctrlKey: true, altKey: true, keyCode: 219 }],
            [']', { ctrlKey: true, altKey: true, keyCode: 221 }],
        ]),
        'Mod+., Mod+Shift+. (folding)': foldsOn([
            ['.', { ctrlKey: true }],
            ['>', { ctrlKey: true, shiftKey: true, keyCode: 190 }],
        ]),
        'Mod+Alt+., Mod+Alt+Shift+. (folding)': foldsOn([
            ['.', { ctrlKey: true, altKey: true, keyCode: 190 }],
            ['>', { ctrlKey: true, altKey: true, shiftKey: true, keyCode: 190 }],
        ]),
        'Mod+Click (markdown with onFollowLink)': () =>
            editorHears({ language: 'markdown', value: 'See [[harbor]]', onFollowLink: noop }, [], (_, box) => {
                const editor = box.querySelector('.cm-editor')
                const held = () => editor?.classList.contains('cm-follow-held') === true
                press(box.querySelector('.cm-content'), 'Control', { ctrlKey: true })
                const down = held()
                act(() => {
                    box.querySelector('.cm-content')?.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', bubbles: true }))
                })
                return down && !held()
            })
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
/**
 * Whether a date or time field drawn in the page, held closed, asks to open its picker on Alt and
 * Down in its input, and not on Down alone.
 */
function opensOnAltDown<P extends object>(field: ComponentType<P>, props: P): boolean {
    const asked: boolean[] = []
    const held = { ...props, open: false, onOpenChange: (open: boolean) => asked.push(open) }
    live(createElement(field, held), (box) => {
        press(box.querySelector('input'), 'ArrowDown')
        press(box.querySelector('input'), 'ArrowDown', { altKey: true })
    })
    return asked.join() === 'true'
}
/**
 * What a field held open from outside says when the button `option` finds in its popup is pressed,
 * once the popup has drawn it: `value <value>` and `open <open>`, in order.
 */
function pickedFrom<P extends object>(
    field: ComponentType<P>,
    props: Partial<P>,
    option: () => HTMLElement | null | undefined,
): Promise<string> {
    const said: string[] = []
    const held = {
        ...props,
        open: true,
        onOpenChange: (open: boolean) => said.push(`open ${String(open)}`),
        onValueChange: (value: string | null) => said.push(`value ${String(value)}`),
    } as unknown as P
    return liveWaiting(createElement(field, held), async () => {
        if (!(await until(() => option() != null))) return 'nothing to pick'
        act(() => option()?.click())
        return said.join(' ')
    })
}
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
            opensOnAltDown(DateField, { id: 'first-run', label: 'First run', value: '2026-11-09', onValueChange: noop })
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
        'Enter, Space (the calendar is open)': async () =>
            (await pickedFrom(DateField, { id: 'first-run', label: 'First run', value: '2026-11-09', today: '2026-11-09' }, () =>
                document.querySelector<HTMLElement>('button[data-day][aria-label*="November 12th"]'),
            )) === 'value 2026-11-12 open false'
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
/**
 * The tab that has the focus after each key is pressed in turn on the focused tab of a side panel
 * showing its first tab, and the tab shown after them all.
 */
const tabsReached = (keys: string[]) =>
    liveWaiting(createElement(SidePanel, { tabs: PANEL_TABS, defaultActive: 'details' }), async (box) => {
        const tabs = () => [...box.querySelectorAll<HTMLElement>('[role="tab"]')]
        act(() => tabs()[0]?.focus())
        const reached: string[] = []
        for (const key of keys) {
            // Base UI moves the focus a microtask after the key.
            await pressWaiting(document.activeElement, key)
            reached.push(document.activeElement?.getAttribute('role') === 'tab' ? String(document.activeElement.textContent) : 'away')
        }
        const shown = tabs().find((tab) => tab.getAttribute('aria-selected') === 'true')?.textContent
        return `${reached.join(' ')}, ${String(shown)} shown`
    })
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
        'ArrowLeft, ArrowRight, Home, End (a tab has focus)': async () =>
            (await tabsReached(['ArrowRight', 'End', 'ArrowRight', 'ArrowLeft', 'Home', 'ArrowRight'])) ===
            'Log Outputs Details Outputs Details Log, Details shown'
                ? true
                : "the tabs are not Base UI's tablist, which moves focus without showing a tab and wraps",
        'Enter, Space (a tab has focus)': () => (sidePanelPieces().tab?.tag === 'button' ? true : 'a tab is not a native button'),
        'ArrowLeft, ArrowRight, Home, End, Enter (the edge has focus)': () =>
            /<ResizeHandle[\s\S]*?onReset=\{held\.reset\}[\s\S]*?grows=\{-1\}/.test(SIDE_PANEL) &&
            handleKeys() &&
            handleHears('ArrowLeft', { grows: -1 }) === '216'
                ? true
                : "the panel's edge misses an arrow, Home, End or Enter, or does not grow toward the start",
    },
    more: () => {
        const pieces = sidePanelPieces()
        return layoutChecks('side-panel', {
            defaultSize: () => numberIn(SIDE_PANEL, /rest: defaultSize \?\? width \?\? (\d+)/),
            minSize: () => numberIn(SIDE_PANEL, /minSize = (\d+)/),
            maxSize: () => numberIn(SIDE_PANEL, /maxSize = (\d+)/),
            resizeStep: handleStep,
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
            const toggles = liveSecret({ value: 'harbor-key' }, (box) => {
                const kinds = () =>
                    `${String(box.querySelector('input')?.type)}:${String(box.querySelector('[aria-pressed]')?.getAttribute('aria-pressed'))}`
                const toggle = () => act(() => box.querySelector<HTMLButtonElement>('[aria-pressed]')?.click())
                const before = kinds()
                toggle()
                const shown = kinds()
                toggle()
                return [before, shown, kinds()].join(' ') === 'password:false text:true password:false'
            })
            return reveal?.tag === 'button' && reveal.attrs['aria-pressed'] === 'false' && toggles
                ? true
                : 'the reveal is not a native toggle button'
        },
        'Enter, Space (Replace has focus)': () =>
            byLabel(SECRET_FIELDS().sealed, SECRET_REPLACE)?.tag === 'button' &&
            liveSecret({ sealed: true }, (box) => {
                act(() => box.querySelector<HTMLButtonElement>(`button[aria-label="${SECRET_REPLACE}"]`)?.click())
                const input = box.querySelector('input')
                return input !== null && document.activeElement === input
            })
                ? true
                : 'Replace does not open the input and move focus into it',
        'Escape (the input of a sealed field that can be changed has focus)': () => {
            // What Escape in the input does: the values the field hears, then `sealed` once Replace is back with the focus.
            const escape = (props: Partial<SecretFieldProps>) => {
                const said: string[] = []
                const all = { id: 'token', label: 'API token', onChange: (value?: string) => said.push(String(value)), ...props }
                return live(createElement(SecretField, all), (box) => {
                    press(box.querySelector('input'), 'Escape')
                    const replace = box.querySelector(`button[aria-label="${SECRET_REPLACE}"]`)
                    if (box.querySelector('input') === null && document.activeElement === replace) said.push('sealed')
                    return said.join(' ')
                })
            }
            return escape({ sealed: true, defaultReplacing: true }) === 'undefined sealed' &&
                escape({ value: 'harbor-key' }) === '' &&
                escape({ sealed: true, defaultReplacing: true, readOnly: true }) === ''
                ? true
                : 'Escape does not seal the field again'
        },
        'Enter, Space (Cancel has focus)': () =>
            byText(SECRET_FIELDS().replacing, 'button', SECRET_FIELD_WORDS.cancel)?.tag === 'button' &&
            liveSecret({ sealed: true, defaultReplacing: true }, (box, said) => {
                const cancel = [...box.querySelectorAll('button')].find((one) => one.textContent === SECRET_FIELD_WORDS.cancel)
                act(() => cancel?.click())
                const replace = box.querySelector(`button[aria-label="${SECRET_REPLACE}"]`)
                return box.querySelector('input') === null && document.activeElement === replace && said.join(' ') === 'undefined'
            })
                ? true
                : 'Cancel does not seal the field again',
    },
}

/** A secret field drawn in the page with the props, handed to `look` with the values it has heard. */
const liveSecret = <T>(props: Partial<SecretFieldProps>, look: (box: HTMLElement, said: string[]) => T) => {
    const said: string[] = []
    const all = { id: 'token', label: 'API token', onChange: (value?: string) => said.push(String(value)), ...props }
    return live(createElement(SecretField, all), (box) => look(box, said))
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
/** What a yes-no field answering `value`, drawn in the page, hands out when its button with the words is pressed. */
const answers = (value: boolean | null, words: string) => {
    const said: string[] = []
    const props = { id: 'notify', label: 'Notify on failure', value, onValueChange: (next: boolean | null) => said.push(String(next)) }
    return live(createElement(YesNoField, props), (box) => {
        act(() => [...box.querySelectorAll('button')].find((one) => one.textContent === words)?.click())
        return said.join(' ')
    })
}
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
            answers(null, YES_NO_FIELD_WORDS.yes) === 'true' &&
            answers(null, YES_NO_FIELD_WORDS.no) === 'false' &&
            answers(true, YES_NO_FIELD_WORDS.no) === 'false'
                ? true
                : 'an option is not a native button that answers with it',
        'Enter, Space (Clear has focus)': () =>
            byText(YES_NO_FIELDS().answered, 'button', YES_NO_FIELD_WORDS.clear)?.tag === 'button' &&
            answers(true, YES_NO_FIELD_WORDS.clear) === 'null' &&
            answers(false, YES_NO_FIELD_WORDS.clear) === 'null'
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

/** A time field whose list offers four times, 09:00 to 10:30. */
const TIMES_OFFERED = { id: 'starts', label: 'Starts', value: '09:30', min: '09:00', max: '10:30' }
/** The time that has the focus in an open list of `TIMES_OFFERED` after each key is pressed in turn, from the chosen time. */
const timesReached = (keys: string[]) =>
    live(createElement(TimeField, { ...TIMES_OFFERED, onValueChange: noop, open: true, onOpenChange: noop }), () =>
        keys
            .map((key) => {
                press(document.activeElement, key)
                return document.activeElement?.getAttribute('role') === 'option' ? document.activeElement.textContent : 'away'
            })
            .join(' '),
    )

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
            opensOnAltDown(TimeField, { id: 'starts', label: 'Starts', value: '14:30', onValueChange: noop })
                ? true
                : 'Alt+ArrowDown does not open the list',
        'Enter, Space (the pick or the clear button has focus)': () => {
            const { plain } = TIME_FIELDS()
            return byLabel(plain, TIME_FIELD_WORDS.clear)?.tag === 'button' && byLabel(plain, TIME_FIELD_WORDS.pick)?.tag === 'button'
                ? true
                : 'the clear or the pick button is not a native button'
        },
        'ArrowUp, ArrowDown (the list is open)': () =>
            timesReached(['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']) ===
            '09:00 09:00 09:30 10:00 10:30 10:30'
                ? true
                : 'the arrows do not move between the times, stopping at the ends',
        'Home, End (the list is open)': () =>
            timesReached(['End', 'Home']) === '10:30 09:00' ? true : 'Home and End do not go to the first and the last time',
        'Enter, Space (the list is open)': async () =>
            (await pickedFrom(TimeField, TIMES_OFFERED, () => [...document.querySelectorAll<HTMLElement>('[role="option"]')][2])) ===
                'value 10:00 open false' &&
            (await pickedFrom(TimeField, { ...TIMES_OFFERED, value: '09:30:00', seconds: true }, () =>
                [...document.querySelectorAll<HTMLElement>('[role="option"]')].at(-1),
            )) === 'value 10:30:00 open false'
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
/** Whether choosing Other in a period picker drawn in the page, opened by a press on its trigger, opens the typed input. */
const otherOpensTyping = () =>
    liveWaiting(
        createElement(PeriodPicker, { type: 'monthly', value: '202610', onValueChange: noop, today: '2026-11-08' }),
        async (box) => {
            const trigger = box.querySelector<HTMLElement>('[role="combobox"]')
            const other = () =>
                [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((one) => one.textContent === PERIOD_PICKER_WORDS.other)
            const closed = box.querySelector(`input[aria-label="${PERIOD_PICKER_WORDS.typed}"]`) === null
            await act(async () => {
                trigger?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }))
                trigger?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
                trigger?.click()
            })
            if (!(await until(() => other() !== undefined))) return false
            await act(async () => {
                other()?.click()
            })
            return closed && (await until(() => box.querySelector(`input[aria-label="${PERIOD_PICKER_WORDS.typed}"]`) !== null))
        },
    )
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
        'Enter, Space (a row is highlighted)': async () =>
            (await otherOpensTyping()) ? true : 'Other period does not open the typed input',
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
    trailPath: literalAfter(TREE, '<span ref={trailRef}', 'className='),
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
/** Sites for a tree drawn in the page: Europe holds Norway, which holds Bergen, and Asia stands after it. */
const SITES: TreeNode[] = [
    { id: 'europe', label: 'Europe', children: [{ id: 'norway', label: 'Norway', children: [{ id: 'bergen', label: 'Bergen' }] }] },
    { id: 'asia', label: 'Asia' },
]
/** A tree of the sites drawn in the page, handed to `look` with a way to find a row by its node's id. */
const liveTree = <T>(props: Partial<TreeProps>, look: (row: (id: string) => HTMLElement | null) => T) =>
    live(createElement(Tree, { nodes: SITES, label: 'Sites', selection: 'single', ...props }), (box) =>
        look((id) => box.querySelector<HTMLElement>(`[role="treeitem"][data-id="${id}"]`)),
    )
/** Whether a key on a tree's first row chooses it. */
const treeChooses = (key: string) => {
    const chosen: string[][] = []
    liveTree({ onSelect: (ids) => chosen.push(ids) }, (row) => press(row('europe'), key))
    return chosen.map((ids) => ids.join()).join(' ') === 'europe'
}

/** What an open tree select, one choice or `multiple`, says when Enter chooses its first row: `value <ids>` and `open <open>`. */
const treeSelectChooses = (multiple: boolean) => {
    const said: string[] = []
    const props = {
        nodes: REGIONS,
        value: [],
        multiple,
        onValueChange: (ids: string[]) => said.push(`value ${ids.join()}`),
        defaultOpen: true,
        onOpenChange: (open: boolean) => said.push(`open ${String(open)}`),
    }
    return live(createElement(TreeSelect, props), () => {
        press(document.querySelector('[role="treeitem"][data-id="europe"]'), 'Enter')
        return said.join(', ')
    })
}

const TREE_SELECT_ADAPTER: Adapter = {
    wordObjects: { TREE_SELECT_WORDS },
    complete: ['TREE_SELECT_WORDS'],
    words: {
        placeholder: 'TREE_SELECT_WORDS.placeholder',
        search: 'TREE_SELECT_WORDS.search',
        clear: 'TREE_SELECT_WORDS.clear',
        empty: 'TREE_SELECT_WORDS.empty',
        emptyBranch: 'TREE_SELECT_WORDS.emptyBranch',
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
        'ArrowDown, ArrowUp (a row has focus)': () =>
            liveTree({}, (row) => {
                press(row('europe'), 'ArrowDown')
                const down = document.activeElement === row('asia')
                press(row('asia'), 'ArrowUp')
                return down && document.activeElement === row('europe')
            })
                ? true
                : 'the tree does not move by ArrowDown and ArrowUp',
        'Home, End (a row has focus)': () =>
            liveTree({}, (row) => {
                press(row('europe'), 'End')
                const end = document.activeElement === row('asia')
                press(row('asia'), 'Home')
                return end && document.activeElement === row('europe')
            })
                ? true
                : 'the tree does not move by Home and End',
        'ArrowRight (a row has focus)': () =>
            liveTree({}, (row) => {
                press(row('europe'), 'ArrowRight')
                return row('europe')?.getAttribute('aria-expanded') === 'true' && row('norway') !== null
            })
                ? true
                : 'ArrowRight does not open a branch',
        'ArrowLeft (a row has focus)': () =>
            liveTree({ defaultExpanded: ['europe'] }, (row) => {
                press(row('europe'), 'ArrowLeft')
                return row('europe')?.getAttribute('aria-expanded') === 'false' && row('norway') === null
            })
                ? true
                : 'ArrowLeft does not close a branch',
        'Enter, Space (a row has focus)': () =>
            treeChooses('Enter') &&
            treeChooses(' ') &&
            treeSelectChooses(false) === 'value europe, open false' &&
            treeSelectChooses(true) === 'value europe'
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
/** What an open prompt drawn in the page submits when Enter is pressed in its field: the text, or nothing. */
function promptSubmits(props: Partial<PromptDialogProps>, init: KeyboardEventInit = {}): string {
    const sent: string[] = []
    const all: PromptDialogProps = {
        open: true,
        onOpenChange: noop,
        title: 'New project',
        label: 'Name',
        onSubmit: (text) => void sent.push(text),
        ...props,
    }
    live(createElement(PromptDialog, all), () => press(document.querySelector('[role="dialog"] input'), 'Enter', init))
    return sent.join(' ')
}

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
            promptSubmits({ defaultValue: 'harbor' }) === 'harbor' &&
            promptSubmits({}) === '' &&
            promptSubmits({ defaultValue: 'harbor', busy: true }) === '' &&
            promptSubmits({ defaultValue: 'harbor' }, { isComposing: true }) === ''
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

// Chip

const CHIP = source('components/Chip.tsx')
/** The values of one of the chip's exported union types. */
const chipUnion = (name: string) =>
    [...(new RegExp(`export type ${name} = ([^\\n]+)`).exec(CHIP)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1])
const drawChip = (props: Partial<ChipProps>) => draw(Chip, { children: 'harbor', ...props } as ChipProps)
/** Each piece of a drawn chip, by its name in the spec. */
const chipPieces = (elements: El[]) => {
    const container = elements.find((element) => element.attrs['data-slot'] === 'chip')
    const remove = elements.find((element) => element.attrs['data-slot'] === 'chip-remove')
    const face = elements.find((element) => element.parent === container && element !== remove)
    return { container, face, remove }
}
/** A chip drawn in the page inside a row that counts the presses and keys reaching it. */
const liveChip = <T>(props: Partial<ChipProps>, look: (box: HTMLElement, reached: () => number) => T) => {
    let reached = 0
    const row = createElement(
        'div',
        { onClick: () => (reached += 1), onKeyDown: () => (reached += 1) },
        createElement(Chip, { children: 'harbor', ...props } as ChipProps),
    )
    return live(row, (box) => look(box, () => reached))
}

const CHIP_ADAPTER: Adapter = {
    wordObjects: { CHIP_WORDS },
    complete: ['CHIP_WORDS'],
    words: { remove: 'CHIP_WORDS.remove', newTab: 'CHIP_WORDS.newTab' },
    options: {
        tone: chipUnion('ChipTone'),
        hue: [
            ...(/export type ChipHue = ([^\n]+)/.exec(CHIP)?.[1] ?? '')
                .split('|')
                .flatMap((one) => (/^\s*(\d)\s*$/.exec(one) ?? []).slice(1)),
            ...[...(/export type KindColor = ([^\n]+)/.exec(KIND_SOURCE)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]),
        ],
        size: chipUnion('ChipSize'),
        menuAlign: chipUnion('ChipMenuAlign'),
    },
    size: (size, key) => {
        if (size === 'remove') return pieceWhere(chipPieces(drawChip({ onRemove: () => undefined })).remove)
        const pieces = chipPieces(drawChip({ size: size as ChipProps['size'] }))
        return pieceWhere(key === 'padX' || key === 'gap' ? pieces.face : pieces.container)
    },
    paint: (group, name, state) => {
        const on = state === 'hover' ? ['hover'] : state === 'focus' ? ['focus-visible'] : state === 'selected' ? ['data-selected'] : []
        if (group === 'pieces') {
            const pieces = chipPieces(drawChip({ onSelect: () => undefined, onRemove: () => undefined }))
            return pieceWhere(name === 'remove' ? pieces.remove : pieces.face, on)
        }
        const hue = /^hue-(\w+)$/.exec(name)?.[1]
        const props: Partial<ChipProps> =
            hue === undefined ? { tone: name as ChipProps['tone'] } : { hue: (/^\d$/.test(hue) ? Number(hue) : hue) as ChipProps['hue'] }
        const selected = state === 'selected' ? { onSelect: () => undefined, selected: true } : {}
        return pieceWhere(chipPieces(drawChip({ ...props, ...selected })).container, on)
    },
    effect: (state) =>
        state === 'focus' ? pieceWhere(chipPieces(drawChip({ onSelect: () => undefined })).face, ['focus-visible']) : undefined,
    keys: {
        Tab: () => {
            const pressable = chipPieces(drawChip({ onSelect: () => undefined, onRemove: () => undefined }))
            const plain = drawChip({})
            if (pressable.face?.tag !== 'button' || !focusable(pressable.face))
                return 'the face of a chip with onSelect is not a button in the tab order'
            if (pressable.remove?.tag !== 'button' || !focusable(pressable.remove)) return 'the remove button is not its own stop'
            if (chipPieces(drawChip({ href: '#/projects/harbor' })).face?.tag !== 'a') return 'the face of a chip with href is not a link'
            return plain.some((element) => element.tag === 'button' || element.tag === 'a') ? 'a plain chip takes focus' : true
        },
        'Enter, Space (the face has focus)': () => {
            let selected = 0
            return liveChip({ onSelect: () => (selected += 1) }, (box, reached) => {
                const face = box.querySelector<HTMLElement>('[data-slot="chip-select"]')
                if (face?.tagName !== 'BUTTON') return 'the face is not a native button, which Enter and Space press'
                press(face, 'Enter')
                press(face, ' ')
                act(() => face.click())
                return selected === 1 && reached() === 0 ? true : 'a press of the face reaches the row around the chip'
            })
        },
        'Enter, Space (the remove button has focus)': () => {
            let removed = 0
            return liveChip({ onRemove: () => (removed += 1) }, (box, reached) => {
                const button = box.querySelector<HTMLElement>('[data-slot="chip-remove"]')
                if (button?.tagName !== 'BUTTON') return 'the remove button is not a native button'
                press(button, 'Enter')
                press(button, ' ')
                act(() => button.click())
                return removed === 1 && reached() === 0 ? true : 'a press of the remove button reaches the row around the chip'
            })
        },
        "ArrowDown (the face is a menu's trigger)": () => {
            const face = chipPieces(drawChip({ menu: [{ label: 'Filter', onSelect: () => undefined }] })).face
            return face?.attrs['data-slot'] === 'chip-select' && standInOpens('ArrowDown', true)
                ? true
                : "the face is not parts/dropdown-menu's trigger"
        },
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
/**
 * Each piece of a server menu, by its name in the spec. The menu opens only once Base UI's menu has
 * loaded, and loading it in this process turns every later server drawing of a menu into Base UI's
 * own parts, which the server cannot draw: the menu's and its info's classes are read from the source.
 */
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

// Map parts

/**
 * A map as far as the overlays and layers use one, without maplibre's WebGL, which happy-dom has
 * none of: it keeps the sources, layers and images it is given, answers the camera with a plain
 * projection (a degree is 100 pixels, north up) and hands out the events it is told to fire. A
 * source made with `cluster` also holds one cluster of all its points, which is how a count is drawn.
 */
interface FakeLayer {
    id: string
    type: string
    source?: string
    filter?: unknown
    layout?: Record<string, unknown>
    paint?: Record<string, unknown>
}

interface FakeMap {
    map: MapContextValue['map']
    fire: (type: string, event?: object) => void
    layers: Map<string, FakeLayer>
    sources: Map<string, { data: FeatureCollection; cluster?: boolean; clusterRadius?: number }>
    images: Map<string, { pixelRatio?: number; sdf?: boolean; width?: number }>
    calls: { method: string; options: Record<string, unknown> }[]
}

function fakeMap(): FakeMap {
    const handlers = new Map<string, Set<(event: object) => void>>()
    const layers: FakeMap['layers'] = new Map()
    const sources: FakeMap['sources'] = new Map()
    const images: FakeMap['images'] = new Map()
    const calls: FakeMap['calls'] = []
    const container = document.createElement('div')
    let bearing = 0
    const matches = (filter: unknown, properties: Record<string, unknown>): boolean => {
        if (!Array.isArray(filter)) return true
        if (filter[0] === '!') return !matches(filter[1], properties)
        if (filter[0] === 'has') return properties[filter[1] as string] !== undefined
        return true
    }
    const map = {
        on: (type: string, handler: (event: object) => void) => {
            const set = handlers.get(type) ?? new Set()
            set.add(handler)
            handlers.set(type, set)
        },
        off: (type: string, handler: (event: object) => void) => handlers.get(type)?.delete(handler),
        getBearing: () => bearing,
        getZoom: () => 6,
        getCenter: () => ({ lng: 0, lat: 0 }),
        getContainer: () => container,
        project: ([lng, lat]: [number, number]) => ({ x: lng * 100, y: -lat * 100 }),
        unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: -y / 100 }),
        easeTo: (options: Record<string, unknown>) => {
            calls.push({ method: 'easeTo', options })
            if (typeof options.bearing === 'number') bearing = options.bearing
        },
        flyTo: (options: Record<string, unknown>) => calls.push({ method: 'flyTo', options }),
        addSource: (id: string, spec: { data: FeatureCollection; cluster?: boolean; clusterRadius?: number }) =>
            sources.set(id, { ...spec }),
        getSource: (id: string) => {
            const held = sources.get(id)
            if (held === undefined) return undefined
            return {
                setData: (data: FeatureCollection) => (held.data = data),
                getClusterExpansionZoom: () => Promise.resolve(8),
            }
        },
        removeSource: (id: string) => sources.delete(id),
        addLayer: (spec: FakeLayer) => layers.set(spec.id, structuredClone(spec)),
        getLayer: (id: string) => layers.get(id),
        removeLayer: (id: string) => layers.delete(id),
        getLayersOrder: () => [...layers.keys()],
        setPaintProperty: (id: string, key: string, value: unknown) => {
            const layer = layers.get(id)
            if (layer !== undefined) layer.paint = { ...layer.paint, [key]: value }
        },
        setLayoutProperty: (id: string, key: string, value: unknown) => {
            const layer = layers.get(id)
            if (layer !== undefined) layer.layout = { ...layer.layout, [key]: value }
        },
        hasImage: (name: string) => images.has(name),
        addImage: (name: string, image: { width?: number }, options: { pixelRatio?: number; sdf?: boolean }) =>
            images.set(name, { ...options, width: image.width }),
        updateImage: () => undefined,
        setFeatureState: () => undefined,
        queryRenderedFeatures: ({ layers: wanted }: { layers: string[] }) =>
            wanted.flatMap((id) => {
                const layer = layers.get(id)
                const held = layer?.source === undefined ? undefined : sources.get(layer.source)
                if (layer === undefined || held === undefined) return []
                const points = held.data.features.filter((feature) => feature.geometry.type === 'Point')
                const gathered =
                    held.cluster === true && points.length > 0
                        ? [{ ...points[0], properties: { cluster_id: 1, point_count: points.length, hostile: 0 } }]
                        : []
                return [...points, ...gathered].filter((feature) => matches(layer.filter, feature.properties ?? {}))
            }),
    }
    return {
        map: map as unknown as MapContextValue['map'],
        fire: (type, event = {}) =>
            act(() => {
                for (const handler of handlers.get(type) ?? []) handler(event)
            }),
        layers,
        sources,
        images,
        calls,
    }
}

/** What a fake map holds now, kept past the part's unmounting, which takes its layers down. */
const kept = (fake: FakeMap): FakeMap => ({
    ...fake,
    layers: new Map(fake.layers),
    sources: new Map(fake.sources),
    images: new Map(fake.images),
})

/** A part drawn in the page inside a map's context over a fake map, with the map's corners and overlay in the box handed to `look`. */
function liveMap<T>(part: ReactElement, look: (box: HTMLElement, fake: FakeMap) => T, context: Partial<MapContextValue> = {}): T {
    const fake = fakeMap()
    const corners: MapContextValue['corners'] = {
        'top-left': document.createElement('div'),
        'top-right': document.createElement('div'),
        'bottom-left': document.createElement('div'),
        'bottom-right': document.createElement('div'),
    }
    const overlay = document.createElement('div')
    const scope = document.createElement('div')
    scope.append(...Object.values(corners), overlay)
    document.body.append(scope)
    const value: MapContextValue = {
        map: fake.map,
        scope,
        overlay,
        corners,
        dark: false,
        reading: 0,
        selected: null,
        select: () => undefined,
        register: () => () => undefined,
        holdCamera: () => undefined,
        takeClicks: () => undefined,
        labels: labelRegistry(),
        ...context,
    }
    try {
        return live(createElement(TooltipProvider, null, createElement(MapContext.Provider, { value }, part)), () => look(scope, fake))
    } finally {
        scope.remove()
    }
}

/** A part drawn over a fake map, its corners and overlay read as a server drawing is, after `then` has done what it does to the map. */
const drawMap = (part: ReactElement, then?: (fake: FakeMap) => void) =>
    liveMap(part, (box, fake) => {
        then?.(fake)
        return parse(box.innerHTML)
    })

const MAPS_SOURCE = (path: string) => readFileSync(join(ROOT, 'packages', 'maps', 'src', path), 'utf8')
/** The values of a union type a map module exports. */
const mapUnion = (path: string, name: string) =>
    [...(new RegExp(`export type ${name} = ([^\\n]+)`).exec(MAPS_SOURCE(path))?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1])
const MAP_CORNERS = mapUnion('context.ts', 'MapCorner')
const MAP_UNITS = Object.keys(UNIT_SYMBOLS)

/**
 * What a maplibre expression gives for a feature in a feature state: the operators the map layers
 * paint with (case, match, step, get, has, feature-state, concat and plain arithmetic), and a
 * straight interpolation by the zoom the state gives.
 */
function evaluate(expression: unknown, properties: Record<string, unknown>, state: Record<string, unknown> = {}): unknown {
    if (!Array.isArray(expression)) return expression
    const [op, ...args] = expression as [string, ...unknown[]]
    const at = (value: unknown) => evaluate(value, properties, state)
    switch (op) {
        case 'case': {
            for (let index = 0; index + 1 < args.length; index += 2) if (at(args[index]) === true) return at(args[index + 1])
            return at(args.at(-1))
        }
        case 'match': {
            const input = at(args[0])
            for (let index = 1; index + 1 < args.length; index += 2) if (args[index] === input) return at(args[index + 1])
            return at(args.at(-1))
        }
        case 'step': {
            const input = Number(at(args[0]))
            let value = at(args[1])
            for (let index = 2; index + 1 < args.length; index += 2) if (input >= Number(args[index])) value = at(args[index + 1])
            return value
        }
        case 'get':
            return properties[args[0] as string]
        case 'has':
            return properties[args[0] as string] !== undefined
        case 'feature-state':
            return state[args[0] as string]
        case 'boolean': {
            const value = at(args[0])
            return typeof value === 'boolean' ? value : at(args[1])
        }
        case 'to-number':
            return Number(at(args[0]) ?? at(args[1]))
        case '!':
            return at(args[0]) !== true
        case '>':
            return Number(at(args[0])) > Number(at(args[1]))
        case '==':
            return at(args[0]) === at(args[1])
        case '*':
            return args.reduce<number>((product, value) => product * Number(at(value)), 1)
        case '+':
            return args.reduce<number>((sum, value) => sum + Number(at(value)), 0)
        case 'concat':
            return args.map((value) => String(at(value))).join('')
        case '^':
            return Number(at(args[0])) ** Number(at(args[1]))
        case 'zoom':
            return state.zoom
        case 'interpolate': {
            // Between the stops either side of the input, and held at the first and the last.
            const input = Number(at(args[1]))
            const stops = args.slice(2)
            for (let index = 0; index + 3 < stops.length; index += 2) {
                const [from, to] = [Number(stops[index]), Number(stops[index + 2])]
                if (input > to) continue
                const [low, high] = [Number(at(stops[index + 1])), Number(at(stops[index + 3]))]
                return input <= from ? low : low + ((input - from) / (to - from)) * (high - low)
            }
            return at(stops.at(-1))
        }
        default:
            return undefined
    }
}

/**
 * A color a map layer paints, in the contract's grammar: `var(--card)` is card, a color-mix in
 * oklab is `mix-oklab()`, an opacity of 0 is none and one below 1 is its alpha.
 */
function mapColor(value: unknown, opacity: unknown = 1): string {
    if (Number(opacity) === 0) return 'none'
    const text = String(value)
    const token = /^var\(--([a-z0-9-]+)\)$/.exec(text)?.[1]
    const mix = /^color-mix\(in oklab, var\(--([a-z0-9-]+)\) (\d+)%, var\(--([a-z0-9-]+)\)\)$/.exec(text)
    const named = token ?? (mix === null ? text : `mix-oklab(${mix[1]} ${mix[2]}%, ${mix[3]})`)
    return Number(opacity) < 1 ? `${named}/${String(Math.round(Number(opacity) * 100))}` : named
}

/** Checks of a piece the map paints on its canvas, against the spec's paint of it in a state. */
function mapPaintChecks(id: string, piece: string, state: string, found: Record<string, string | undefined>): Check[] {
    const paint = SPECS.get(id)?.pieces?.[piece]?.[state] as Record<string, unknown> | undefined
    return Object.entries(found).flatMap(([key, value]) =>
        paint?.[key] === undefined ? [] : [check(`pieces.${piece}.${state}.${key}`, String(paint[key]), value)],
    )
}

/** The first button drawn among a map's: the ruler's or the compass's. */
const mapButton = (elements: El[]) => elements.find((element) => element.tag === 'button')

/** Puts a text in a field as typing does, so React hears it. */
function type(input: HTMLInputElement, text: string) {
    act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

// Track layer

const WATCH_TRACKS: Track[] = [
    { id: 'pilot', position: [5, 60], heading: 90, affiliation: 'friend', kind: 'vessel', label: 'Pilot 4', trail: [[4.8, 60]] },
    { id: 'survey', position: [5.2, 60], affiliation: 'unknown', kind: 'aircraft', label: 'Survey 2' },
]
/** The track layer over a fake map: its style layers and sources, and the labels and counts it writes in the overlay. */
const drawTracks = (props: Partial<TrackLayerProps>, selected: string | null = null) =>
    liveMap(
        createElement(TrackLayer, { id: 'watch', tracks: WATCH_TRACKS, transition: 0, ...props }),
        (box, fake) => {
            // The labels are measured a frame after the map draws.
            act(() => vi.advanceTimersByTime(50))
            return { fake: kept(fake), elements: parse(box.innerHTML) }
        },
        { selected },
    )
const TRACKS = once(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
        return { plain: drawTracks({}), selected: drawTracks({}, 'pilot'), clustered: drawTracks({ cluster: true }) }
    } finally {
        vi.useRealTimers()
    }
})
const trackLabel = (elements: El[], text: string) => elements.find((element) => element.tag === 'span' && element.text === text)
const trackCount = (elements: El[]) => elements.find((element) => element.tag === 'span' && /^\d+$/.test(element.text))
const trackLayerOf = (fake: FakeMap, suffix: string) => fake.layers.get(`wui-watch${suffix}`)

const TRACK_LAYER_ADAPTER: Adapter = {
    wordObjects: { TRACK_WORDS },
    complete: ['TRACK_WORDS'],
    words: Object.fromEntries(Object.keys(TRACK_WORDS).map((key) => [key, `TRACK_WORDS.${key}`])),
    options: {},
    size: (size) => {
        if (size === 'symbol') return skip("a maplibre icon, not a box: its size is read from the symbol layer's icon-size in more")
        return pieceWhere(trackLabel(TRACKS().plain.elements, 'Survey 2'))
    },
    paint: (_, name, state) => {
        if (name !== 'label') return skip(`maplibre paints the ${name} on its canvas: read from its style layer in more`)
        return state === 'selected'
            ? pieceWhere(trackLabel(TRACKS().selected.elements, 'Pilot 4'))
            : pieceWhere(trackLabel(TRACKS().plain.elements, 'Survey 2'))
    },
    effect: () => skip('a track layer states no effects'),
    keys: {},
    more: () => {
        const { plain, selected, clustered } = TRACKS()
        const symbol = trackLayerOf(plain.fake, '-symbol')
        const ring = trackLayerOf(plain.fake, '-ring')
        const trail = trackLayerOf(plain.fake, '-trail-line')
        const glow = trackLayerOf(plain.fake, '-glow')
        const halo = trackLayerOf(plain.fake, '-halo')
        const pulse = trackLayerOf(plain.fake, '-pulse')
        const cluster = trackLayerOf(clustered.fake, '-cluster')
        const unknown = { affiliation: 'unknown', kind: 'vessel' }
        const image = plain.fake.images.get('wui-track-vessel')
        const symbolSize =
            symbol === undefined || image === undefined
                ? undefined
                : // The symbols scale with the zoom, and are their size at zoom 6.
                  String((Number(evaluate(symbol.layout?.['icon-size'], {}, { zoom: 6 })) * 48) / Number(image.pixelRatio ?? 1))
        const ringIn = (state: Record<string, unknown>) => ({
            ground: mapColor(
                evaluate(ring?.paint?.['circle-color'], unknown, state),
                evaluate(ring?.paint?.['circle-opacity'], unknown, state),
            ),
            edge: mapColor(
                evaluate(ring?.paint?.['circle-stroke-color'], unknown, state),
                evaluate(ring?.paint?.['circle-stroke-opacity'], unknown, state),
            ),
        })
        const label = trackLabel(plain.elements, 'Survey 2')
        const left = /left:\s*([\d.]+)px/.exec(label?.attrs.style ?? '')?.[1]
        const count = trackCount(clustered.elements)
        const clusterPaint = SPECS.get('track-layer')?.pieces?.cluster?.rest
        const hostile = { point_count: 3, hostile: 1 }
        return [
            check('sizes.symbol.width', '24', symbolSize),
            check('sizes.symbol.height', '24', symbolSize),
            check(
                'sizes.label.offset (0.75 of the size plus 4 right of the track)',
                String(Math.round(24 * 0.75) + 4),
                left === undefined ? undefined : String(Number(left) - 520),
            ),
            check(
                "states.selected (a label covering another track's symbol is left out, but never the selected track's)",
                'left out at rest, drawn when selected',
                `${trackLabel(plain.elements, 'Pilot 4') === undefined ? 'left out' : 'drawn'} at rest, ${trackLabel(selected.elements, 'Pilot 4') === undefined ? 'left out' : 'drawn'} when selected`,
            ),
            ...mapPaintChecks('track-layer', 'symbol', 'rest', {
                ground: mapColor(evaluate(symbol?.paint?.['icon-color'], unknown)),
                edge: mapColor(symbol?.paint?.['icon-halo-color']),
            }),
            ...mapPaintChecks('track-layer', 'trail', 'rest', { ink: mapColor(evaluate(trail?.paint?.['line-color'], unknown)) }),
            // The light around a track, once the spec paints it: the map drawn here is a light one.
            ...mapPaintChecks('track-layer', 'glow', 'rest', {
                ground: mapColor(evaluate(glow?.paint?.['circle-color'], unknown)),
                opacity: String(glow?.paint?.['circle-opacity']),
            }),
            ...mapPaintChecks('track-layer', 'halo', 'selected', { ground: mapColor(halo?.paint?.['circle-color']) }),
            ...mapPaintChecks('track-layer', 'pulse', 'rest', { ground: mapColor(pulse?.paint?.['circle-color']) }),
            ...mapPaintChecks('track-layer', 'ring', 'rest', ringIn({})),
            ...mapPaintChecks('track-layer', 'ring', 'hover', { edge: ringIn({ hover: true }).edge.replace(/\/80$/, '') }),
            ...mapPaintChecks('track-layer', 'ring', 'selected', ringIn({ selected: true })),
            ...mapPaintChecks('track-layer', 'cluster', 'rest', {
                ground: mapColor(evaluate(cluster?.paint?.['circle-color'], { point_count: 3, hostile: 0 })),
                edge: mapColor(evaluate(cluster?.paint?.['circle-stroke-color'], { point_count: 3, hostile: 0 })),
            }),
            ...(count === undefined || clusterPaint === undefined
                ? [check('pieces.cluster.rest.ink', 'a count drawn', 'none')]
                : paintChecks(
                      'pieces.cluster.rest',
                      { ink: clusterPaint.ink, text: clusterPaint.text, weight: clusterPaint.weight },
                      { layers: [classesOf(count)], on: [], around: ancestors(count) },
                  )),
            check(
                'pieces.cluster.rest.edge (a cluster holding a hostile track: 3 in track-hostile)',
                'track-hostile 3',
                `${mapColor(evaluate(cluster?.paint?.['circle-stroke-color'], hostile))} ${String(evaluate(cluster?.paint?.['circle-stroke-width'], hostile))}`,
            ),
            ...layoutChecks('track-layer', {
                trailWidth: () => (trail === undefined ? undefined : String(trail.paint?.['line-width'])),
                haloWidth: () => (symbol === undefined ? undefined : String(symbol.paint?.['icon-halo-width'])),
                clusterRadius: () => {
                    const held = clustered.fake.sources.get('wui-watch')
                    return held?.clusterRadius === undefined ? undefined : String(held.clusterRadius)
                },
            }),
        ]
    },
}

// Map ruler

const RULER_POINTS: [LngLat, LngLat] = [
    [5.32, 60.39],
    [4.6, 60.7],
]
const RULERS = once(() => ({
    rest: drawMap(createElement(MapRuler, {})),
    on: drawMap(createElement(MapRuler, { defaultActive: true, defaultPoints: RULER_POINTS })),
}))
const rulerChip = (elements: El[]) => elements.find((element) => element.attrs.role === 'status')

const MAP_RULER_ADAPTER: Adapter = {
    wordObjects: { MAP_RULER_WORDS },
    complete: ['MAP_RULER_WORDS'],
    words: {
        measure: 'MAP_RULER_WORDS.measure',
        measured: [
            'MAP_RULER_WORDS.measured',
            (said: (distance: string, bearing: string) => string, fill) => said(String(fill.distance), String(fill.bearing)),
        ],
    },
    options: { unit: MAP_UNITS, corner: MAP_CORNERS },
    size: (size) => pieceWhere(size === 'button' ? mapButton(RULERS().rest) : rulerChip(RULERS().on)),
    paint: (_, name, state) => {
        if (name === 'line') return skip("maplibre paints the line on its canvas: read from the ruler's style layers in more")
        if (name === 'chip') return pieceWhere(rulerChip(RULERS().on))
        return pieceWhere(mapButton(state === 'on' ? RULERS().on : RULERS().rest), state === 'hover' ? ['hover'] : [])
    },
    effect: () => skip('a ruler states no effects'),
    keys: {
        'Escape (the ruler is on and the map has focus)': () => {
            const measured: unknown[] = []
            return liveMap(
                createElement(MapRuler, { defaultActive: true, defaultPoints: RULER_POINTS, onMeasure: (one) => measured.push(one) }),
                (box) => {
                    const pressed = () => box.querySelector('button')?.getAttribute('aria-pressed')
                    if (box.querySelector('[role="status"]') === null) return 'no measurement drawn to clear'
                    press(box, 'Escape')
                    if (box.querySelector('[role="status"]') !== null || measured.at(-1) !== null) return 'Escape leaves the measurement'
                    if (pressed() !== 'true') return 'Escape with a measurement turns the ruler off'
                    press(box, 'Escape')
                    return pressed() === 'false' ? true : 'Escape with nothing measured leaves the ruler on'
                },
            )
        },
    },
    more: () => {
        const fake = liveMap(createElement(MapRuler, { defaultActive: true, defaultPoints: RULER_POINTS }), (_, made) => kept(made))
        const find = (suffix: string) => [...fake.layers.values()].find((layer) => layer.id.endsWith(suffix))
        const casing = find('-casing')
        const ink = find('-line')
        const ends = find('-ends')
        const chip = rulerChip(RULERS().on)
        const lift = /-translate-y-\[calc\(100%\+([\d.]+)rem\)\]/.exec(classesOf(chip))?.[1]
        return [
            ...mapPaintChecks('map-ruler', 'line', 'rest', {
                ink: mapColor(ink?.paint?.['line-color']),
                edge: mapColor(casing?.paint?.['line-color'], casing?.paint?.['line-opacity']),
            }),
            check(
                'pieces.line.rest (1.75 wide, dashed 3 on 2, over a 4 wide casing; each end 3.5 ringed 1.5)',
                '1.75 [3,2] 4 3.5 1.5',
                [
                    ink?.paint?.['line-width'],
                    JSON.stringify(ink?.paint?.['line-dasharray']),
                    casing?.paint?.['line-width'],
                    ends?.paint?.['circle-radius'],
                    ends?.paint?.['circle-stroke-width'],
                ]
                    .map(String)
                    .join(' '),
            ),
            check('states.on (the chip says the distance and the bearing from the first point)', '52.3 km · 312°', chip?.text),
            ...layoutChecks('map-ruler', { chipLift: () => (lift === undefined ? undefined : String(Number(lift) * 16)) }),
        ]
    },
}

// Map coordinates

const COORDINATES = once(() => ({
    offscreen: drawMap(createElement(MapCoordinates, {})),
    rest: drawMap(createElement(MapCoordinates, {}), (fake) => fake.fire('mousemove', { lngLat: { lng: 5.3221, lat: 60.3913 } })),
}))
const coordinatePieces = (elements: El[]) => {
    const bar = elements.find((element) => element.attrs['aria-hidden'] !== undefined && classesOf(element).includes('border-b'))
    return {
        container: elements.find((element) => element.attrs.role === 'group'),
        position: elements.find((element) => element.tag === 'output'),
        scale: bar?.parent,
        bar,
    }
}

const MAP_COORDINATES_ADAPTER: Adapter = {
    wordObjects: { MAP_COORDINATES_WORDS },
    complete: ['MAP_COORDINATES_WORDS'],
    words: Object.fromEntries(Object.keys(MAP_COORDINATES_WORDS).map((key) => [key, `MAP_COORDINATES_WORDS.${key}`])),
    options: { corner: MAP_CORNERS, format: mapUnion('geodesy.ts', 'CoordinateFormat'), unit: MAP_UNITS },
    size: () => pieceWhere(coordinatePieces(COORDINATES().rest).container),
    paint: (_, name, state) => {
        const pieces = coordinatePieces(state === 'offscreen' ? COORDINATES().offscreen : COORDINATES().rest)
        if (name === 'scale') {
            const { scale, bar } = pieces
            // The scale's words and the bar under them: the bar's edge is its rule.
            return scale === undefined || bar === undefined
                ? undefined
                : { layers: [classesOf(scale), classesOf(bar)], on: [], around: ancestors(scale) }
        }
        return pieceWhere(name === 'position' ? pieces.position : pieces.container)
    },
    effect: () => skip('a coordinate readout states no effects'),
    keys: {},
    more: () => {
        const { rest, offscreen } = COORDINATES()
        const width = /\bmin-w-(\d+)\b/.exec(classesOf(coordinatePieces(rest).position))?.[1]
        return [
            check('states.rest (the pointer on the map: its position)', '60.3913° N, 5.3221° E', coordinatePieces(rest).position?.text),
            check('states.offscreen (the pointer off the map)', 'Offscreen', coordinatePieces(offscreen).position?.text),
            check('layout.scaleRound (a round length: 1, 2 or 5 times a power of ten)', '100 km', coordinatePieces(rest).scale?.text),
            ...layoutChecks('map-coordinates', {
                scaleWidth: () => {
                    // The widest bar over a sweep of zooms: as wide as a bar is ever drawn.
                    let widest = 0
                    for (let step = 0; step <= 4000; step += 1)
                        widest = Math.max(widest, scaleBar(10 ** (step / 400), 100, 'km')?.width ?? 0)
                    return String(widest)
                },
                positionMinWidth: () => (width === undefined ? undefined : String(Number(width) * 4)),
            }),
        ]
    },
}

// Map go-to

/** A go-to field given a text and sent, as Enter in its field sends it. */
const goToSent = (text: string) =>
    liveMap(createElement(MapGoTo, {}), (box) => {
        const input = box.querySelector('input')
        if (input !== null) type(input, text)
        act(() => box.querySelector('form')?.requestSubmit())
        return parse(box.innerHTML)
    })
const GO_TOS = once(() => ({ rest: drawMap(createElement(MapGoTo, {})), invalid: goToSent('harbor') }))
const goToPieces = (elements: El[]) => {
    const container = elements.find((element) => element.tag === 'form')
    return {
        container,
        row: elements.find((element) => element.parent === container && element.tag === 'div'),
        issue: elements.find((element) => element.tag === 'p'),
    }
}

/** What a go-to field does with a text and Enter pressed in it: the position it flies to and hands on, or what it says. */
function goTo(text: string): string {
    const went: LngLat[] = []
    return liveMap(createElement(MapGoTo, { onGo: (position) => went.push(position) }), (box, fake) => {
        const input = box.querySelector('input')
        if (input === null) return 'no field'
        type(input, text)
        const event = press(input, 'Enter')
        // A browser submits a field's form on Enter when the form has a submit button; happy-dom does not, so it is sent as a browser would.
        if (event !== undefined && !event.defaultPrevented) {
            if (input.form === null) return 'the field is in no form, so Enter sends nothing'
            if (input.form.querySelector('button[type="submit"]') === null) return 'the form has no submit button, so Enter sends nothing'
            act(() => input.form?.requestSubmit())
        }
        const flown = fake.calls.find((call) => call.method === 'flyTo')
        if (flown !== undefined) return `${JSON.stringify(flown.options.center)} ${JSON.stringify(went[0])}`
        return box.querySelector('p')?.textContent ?? 'nothing'
    })
}

const MAP_GO_TO_ADAPTER: Adapter = {
    wordObjects: { MAP_GO_TO_WORDS },
    complete: ['MAP_GO_TO_WORDS'],
    words: Object.fromEntries(Object.keys(MAP_GO_TO_WORDS).map((key) => [key, `MAP_GO_TO_WORDS.${key}`])),
    options: { corner: MAP_CORNERS },
    size: (_, key) => {
        const pieces = goToPieces(GO_TOS().rest)
        return pieceWhere(key === 'gap' ? pieces.row : pieces.container)
    },
    paint: (_, name) => pieceWhere(name === 'issue' ? goToPieces(GO_TOS().invalid).issue : goToPieces(GO_TOS().rest).container),
    effect: () => skip('a go-to field states no effects'),
    keys: {
        'Enter (the field has focus)': () => {
            const went = goTo('60.39, 5.32')
            if (went !== '[5.32,60.39] [5.32,60.39]') return `Enter on a position does ${went}`
            const refused = goTo('harbor')
            return refused === MAP_GO_TO_WORDS.invalid ? true : `Enter on what is not a position says ${refused}`
        },
    },
    more: () => [
        check(
            'states.invalid (the field takes its invalid edge)',
            'true',
            GO_TOS().invalid.find((element) => element.tag === 'input')?.attrs['aria-invalid'],
        ),
    ],
}

// Map follow

const FOLLOWS = once(() => drawMap(createElement(MapFollow, { position: [5.32, 60.39], name: 'Patrol 7', onRelease: () => undefined })))
const followPieces = (elements: El[]) => {
    const banner = elements.find((element) => element.attrs.role === 'status')
    return {
        banner,
        name: elements.find((element) => element.tag === 'span' && element.parent === banner),
        icon: elements.find((element) => element.tag === 'svg' && element.parent === banner),
    }
}
/** The banner with its name's classes laid over its own: the banner's text is the name it says. */
const followText = () => {
    const { banner, name, icon } = followPieces(FOLLOWS())
    return banner === undefined || name === undefined
        ? undefined
        : { layers: [classesOf(banner), classesOf(name)], on: [], around: ancestors(banner), mark: classesOf(icon) }
}

const MAP_FOLLOW_ADAPTER: Adapter = {
    wordObjects: { MAP_FOLLOW_WORDS },
    complete: ['MAP_FOLLOW_WORDS'],
    words: {
        following: ['MAP_FOLLOW_WORDS.following', (said: (name: string) => string, fill) => said(String(fill.name))],
        release: 'MAP_FOLLOW_WORDS.release',
    },
    options: { corner: MAP_CORNERS },
    size: (_, key) => {
        const { banner, icon } = followPieces(FOLLOWS())
        if (key === 'padX') return skip('padded 8 before and 2 after, which one length cannot say: each end read in more')
        if (key === 'icon') return pieceWhere(icon)
        return key === 'text' ? followText() : pieceWhere(banner)
    },
    paint: () => followText(),
    effect: () => skip('a follow banner states no effects'),
    keys: {},
    more: () => {
        const { banner } = followPieces(FOLLOWS())
        let released = 0
        const eased = liveMap(
            createElement(MapFollow, { position: [5.32, 60.39], name: 'Patrol 7', onRelease: () => (released += 1) }),
            (box, fake) => {
                fake.fire('dragstart')
                act(() => box.querySelector('button')?.click())
                return fake.calls.find((call) => call.method === 'easeTo')?.options.center
            },
        )
        return [
            check('sizes.banner.padX (before)', '8', banner === undefined ? undefined : resolve([classesOf(banner)], [], READ.padStart)),
            check(
                'sizes.banner.padX (after: anatomy.banner)',
                '2',
                banner === undefined ? undefined : resolve([classesOf(banner)], [], lengthOf('pe-')),
            ),
            check('states.rest (the map eases to the followed position)', '[5.32,60.39]', JSON.stringify(eased)),
            check('states.rest (a drag and a press of the button each let it go)', '2', String(released)),
        ]
    },
}

// Map compass

const COMPASS = once(() => drawMap(createElement(MapCompass, {})))
const MAP_COMPASS_ADAPTER: Adapter = {
    wordObjects: { MAP_COMPASS_WORDS },
    complete: ['MAP_COMPASS_WORDS'],
    words: { resetNorth: ['MAP_COMPASS_WORDS.resetNorth', (said: (bearing: string) => string, fill) => said(String(fill.bearing))] },
    options: { corner: MAP_CORNERS },
    size: () => pieceWhere(mapButton(COMPASS())),
    paint: (_, name, state) => {
        if (name === 'needle') return skip('an svg filled and stroked rather than inked: read in more')
        return pieceWhere(mapButton(COMPASS()), state === 'hover' ? ['hover'] : [])
    },
    effect: () => skip('a compass states no effects'),
    keys: {
        'Enter, Space (the button has focus)': () =>
            liveMap(createElement(MapCompass, {}), (box, fake) => {
                const button = box.querySelector('button')
                // A native button: a browser presses it on Enter and Space, and the press is a click.
                if (button === null) return 'no native button, which Enter and Space press'
                fake.map.easeTo({ bearing: 47 })
                act(() => button.click())
                return fake.calls.at(-1)?.options.bearing === 0 ? true : 'a press does not turn the map to north'
            }),
    },
    more: () => {
        const needle = COMPASS().find((element) => element.tag === 'svg')
        const fill = resolve([classesOf(needle)], [], prefixed('fill-'))
        const stroke = resolve([classesOf(needle)], [], prefixed('stroke-'))
        const turned = liveMap(createElement(MapCompass, {}), (box, fake) => {
            fake.map.easeTo({ bearing: 47 })
            fake.fire('rotate')
            return [box.querySelector('button')?.getAttribute('aria-label'), box.querySelector('svg')?.style.transform]
        })
        return [
            check('pieces.needle.rest.ink', 'critical', fill === stroke ? fill : `fill ${String(fill)}, stroke ${String(stroke)}`),
            check(
                'states.rest (the needle turned against the bearing, and its name says the bearing)',
                'Reset to north (bearing 047°) rotate(-47deg)',
                turned.join(' '),
            ),
        ]
    },
}

// Zone layer

/** A square zone round a position, `half` degrees each way. */
const square = ([lng, lat]: LngLat, half: number): LngLat[] => [
    [lng - half, lat - half],
    [lng + half, lat - half],
    [lng + half, lat + half],
    [lng - half, lat + half],
]
const ZONES: Zone[] = [
    {
        id: 'harbor',
        area: square([5, 60], 0.2),
        label: 'Harbor',
        fill: 'hatched',
    },
    // Its middle is the harbor's, so the two labels cover one another.
    {
        id: 'anchorage',
        area: square([5, 60], 0.1),
        label: 'Anchorage',
        edge: 'dashed',
    },
]
/** A map layer drawn over a fake map: its style layers, sources and images, and what it writes in the overlay once measured. */
function drawLayer(part: ReactElement, context: Partial<MapContextValue> = {}): { fake: FakeMap; elements: El[] } {
    vi.useFakeTimers({
        toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    })
    try {
        return liveMap(
            part,
            (box, fake) => {
                // The overlay is measured a frame after the map draws.
                act(() => vi.advanceTimersByTime(50))
                return { fake: kept(fake), elements: parse(box.innerHTML) }
            },
            context,
        )
    } finally {
        vi.useRealTimers()
    }
}
const drawZones = (props: Partial<ZoneLayerProps> = {}, selected: string | null = null) =>
    drawLayer(createElement(ZoneLayer, { id: 'areas', zones: ZONES, ...props }), {
        selected,
    })
const ZONE_DRAWINGS = once(() => ({
    plain: drawZones(),
    selected: drawZones({}, 'anchorage'),
}))
/** A track, a zone and a link on one map, the zone's middle and the link's on the track's label. */
const CROSSING = once(
    () =>
        drawLayer(
            createElement(
                Fragment,
                null,
                createElement(TrackLayer, {
                    id: 'watch',
                    tracks: [{ id: 'ferry', position: [5, 60], affiliation: 'friend', kind: 'vessel', label: 'Ferry Juniper' }],
                    transition: 0,
                }),
                createElement(ZoneLayer, {
                    id: 'areas',
                    zones: [{ id: 'boarding', area: square([5.6, 60], 0.05), label: 'Pilot boarding' }],
                }),
                createElement(LinkLayer, { id: 'links', links: [{ id: 'relay', from: [5.3, 59.85], to: [5.9, 60.05], measure: true }] }),
            ),
        ).elements,
)
const overlayText = (elements: El[], text: string) => elements.find((element) => element.tag === 'span' && element.text === text)
const styleLayer = (fake: FakeMap, id: string, suffix: string) => fake.layers.get(`wui-${id}${suffix}`)
/** A style layer's paint property for a feature in a feature state. */
const painted = (layer: FakeLayer | undefined, key: string, properties: Record<string, unknown>, state: Record<string, unknown> = {}) =>
    evaluate(layer?.paint?.[key], properties, state)

const ZONE_LAYER_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: {
        fill: mapUnion('ZoneLayer.tsx', 'ZoneFill'),
        edge: mapUnion('ZoneLayer.tsx', 'ZoneEdge'),
    },
    size: () => pieceWhere(overlayText(ZONE_DRAWINGS().plain.elements, 'Harbor')),
    paint: (_, name, state) => {
        if (name !== 'label') return skip(`maplibre paints the ${name} on its canvas: read from its style layers in more`)
        return state === 'selected'
            ? pieceWhere(overlayText(ZONE_DRAWINGS().selected.elements, 'Anchorage'))
            : pieceWhere(overlayText(ZONE_DRAWINGS().plain.elements, 'Harbor'))
    },
    effect: () => skip('a zone layer states no effects'),
    keys: {},
    more: () => {
        const { plain, selected } = ZONE_DRAWINGS()
        const fill = styleLayer(plain.fake, 'areas', '-fill')
        const hatch = styleLayer(plain.fake, 'areas', '-hatch')
        const edge = styleLayer(plain.fake, 'areas', '-edge')
        const dashed = styleLayer(plain.fake, 'areas', '-dashed')
        const halo = styleLayer(plain.fake, 'areas', '-halo')
        const tile = plain.fake.images.get('wui-areas-hatch-plain')
        const zone = { tone: 'plain', fill: 'solid', edge: 'solid' }
        const fillIn = (state: Record<string, unknown>) => ({
            ground: mapColor(painted(fill, 'fill-color', zone, state), painted(fill, 'fill-opacity', zone, state)),
        })
        const widths = [{}, { hover: true }, { selected: true }].map((state) => String(painted(edge, 'line-width', zone, state)))
        return [
            ...mapPaintChecks('zone-layer', 'fill', 'rest', fillIn({})),
            ...mapPaintChecks('zone-layer', 'fill', 'hover', fillIn({ hover: true })),
            ...mapPaintChecks('zone-layer', 'fill', 'selected', fillIn({ selected: true })),
            ...mapPaintChecks('zone-layer', 'edge', 'rest', {
                edge: mapColor(painted(edge, 'line-color', zone)),
            }),
            ...mapPaintChecks('zone-layer', 'edge', 'selected', {
                edge: mapColor(painted(edge, 'line-color', zone, { selected: true })),
            }),
            check(
                'states.hover (the edge 1.5, then 2 under the pointer and 2.5 selected; a hatch 0.7, 0.95 and full)',
                '1.5 2 2.5 0.7 0.95 1',
                [
                    ...widths,
                    ...[{}, { hover: true }, { selected: true }].map((state) => String(painted(hatch, 'fill-opacity', zone, state))),
                ].join(' '),
            ),
            check(
                'states.rest (a dashed edge is dashed 3 on 2, and a hatch is the tone as a pattern)',
                '[3,2] wui-areas-hatch-plain',
                `${JSON.stringify(dashed?.paint?.['line-dasharray'])} ${String(painted(hatch, 'fill-pattern', zone))}`,
            ),
            check(
                'states.selected (a label covering another zone is left out, but never the selected zone)',
                'left out at rest, drawn when selected',
                `${overlayText(plain.elements, 'Anchorage') === undefined ? 'left out' : 'drawn'} at rest, ${overlayText(selected.elements, 'Anchorage') === undefined ? 'left out' : 'drawn'} when selected`,
            ),
            check(
                "states.rest (a zone's label yields to a track's, and a link's chip to both)",
                'Ferry Juniper',
                CROSSING()
                    .filter((element) => element.tag === 'span' && element.parent?.tag === 'div')
                    .map((element) => element.text)
                    .join(', '),
            ),
            ...layoutChecks('zone-layer', {
                edgeWidth: () => widths[0],
                hatchSpacing: () => (tile?.width === undefined ? undefined : String(tile.width / Number(tile.pixelRatio ?? 1))),
                haloWidth: () => {
                    const rest = painted(halo, 'line-width', zone)
                    return rest === 0 ? String(painted(halo, 'line-width', zone, { selected: true })) : `${String(rest)} at rest`
                },
            }),
        ]
    },
}

// Coverage layer

const COVER = once(() =>
    drawLayer(
        createElement(CoverageLayer, {
            id: 'cover',
            cones: [
                {
                    id: 'radar',
                    position: [5, 60],
                    range: 40_000,
                    bearing: 90,
                    width: 120,
                },
            ],
            rings: [{ id: 'watch', position: [5, 60], distances: [420, 20_000] }],
        }),
    ),
)

const COVERAGE_LAYER_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: { unit: MAP_UNITS },
    size: () => pieceWhere(overlayText(COVER().elements, '20 km')),
    paint: (_, name) => {
        if (name !== 'distance') return skip(`maplibre paints the ${name} on its canvas: read from its style layers in more`)
        return pieceWhere(overlayText(COVER().elements, '20 km'))
    },
    effect: () => skip('a coverage layer states no effects'),
    keys: {},
    more: () => {
        const { fake, elements } = COVER()
        const band = styleLayer(fake, 'cover', '-band')
        const edge = styleLayer(fake, 'cover', '-edge')
        const ring = styleLayer(fake, 'cover', '-ring')
        const plain = { tone: 'plain' }
        const near = Number(painted(band, 'fill-opacity', { ...plain, fade: 1 }))
        const bands = fake.sources.get('wui-cover')?.data.features.filter((feature) => feature.properties?.kind === 'band').length
        return [
            ...mapPaintChecks('coverage-layer', 'cone', 'rest', {
                ground: mapColor(painted(band, 'fill-color', plain), near),
            }),
            ...mapPaintChecks('coverage-layer', 'edge', 'rest', {
                edge: mapColor(painted(edge, 'line-color', plain), painted(edge, 'line-opacity', plain)),
            }),
            ...mapPaintChecks('coverage-layer', 'ring', 'rest', {
                edge: mapColor(painted(ring, 'line-color', plain), painted(ring, 'line-opacity', plain)),
            }),
            check(
                'states.rest (a cone cut into 6 bands; each ring dashed 2 on 2, written with its distance, whole meters under a kilometer)',
                '6 [2,2] 420 m 20 km',
                [
                    String(bands),
                    JSON.stringify(ring?.paint?.['line-dasharray']),
                    overlayText(elements, '420 m')?.text,
                    overlayText(elements, '20 km')?.text,
                ].join(' '),
            ),
            check(
                'states.rest (the layer answers no pointer)',
                'none',
                liveMap(
                    createElement(CoverageLayer, {
                        id: 'cover',
                        cones: [{ id: 'radar', position: [5, 60], range: 40_000 }],
                    }),
                    () => 'none',
                    {
                        register: (_, entry) => {
                            if (entry.hitLayers.length > 0) throw new Error(`the layer is hit on ${entry.hitLayers.join(', ')}`)
                            return () => undefined
                        },
                    },
                ),
            ),
            ...layoutChecks('coverage-layer', {
                edgeWidth: () => {
                    const [edgeWidth, ringWidth] = [edge?.paint?.['line-width'], ring?.paint?.['line-width']]
                    return edgeWidth === ringWidth ? String(edgeWidth) : `edge ${String(edgeWidth)}, ring ${String(ringWidth)}`
                },
                // The sweep is drawn by a shader: its turn and trail are the values it is given.
                sweepPeriod: () => String(SWEEP.period),
                sweepTrail: () => String(SWEEP.trail),
            }),
        ]
    },
}

// Link layer

const LINKS: MapLink[] = [
    { id: 'patrol', from: [5, 60], to: [6, 61], measure: true },
    // Its middle is the patrol's, so the two chips cover one another.
    { id: 'relay', from: [6, 60], to: [5, 61], measure: true, dashed: true },
]
const drawLinks = (props: Partial<LinkLayerProps> = {}, selected: string | null = null) =>
    drawLayer(createElement(LinkLayer, { id: 'links', links: LINKS, ...props }), {
        selected,
    })
const LINK_DRAWINGS = once(() => ({
    plain: drawLinks(),
    selected: drawLinks({}, 'relay'),
}))
const linkChips = (elements: El[]) => elements.filter((element) => element.tag === 'span' && element.text.includes(' · '))

const LINK_LAYER_ADAPTER: Adapter = {
    wordObjects: { LINK_WORDS },
    complete: ['LINK_WORDS'],
    words: {
        measured: [
            'LINK_WORDS.measured',
            (said: (distance: string, bearing: string) => string, fill) => said(String(fill.distance), String(fill.bearing)),
        ],
    },
    options: { path: mapUnion('LinkLayer.tsx', 'LinkPath'), unit: MAP_UNITS },
    size: () => pieceWhere(linkChips(LINK_DRAWINGS().plain.elements)[0]),
    paint: (_, name) => {
        if (name === 'line') return skip('maplibre paints the line on its canvas: read from its style layers in more')
        if (name === 'flow') return skip("a WebGL shader draws the flow in its link's tone, which happy-dom cannot run")
        return pieceWhere(linkChips(LINK_DRAWINGS().plain.elements)[0])
    },
    effect: () => skip('a link layer states no effects'),
    keys: {},
    more: () => {
        const { plain, selected } = LINK_DRAWINGS()
        const casing = styleLayer(plain.fake, 'links', '-casing')
        const line = styleLayer(plain.fake, 'links', '-line')
        const dashed = styleLayer(plain.fake, 'links', '-dashed')
        const link = { tone: 'plain', dashed: false }
        const width = (state: Record<string, unknown>) => Number(painted(line, 'line-width', link, state))
        const chip = linkChips(plain.elements)[0]
        const lift = /-translate-y-\[calc\(100%\+([\d.]+)rem\)\]/.exec(classesOf(chip))?.[1]
        return [
            ...mapPaintChecks('link-layer', 'line', 'rest', {
                ink: mapColor(painted(line, 'line-color', link)),
                edge: mapColor(painted(casing, 'line-color', link), casing?.paint?.['line-opacity']),
            }),
            ...mapPaintChecks('link-layer', 'line', 'selected', {
                ink: mapColor(painted(line, 'line-color', link, { selected: true })),
            }),
            check(
                'states.hover (the line 1.5, 0.75 more under the pointer and 1 more selected; dashed 3 on 2)',
                '1.5 2.25 2.5 [3,2]',
                [width({}), width({ hover: true }), width({ selected: true }), JSON.stringify(dashed?.paint?.['line-dasharray'])].join(' '),
            ),
            check('states.rest (the chip says the distance and the bearing from where the link starts)', '124 km · 026°', chip?.text),
            check(
                'states.selected (a chip covering another is left out, but never the selected link)',
                'one at rest, the relay selected',
                `${linkChips(plain.elements).length === 1 ? 'one' : String(linkChips(plain.elements).length)} at rest, ${
                    linkChips(selected.elements).length === 1 && linkChips(selected.elements)[0].text !== chip?.text
                        ? 'the relay'
                        : 'another'
                } selected`,
            ),
            ...layoutChecks('link-layer', {
                chipLift: () => (lift === undefined ? undefined : String(Number(lift) * 16)),
                casing: () => String(Number(painted(casing, 'line-width', link)) - width({})),
            }),
        ]
    },
}

// What the tracking parts share: the values of a union a core module exports

const unionIn = (text: string, name: string) =>
    [...(new RegExp(`export type ${name} = ([^\\n]+)`).exec(text)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1])
const TRACKS_SOURCE = source('lib/tracks.ts')
const TRACK_KIND_VALUES = unionIn(TRACKS_SOURCE, 'TrackKind')
const TRACK_AFFILIATION_VALUES = unionIn(TRACKS_SOURCE, 'TrackAffiliation')
const bySlotIn = (elements: El[], slot: string) => elements.find((element) => element.attrs['data-slot'] === slot)
/** A piece with the classes of the part around it laid under its own, for a text size the part sets and the piece keeps. */
const withPart = (outer: El | undefined, element: El | undefined, on: string[] = []): Where | undefined =>
    outer === undefined || element === undefined
        ? undefined
        : {
              layers: [classesOf(outer), classesOf(element)],
              on,
              around: ancestors(element),
          }

// Track glyph

const TRACK_GLYPH = source('components/TrackGlyph.tsx')
const glyph = (props: Partial<TrackGlyphProps> = {}) => draw(TrackGlyph, { kind: 'vessel', ...props })
/** The color a glyph is filled in: its svg's color, which its shape fills with. */
const glyphFill = (elements: El[]) => {
    const svg = elements.find((element) => element.tag === 'svg')
    const shape = elements.find((element) => element.tag === 'polygon' || element.tag === 'circle')
    const color = /color:\s*var\(--([a-z0-9-]+)\)/.exec(svg?.attrs.style ?? '')?.[1]
    return shape?.attrs.fill === 'currentColor' ? (color ?? 'inherit') : `a fill of ${String(shape?.attrs.fill)}`
}

const TRACK_GLYPH_ADAPTER: Adapter = {
    wordObjects: { TRACK_NAMES_WORDS },
    complete: ['TRACK_NAMES_WORDS'],
    words: Object.fromEntries(Object.keys(TRACK_NAMES_WORDS).map((key) => [key, `TRACK_NAMES_WORDS.${key}`])),
    options: {
        kind: TRACK_KIND_VALUES,
        affiliation: TRACK_AFFILIATION_VALUES,
        size: unionIn(TRACK_GLYPH, 'TrackGlyphSize'),
    },
    size: (size) => pieceWhere(glyph({ size: size as TrackGlyphProps['size'] })[0]),
    paint: () => skip('the shape is filled in currentColor, the color a style sets on the svg: read in more'),
    effect: () => skip('a glyph states no effects'),
    keys: {},
    more: () => {
        const turned = (props: Partial<TrackGlyphProps>) => glyph(props).find((element) => element.tag === 'g')?.attrs.transform ?? 'none'
        const named = (props: Partial<TrackGlyphProps>) => {
            const svg = glyph(props)[0]
            return svg.attrs['aria-hidden'] === 'true' ? 'hidden' : `${String(svg.attrs.role)} ${String(svg.attrs['aria-label'])}`
        }
        const sensor = glyph({ kind: 'sensor' }).filter((element) => element.tag === 'circle')
        return [
            check(
                'pieces.shape.rest.ground',
                'track-friend',
                glyphFill(glyph({ affiliation: 'friend' })),
                glyphFill(glyph({ affiliation: 'friend' })) === 'track-friend',
            ),
            check(
                'pieces.shape.rest (each affiliation its token; the ink around it without one)',
                [...TRACK_AFFILIATION_VALUES.map((one) => `track-${one}`), 'inherit'].join(' '),
                [
                    ...TRACK_AFFILIATION_VALUES.map((one) => glyphFill(glyph({ affiliation: one as TrackGlyphProps['affiliation'] }))),
                    glyphFill(glyph({})),
                ].join(' '),
            ),
            check(
                'states.rest (turned clockwise about its middle to its heading; a sensor never turns)',
                'rotate(90 24 24) none none',
                [turned({ heading: 90 }), turned({ kind: 'sensor', heading: 90 }), turned({})].join(' '),
            ),
            check(
                'states.rest (a sensor is a ring 5 wide of radius 14 round a dot of radius 4.5, in a 48 square)',
                '0 0 48 48 14 5 4.5',
                [glyph({ kind: 'sensor' })[0].attrs.viewBox, sensor[0]?.attrs.r, sensor[0]?.attrs['stroke-width'], sensor[1]?.attrs.r].join(
                    ' ',
                ),
            ),
            check(
                'states.rest (true names it by its affiliation and kind; without a label it is decoration)',
                'img Hostile vessel | img Patrol 7 | hidden',
                [named({ affiliation: 'hostile', label: true }), named({ label: 'Patrol 7' }), named({})].join(' | '),
            ),
        ]
    },
}

// Freshness

const SECOND_MS = 1_000
/** A freshness mark whose reading is `age` old, on a fixed clock; no reading for null. */
const freshness = (age: number | null, props: Partial<FreshnessProps> = {}) =>
    draw(Freshness, {
        at: age === null ? null : NOON - age,
        now: NOON,
        timeZone: 'UTC',
        ...props,
    })
const FRESHNESS_AGES: Record<string, number | null> = {
    live: 2 * SECOND_MS,
    recent: 12 * SECOND_MS,
    rest: 12 * SECOND_MS,
    stale: 2 * 60 * SECOND_MS,
    lost: 10 * 60 * SECOND_MS,
}
const freshnessPieces = (elements: El[]) => {
    const mark = bySlotIn(elements, 'freshness')
    const dot = elements.find((element) => element.attrs['aria-hidden'] === 'true' && /\brounded-full\b/.test(classesOf(element)))
    return { mark, dot }
}
/** A dot's paint, which a style sets: its ground, or its edge when it is hollow. */
const dotPaint = (dot: El | undefined) => {
    const style = dot?.attrs.style ?? ''
    return {
        ground: /background:\s*var\(--([a-z0-9-]+)\)/.exec(style)?.[1],
        edge: /border-color:\s*var\(--([a-z0-9-]+)\)/.exec(style)?.[1],
    }
}

const FRESHNESS_ADAPTER: Adapter = {
    wordObjects: { FRESHNESS_WORDS },
    complete: ['FRESHNESS_WORDS'],
    words: {
        live: 'FRESHNESS_WORDS.live',
        never: 'FRESHNESS_WORDS.never',
        ...Object.fromEntries(
            (['seconds', 'minutes', 'hours', 'days'] as const).map((key) => [
                key,
                [
                    `FRESHNESS_WORDS.${key}`,
                    (said: (count: number) => string, fill: Record<string, string | number>) => said(Number(fill.count)),
                ],
            ]),
        ),
        updated: ['FRESHNESS_WORDS.updated', (said: (time: string) => string, fill) => said(String(fill.time))],
    },
    options: {},
    size: () => skip('a freshness mark states no sizes'),
    paint: (_, name, state) => {
        const age = FRESHNESS_AGES[state]
        if (age === undefined) return skip(`no age reaches ${state}`)
        const { mark } = freshnessPieces(freshness(age))
        if (name === 'dot') return skip('the dot is painted by a style its color sets: read in more')
        return pieceWhere(mark)
    },
    effect: () => skip('a freshness mark states no effects'),
    keys: {},
    more: () => {
        const said = (age: number | null) => {
            const { mark } = freshnessPieces(freshness(age))
            return `${String(mark?.attrs['data-state'])} ${String(mark?.text)}`
        }
        const dotOf = (state: string) => dotPaint(freshnessPieces(freshness(FRESHNESS_AGES[state] ?? null)).dot)
        const title = freshnessPieces(freshness(12 * SECOND_MS)).mark?.attrs.title
        const dayOld = freshnessPieces(freshness(2 * 24 * 3_600_000)).mark?.attrs.title
        return [
            ...(['live', 'stale', 'lost'] as const).flatMap((state) => {
                const paint = SPECS.get('freshness')?.pieces?.dot?.[state]
                const found = dotOf(state)
                return (['ground', 'edge'] as const).flatMap((key) =>
                    paint?.[key] === undefined ? [] : [check(`pieces.dot.${state}.${key}`, paint[key], found[key])],
                )
            }),
            check(
                'pieces.dot.rest (none while recent)',
                'none',
                freshnessPieces(freshness(FRESHNESS_AGES.recent)).dot === undefined ? 'none' : 'a dot',
            ),
            check(
                'states.live (a pulsing dot)',
                'pulsing',
                /\banimate-live\b/.test(classesOf(freshnessPieces(freshness(FRESHNESS_AGES.live)).dot?.parent)) ? 'pulsing' : 'still',
            ),
            check(
                'states.rest (Live, then the largest whole unit; No data with no reading, which is lost)',
                'live Live | recent 12 s ago | stale 2 min ago | lost 3 h ago | lost 2 d ago | lost No data',
                [2 * SECOND_MS, 12 * SECOND_MS, 2 * 60 * SECOND_MS, 3 * 3_600_000, 2 * 24 * 3_600_000, null].map(said).join(' | '),
            ),
            check(
                'states.rest (the tooltip says Updated and the time of the reading, its date too once a day old)',
                'Updated 11:59:48 AM | with its date',
                `${String(title)} | ${dayOld !== undefined && /Nov/.test(dayOld) ? 'with its date' : String(dayOld)}`,
            ),
            check(
                'layout.clockLive (5000 under an hour, 60000 after)',
                '1000 5000 60000',
                [freshnessTick(0), freshnessTick(30 * 60_000), freshnessTick(2 * 3_600_000)].join(' '),
            ),
            ...layoutChecks('freshness', {
                clockLive: () => String(freshnessTick(0)),
            }),
        ]
    },
}

// Track card

const TRACK_CARD_PROPS: TrackCardProps = {
    name: 'Ferry Juniper',
    code: 'TV-204',
    kind: 'vessel',
    affiliation: 'friend',
    heading: 45,
    thumbnail: 'https://example.org/juniper.png',
    states: ['Simulated', { label: 'Live', tone: 'good' }],
    detail: '12 kn · 045°',
    updatedAt: NOON - 3_000,
    now: NOON,
}
const trackCard = (props: Partial<TrackCardProps> = {}) => draw(TrackCard, { ...TRACK_CARD_PROPS, ...props })
const TRACK_CARDS = once(() => ({
    full: trackCard({ onAffiliationChange: noop }),
    pressable: trackCard({ onSelect: noop, onAffiliationChange: noop }),
    selected: trackCard({ onSelect: noop, selected: true }),
}))
const trackCardPieces = (elements: El[]): Record<string, El | undefined> => {
    const head = bySlotIn(elements, 'track-card-head')
    const chips = bySlotIn(elements, 'track-card-chips')
    return {
        container: bySlotIn(elements, 'track-card'),
        cover: bySlotIn(elements, 'track-card-cover'),
        thumbnail: bySlotIn(elements, 'track-card-thumbnail'),
        head,
        name: elements.find((element) => element.parent === head && element.tag === 'span' && element.text === 'Ferry Juniper'),
        code: elements.find((element) => element.parent === head && element.tag === 'span' && element.text === 'TV-204'),
        detail: elements.find((element) => element.parent === chips && element.text === '12 kn · 045°'),
    }
}
/** A track card drawn in the page, with the presses its cover hears. */
const liveTrackCard = <T>(look: (box: HTMLElement, selected: () => number) => T) => {
    let selected = 0
    return live(
        createElement(TrackCard, {
            ...TRACK_CARD_PROPS,
            onSelect: () => (selected += 1),
            onAffiliationChange: noop,
        }),
        (box) => look(box, () => selected),
    )
}

const TRACK_CARD_ADAPTER: Adapter = {
    wordObjects: { TRACK_CARD_WORDS },
    complete: ['TRACK_CARD_WORDS'],
    words: {
        changeAffiliation: [
            'TRACK_CARD_WORDS.changeAffiliation',
            (said: (affiliation: string) => string, fill) => said(String(fill.affiliation)),
        ],
    },
    options: { kind: TRACK_KIND_VALUES, affiliation: TRACK_AFFILIATION_VALUES },
    size: (size, key) => {
        const pieces = trackCardPieces(TRACK_CARDS().full)
        if (size === 'head' && key === 'text') return withPart(pieces.container, pieces.head)
        return pieceWhere(pieces[size])
    },
    paint: (_, name, state) => {
        const cards = TRACK_CARDS()
        if (name === 'container') {
            if (state === 'focus') return pieceWhere(trackCardPieces(cards.pressable).cover, ['focus-visible'])
            if (state === 'selected') return pieceWhere(trackCardPieces(cards.selected).container)
            return pieceWhere(trackCardPieces(cards.pressable).container, state === 'hover' ? ['hover'] : [])
        }
        const pieces = trackCardPieces(cards.full)
        return withPart(pieces.container, pieces[name])
    },
    effect: () => skip('the track card states no effects'),
    keys: {
        Tab: () => {
            const { cover } = trackCardPieces(TRACK_CARDS().pressable)
            const menu = TRACK_CARDS().pressable.find((element) => element.attrs['data-slot'] === 'chip-select')
            if (cover?.tag !== 'button' || !focusable(cover)) return 'the card is not a button in the tab order'
            if (menu?.tag !== 'button' || !focusable(menu)) return "the affiliation chip's menu is not its own stop"
            if (TRACK_CARDS().full.some((element) => element.attrs['data-slot'] === 'track-card-cover'))
                return 'a card with no onSelect takes focus'
            return TRACK_CARDS().pressable.indexOf(cover) < TRACK_CARDS().pressable.indexOf(menu)
                ? true
                : "the affiliation chip's menu comes before the card"
        },
        'Enter (the card has focus)': () =>
            liveTrackCard((box, selected) => {
                const cover = box.querySelector<HTMLElement>('[data-slot="track-card-cover"]')
                // A native button: a browser presses it on Enter, and the press is a click.
                if (cover?.tagName !== 'BUTTON') return 'the card is not a native button, which Enter presses'
                act(() => cover.click())
                const chip = box.querySelector<HTMLElement>('[data-slot="chip-select"]')
                act(() => chip?.click())
                return selected() === 1 ? true : `a press of the card and its chip call onSelect ${String(selected())} times`
            }),
    },
    more: () => {
        const { full } = TRACK_CARDS()
        const unframed = trackCardPieces(trackCard({ framed: false })).container
        const glyphOf = full.find((element) => element.tag === 'svg' && element.attrs['data-kind'] === 'vessel')
        const chip = full.find((element) => element.attrs['data-slot'] === 'chip-select')
        const fresh = bySlotIn(full, 'freshness')
        return [
            check(
                'states.rest (the glyph md and named, the freshness at the head, the affiliation a menu)',
                'size-4 Friend vessel | live Live | Affiliation: Friend. Change',
                [
                    `${String(/\bsize-\d+(?:\.\d+)?\b/.exec(classesOf(glyphOf))?.[0])} ${String(glyphOf?.attrs['aria-label'])}`,
                    `${String(fresh?.attrs['data-state'])} ${String(fresh?.text)}`,
                    chip?.attrs['aria-label'],
                ].join(' | '),
            ),
            check(
                'states.rest (framed false drops the edge, ground and padding)',
                'none none none',
                [READ.edge, READ.ground, READ.pad].map((read) => resolve([classesOf(unframed)], [], read) ?? 'none').join(' '),
            ),
            check(
                'states.rest (a state chip is an outline chip, or in its tone)',
                'outline good',
                ['Simulated', 'Live']
                    .map((label) => {
                        const one = full.find((element) => element.attrs['data-slot'] === 'chip' && element.text === label)
                        const tone = chipUnion('ChipTone').find(
                            (each) => classesOf(chipPieces(drawChip({ tone: each as ChipProps['tone'] })).container) === classesOf(one),
                        )
                        return tone ?? 'another look'
                    })
                    .join(' '),
            ),
        ]
    },
}

// Task card

const TASK_CARD_PROPS: TaskCardProps = {
    title: 'Follow',
    code: 'T-17',
    state: 'executing',
    elapsed: 247_000,
    from: {
        name: 'Patrol 7',
        glyph: createElement(TrackGlyph, { kind: 'vessel', affiliation: 'friend' }),
    },
    to: {
        name: 'Contact 14',
        glyph: createElement(TrackGlyph, {
            kind: 'vessel',
            affiliation: 'unknown',
        }),
    },
    facts: [{ term: 'Priority', value: 'High' }],
    actions: [
        { label: 'Pause', onSelect: noop },
        { label: 'Report', onSelect: noop, primary: true },
        {
            label: 'Cancel',
            onSelect: noop,
            destructive: true,
            confirm: { question: 'Cancel Follow?' },
        },
    ],
}
const taskCard = (props: Partial<TaskCardProps> = {}) => draw(TaskCard, { ...TASK_CARD_PROPS, ...props })
const TASK_CARDS = once(() => ({
    full: taskCard(),
    selected: taskCard({ selected: true }),
}))
const taskCardPieces = (elements: El[]): Record<string, El | undefined> => {
    const container = bySlotIn(elements, 'task-card')
    const line = bySlotIn(elements, 'task-card-line')
    return {
        container,
        title: elements.find((element) => element.tag === 'h3'),
        elapsed: bySlotIn(elements, 'task-card-elapsed'),
        line,
        arrow: elements.find((element) => element.tag === 'svg' && element.parent === line),
        actions: bySlotIn(elements, 'task-card-actions'),
    }
}
/** A task card drawn in the page: what its actions ran, and the confirm dialog's buttons once one asks. */
function taskActs(press: (box: HTMLElement) => void): string {
    const ran: string[] = []
    const actions = (TASK_CARD_PROPS.actions ?? []).map((action) => ({
        ...action,
        onSelect: () => ran.push(action.label),
    }))
    return live(createElement(TaskCard, { ...TASK_CARD_PROPS, actions }), (box) => {
        press(box)
        const dialog = document.querySelector('[role="alertdialog"], [role="dialog"]')
        const buttons = dialog === null ? [] : [...dialog.querySelectorAll('button')].map((button) => button.textContent.trim())
        return `${ran.join(' ') || 'nothing'} | ${buttons.join(' ') || 'no dialog'}`
    })
}

const TASK_CARD_ADAPTER: Adapter = {
    wordObjects: { TASK_CARD_WORDS },
    complete: ['TASK_CARD_WORDS'],
    words: Object.fromEntries(Object.keys(TASK_CARD_WORDS).map((key) => [key, `TASK_CARD_WORDS.${key}`])),
    options: { state: [...TASK_STATES] },
    size: (size, key) => {
        const pieces = taskCardPieces(TASK_CARDS().full)
        if (size === 'line' && key === 'icon') return pieceWhere(pieces.arrow)
        return pieceWhere(pieces[size])
    },
    paint: (_, name, state) => {
        const pieces = taskCardPieces(state === 'selected' ? TASK_CARDS().selected : TASK_CARDS().full)
        return name === 'container' ? pieceWhere(pieces.container) : withPart(pieces.container, pieces[name])
    },
    effect: () => skip('the task card states no effects'),
    keys: {
        Tab: () => {
            const buttons = TASK_CARDS().full.filter((element) => element.tag === 'button')
            return buttons.length === 3 && buttons.every(focusable) ? true : 'an action is not a button in the tab order'
        },
        'Enter, Space (an action has focus)': () => {
            // A native button: a browser presses it on Enter and Space, and the press is a click.
            const button = (label: string) => (box: HTMLElement) =>
                act(() => [...box.querySelectorAll('button')].find((one) => one.textContent.trim() === label)?.click())
            const plain = taskActs(button('Report'))
            const asked = taskActs(button('Cancel'))
            return plain === 'Report | no dialog' && asked === 'nothing | Keep Cancel'
                ? true
                : `a press runs ${plain}; a destructive one with confirm runs ${asked}`
        },
    },
    more: () => {
        const { full } = TASK_CARDS()
        // Each action against the small button of each variant.
        const looks = (['outline', 'default', 'destructive'] as const).map((variant) => [
            variant,
            classesOf(draw(Button, { variant, size: 'sm' }, 'Run')[0]),
        ])
        const variants = full
            .filter((element) => element.tag === 'button')
            .map((element) => looks.find(([, classes]) => classes === classesOf(element))?.[0] ?? 'another look')
        const statuses = taskStatuses()
        return [
            check(
                'states.pending (the chip in each state: its word and tone, executing pulsing)',
                'pending pending | executing running live | paused warning | done good | failed critical',
                TASK_STATES.map((state) => {
                    const look = statuses[state]
                    return `${look.label} ${String(look.color)}${look.live === true ? ' live' : ''}`
                }).join(' | '),
            ),
            check(
                'states.executing (the chip says the state)',
                TASK_STATES.join(' '),
                TASK_STATES.map((state) =>
                    taskCard({ state })
                        .find((element) => element.attrs['data-status'] === state)
                        ?.text.trim(),
                ).join(' '),
            ),
            check(
                'states.rest (the elapsed time as a clock: 4:07 under an hour, 1:04:07 past one)',
                'Elapsed 4:07 | Elapsed 1:04:07',
                [247_000, 3_847_000].map((elapsed) => taskCardPieces(taskCard({ elapsed })).elapsed?.text).join(' | '),
            ),
            check(
                'states.rest (actions outline, primary filled, destructive in its variant)',
                'outline default destructive',
                variants.join(' '),
            ),
            check('states.rest (the line reads from, to, and its end)', 'Patrol 7 to Contact 14', taskCardPieces(full).line?.text),
        ]
    },
}

// Track roster

const ROSTER_TRACKS: TrackRosterItem[] = [
    {
        id: 'tv-311',
        name: 'Survey Larkspur',
        kind: 'aircraft',
        affiliation: 'unknown',
        updatedAt: NOON - 40_000,
    },
    {
        id: 'tv-204',
        name: 'Ferry Juniper',
        kind: 'vessel',
        affiliation: 'friend',
        states: ['Simulated'],
        updatedAt: NOON - 2_000,
    },
    {
        id: 'tv-107',
        name: 'Pilot 4',
        kind: 'vessel',
        affiliation: 'friend',
        updatedAt: NOON - 400_000,
    },
    {
        id: 'tv-099',
        name: 'Contact 14',
        kind: 'vessel',
        affiliation: 'hostile',
        updatedAt: NOON - 9_000,
    },
]
const roster = (props: Partial<TrackRosterProps> = {}) => draw(TrackRoster, { tracks: ROSTER_TRACKS, now: NOON, ...props })
/** The group heads and rows a roster draws, in order. */
const rosterOrder = (elements: El[]) =>
    elements
        .filter((element) => element.attrs['data-group'] !== undefined || element.attrs['data-row'] !== undefined)
        .map((element) => element.attrs['data-group'] ?? element.attrs['data-row'])
        .join(' ')
/** A roster drawn in the page, with the tracks it picked. */
const liveRoster = <T>(look: (box: HTMLElement, picked: string[]) => T) => {
    const picked: string[] = []
    return live(
        createElement(TrackRoster, {
            tracks: ROSTER_TRACKS,
            now: NOON,
            onSelect: (id) => picked.push(id),
        }),
        (box) => look(box, picked),
    )
}

const TRACK_ROSTER_ADAPTER: Adapter = {
    wordObjects: { TRACK_ROSTER_WORDS },
    complete: ['TRACK_ROSTER_WORDS'],
    words: Object.fromEntries(Object.keys(TRACK_ROSTER_WORDS).map((key) => [key, `TRACK_ROSTER_WORDS.${key}`])),
    options: {},
    size: () => skip('the roster states no sizes: its rows are track cards and its frame the table'),
    paint: () => skip("the roster states no paints: its rows are track cards and its frame the table's"),
    effect: () => skip('the roster states no effects'),
    keys: {
        '/': () =>
            liveWaiting(createElement(TrackRoster, { tracks: ROSTER_TRACKS, now: NOON }), async (box) => {
                // The table's search arrives once its parts are fetched.
                if (!(await until(() => box.querySelector('input') !== null))) return 'no search drawn'
                press(document.body, '/')
                return document.activeElement === box.querySelector('input') ? true : '/ does not focus the search'
            }),
        // Focus starts on the first track: Down, Down, Up, Down moves the active row over the rows alone,
        // past the group heads, to the third track, which Enter picks.
        'ArrowUp, ArrowDown': () =>
            liveRoster((box, picked) => {
                const grid = box.querySelector<HTMLElement>('[role="grid"]')
                act(() => grid?.focus())
                for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowDown', 'Enter']) press(grid, key)
                return picked.join(' ') === 'tv-099'
                    ? true
                    : `Down, Down, Up, Down and Enter pick ${picked.join(' ') || 'nothing'}, not the third track`
            }),
        'Enter (the list has focus)': () =>
            liveRoster((box, picked) => {
                const grid = box.querySelector<HTMLElement>('[role="grid"]')
                act(() => grid?.focus())
                press(grid, 'Enter')
                return picked.join(' ') === 'tv-204' ? true : `Enter on the first track picks ${picked.join(' ') || 'nothing'}`
            }),
    },
    more: () => {
        const plain = roster()
        const picked = roster({ selected: 'tv-099' })
        const empty = roster({ tracks: [] })
        const chosen = picked.find((element) => element.attrs['data-row'] === 'tv-099')
        return [
            check(
                'states.rest (under their affiliations, friend first, sorted by name)',
                'friend tv-204 tv-107 hostile tv-099 unknown tv-311',
                rosterOrder(plain),
            ),
            check('states.selected (the track picked drawn as the chosen row)', 'true', chosen?.attrs['aria-selected']),
            check(
                'states.empty (no tracks)',
                'No tracks.',
                empty.some((element) => element.text.trim() === TRACK_ROSTER_WORDS.empty) ? TRACK_ROSTER_WORDS.empty : 'not said',
            ),
            check(
                'states.rest (the rows are unframed track cards, with no column heads)',
                'unframed, no heads',
                `${plain.some((element) => element.attrs['data-slot'] === 'track-card' && /\bborder\b/.test(classesOf(element))) ? 'framed' : 'unframed'}, ${
                    plain.some((element) => element.attrs.role === 'columnheader') ? 'heads' : 'no heads'
                }`,
            ),
        ]
    },
}

// Detection overlay

const DETECTION_OVERLAY = source('components/DetectionOverlay.tsx')
const DETECTION_PROPS: DetectionOverlayProps = {
    time: 1,
    detections: [
        { id: 'p-1', label: 'person', samples: [{ t: 1, x: 0.1, y: 0.2, w: 0.1, h: 0.3, confidence: 0.9 }] },
        { id: 'v-2', label: 'vehicle', affiliation: 'neutral', samples: [{ t: 1, x: 0.5, y: 0.5, w: 0.2, h: 0.2 }] },
    ],
}
const detectionOverlay = (props: Partial<DetectionOverlayProps> = {}) => draw(DetectionOverlay, { ...DETECTION_PROPS, ...props })
const detectionMarks = (elements: El[]) => elements.filter((element) => element.attrs['data-slot'] === 'detection')

const DETECTION_OVERLAY_ADAPTER: Adapter = {
    wordObjects: { DETECTION_OVERLAY_WORDS },
    complete: ['DETECTION_OVERLAY_WORDS'],
    words: { detections: 'DETECTION_OVERLAY_WORDS.detections', detection: 'DETECTION_OVERLAY_WORDS.detection' },
    options: { look: unionIn(DETECTION_OVERLAY, 'DetectionLook') },
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the detection overlay states no effects'),
    keys: {
        Tab: () => {
            const marks = detectionMarks(detectionOverlay({ onSelect: noop }))
            if (marks.length !== 2 || !marks.every((mark) => mark.tag === 'button' && focusable(mark)))
                return 'each mark is not a button in the tab order with onSelect'
            return detectionMarks(detectionOverlay()).every((mark) => mark.tag === 'span') ? true : 'a mark with no onSelect takes focus'
        },
        'Enter (a mark has focus)': () => {
            const chosen: (string | undefined)[] = []
            return live(
                createElement(DetectionOverlay, { ...DETECTION_PROPS, selected: 'v-2', onSelect: (id) => chosen.push(id) }),
                (box) => {
                    const marks = [...box.querySelectorAll<HTMLElement>('[data-slot="detection"]')]
                    // A native button: a browser presses it on Enter, and the press is a click.
                    if (marks.some((mark) => mark.tagName !== 'BUTTON')) return 'a mark is not a native button, which Enter presses'
                    act(() => marks[0].click())
                    act(() => marks[1].click())
                    return chosen.join(' ') === 'p-1 '
                        ? true
                        : `pressing a mark, then the selected one, chose ${chosen.map(String).join(', ')}`
                },
            )
        },
    },
    more: () => {
        const tags = detectionOverlay({ ids: true }).filter(
            (element) => element.text.includes('person') || element.text.includes('vehicle'),
        )
        const looks = (['box', 'brackets', 'marker'] as const).map(
            (look) => detectionMarks(detectionOverlay({ look }))[0]?.attrs['data-look'],
        )
        return [
            check(
                'anatomy.tag (label, id with ids, then a whole percent)',
                'person p-1 90%',
                tags.find((tag) => tag.text.startsWith('person'))?.text,
            ),
            check('options.look (each look drawn)', 'box brackets marker', looks.join(' ')),
            check(
                'options.time (a detection shown only where its samples are)',
                '2 0',
                `${String(detectionMarks(detectionOverlay()).length)} ${String(detectionMarks(detectionOverlay({ time: 5 })).length)}`,
            ),
        ]
    },
}

// Video follow

const VIDEO_FOLLOW_PROPS: VideoFollowProps = {
    time: 1,
    onRelease: noop,
    detection: { id: 'p-1', label: 'person', samples: [{ t: 1, x: 0.4, y: 0.4, w: 0.1, h: 0.2 }] },
}
const videoFollow = (props: Partial<VideoFollowProps> = {}) => draw(VideoFollow, { ...VIDEO_FOLLOW_PROPS, ...props })

const VIDEO_FOLLOW_ADAPTER: Adapter = {
    wordObjects: { VIDEO_FOLLOW_WORDS },
    complete: ['VIDEO_FOLLOW_WORDS'],
    words: {
        following: ['VIDEO_FOLLOW_WORDS.following', (said: (name: string) => string, fill) => said(String(fill.name))],
        lost: ['VIDEO_FOLLOW_WORDS.lost', (said: (name: string) => string, fill) => said(String(fill.name))],
        release: 'VIDEO_FOLLOW_WORDS.release',
    },
    options: {},
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('video follow states no effects'),
    keys: {
        Tab: () => {
            const button = videoFollow().find((element) => element.tag === 'button')
            return button !== undefined && focusable(button) ? true : 'the release button is not in the tab order'
        },
        'Enter (the release button has focus)': () => {
            let released = 0
            return live(createElement(VideoFollow, { ...VIDEO_FOLLOW_PROPS, onRelease: () => (released += 1) }), (box) => {
                const button = box.querySelector<HTMLElement>('button')
                // A native button: a browser presses it on Enter, and the press is a click.
                if (button === null) return 'there is no native release button, which Enter presses'
                act(() => button.click())
                return released === 1 ? true : 'pressing the release button did not call onRelease'
            })
        },
    },
    more: () => {
        const said = (elements: El[]) => elements.find((element) => element.attrs['data-slot'] === 'video-follow')?.text
        return [
            check('states.rest (the banner names what it follows)', 'Following person p-1', said(videoFollow())),
            check('states.lost (no sample within hold of the moment)', 'Lost person p-1', said(videoFollow({ time: 5 }))),
        ]
    },
}

// Camera wall

const CAMERA_WALL = source('components/CameraWall.tsx')
const CAMERA_WALL_PROPS: CameraWallProps = {
    playing: false,
    cameras: [
        { id: 'gate', name: 'Harbor gate', state: 'recording', src: 'gate.webm', detections: 3, alert: true },
        { id: 'quay', name: 'Harbor quay', state: 'live', src: 'quay.webm' },
        { id: 'dock', name: 'Juniper dock', state: 'offline' },
    ],
}
const cameraWall = (props: Partial<CameraWallProps> = {}) => draw(CameraWall, { ...CAMERA_WALL_PROPS, ...props })
const cameraPresses = (elements: El[]) => elements.filter((element) => element.attrs['data-slot'] === 'camera-tile-press')

const CAMERA_WALL_ADAPTER: Adapter = {
    wordObjects: { CAMERA_WALL_WORDS },
    complete: ['CAMERA_WALL_WORDS'],
    words: {
        live: 'CAMERA_WALL_WORDS.live',
        recording: 'CAMERA_WALL_WORDS.recording',
        offline: 'CAMERA_WALL_WORDS.offline',
        connecting: 'CAMERA_WALL_WORDS.connecting',
        detections: ['CAMERA_WALL_WORDS.detections', (said: (count: number) => string, fill) => said(Number(fill.count))],
        enlarge: ['CAMERA_WALL_WORDS.enlarge', (said: (name: string) => string, fill) => said(String(fill.name))],
    },
    options: { min: propValues(CAMERA_WALL, 'CameraWallProps', 'min') },
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the camera wall states no effects'),
    keys: {
        Tab: () => {
            const presses = cameraPresses(cameraWall({ onFocusChange: noop }))
            if (presses.length !== 3 || !presses.every((press) => press.tag === 'button' && focusable(press)))
                return 'each tile is not a button in the tab order with onFocusChange'
            return cameraPresses(cameraWall()).length === 0 ? true : 'a tile takes focus with no onFocusChange'
        },
        "Enter (a tile's button has focus)": () => {
            const chosen: (string | undefined)[] = []
            return live(
                createElement(CameraWall, { ...CAMERA_WALL_PROPS, focused: 'quay', onFocusChange: (id) => chosen.push(id) }),
                (box) => {
                    const presses = [...box.querySelectorAll<HTMLElement>('[data-slot="camera-tile-press"]')]
                    // A native button: a browser presses it on Enter, and the press is a click.
                    if (presses.some((press) => press.tagName !== 'BUTTON'))
                        return "a tile's press is not a native button, which Enter presses"
                    act(() => presses[0].click())
                    act(() => presses[1].click())
                    return chosen.join(' ') === 'gate '
                        ? true
                        : `pressing a tile, then the large one, chose ${chosen.map(String).join(', ')}`
                },
            )
        },
    },
    more: () => {
        const tiles = cameraWall({ focused: 'quay' }).filter((element) => element.attrs['data-slot'] === 'camera-tile')
        return [
            check(
                'states.focused (the focused tile is drawn large)',
                'quay',
                tiles.find((tile) => tile.attrs['data-large'] !== undefined)?.attrs['data-state'] === 'live' ? 'quay' : 'none',
            ),
            check(
                'states.alert (an alert tile is ringed)',
                'recording',
                tiles.find((tile) => tile.attrs['data-alert'] !== undefined)?.attrs['data-state'],
            ),
            check(
                'anatomy.picture (offline draws no picture)',
                'none',
                cameraWall({ cameras: [{ id: 'dock', name: 'Juniper dock', state: 'offline', src: 'dock.webm' }] }).some(
                    (element) => element.tag === 'video',
                )
                    ? 'a video'
                    : 'none',
            ),
        ]
    },
}

// Detection timeline

const DETECTION_TIMELINE_PROPS: DetectionTimelineProps = {
    duration: 12,
    time: 4,
    spans: [
        { id: 'p-1', label: 'person', start: 0, end: 5, alert: true },
        { id: 'p-2', label: 'person', start: 1, end: 9 },
        { id: 'v-3', label: 'vehicle', affiliation: 'neutral', start: 2, end: 6 },
    ],
}
const detectionTimeline = (props: Partial<DetectionTimelineProps> = {}) =>
    draw(DetectionTimeline, { ...DETECTION_TIMELINE_PROPS, ...props })
const timelineSpans = (elements: El[]) => elements.filter((element) => element.attrs['data-slot'] === 'detection-span')

const DETECTION_TIMELINE_ADAPTER: Adapter = {
    wordObjects: { DETECTION_TIMELINE_WORDS },
    complete: ['DETECTION_TIMELINE_WORDS'],
    words: {
        timeline: 'DETECTION_TIMELINE_WORDS.timeline',
        alerts: 'DETECTION_TIMELINE_WORDS.alerts',
        seek: [
            'DETECTION_TIMELINE_WORDS.seek',
            (said: (name: string, time: string) => string, fill) => said(String(fill.name), String(fill.time)),
        ],
    },
    options: {},
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the detection timeline states no effects'),
    keys: {
        Tab: () => {
            const spans = timelineSpans(detectionTimeline({ onSeek: noop }))
            if (spans.length !== 3 || !spans.every((span) => span.tag === 'button' && focusable(span)))
                return 'each span is not a button in the tab order with onSeek'
            return timelineSpans(detectionTimeline()).every((span) => span.tag === 'span') ? true : 'a span takes focus with no onSeek'
        },
        'Enter (a span has focus)': () => {
            const sought: number[] = []
            return live(
                createElement(DetectionTimeline, { ...DETECTION_TIMELINE_PROPS, onSeek: (seconds) => sought.push(seconds) }),
                (box) => {
                    const spans = [...box.querySelectorAll<HTMLElement>('[data-slot="detection-span"]')]
                    // A native button: a browser presses it on Enter, and the press is a click.
                    if (spans.some((span) => span.tagName !== 'BUTTON')) return 'a span is not a native button, which Enter presses'
                    act(() => spans[2].click())
                    return sought.join(' ') === '2' ? true : `pressing the vehicle's span sought ${sought.join(', ')}`
                },
            )
        },
    },
    more: () => {
        const drawn = detectionTimeline()
        const lanes = drawn
            .filter((element) => element.attrs['data-slot'] === 'detection-lane')
            .map((lane) => drawn.find((element) => element.parent === lane && element.tag === 'span')?.text)
        return [check('anatomy.lane (the alerts first, then a lane per label)', 'Alerts person vehicle', lanes.join(' '))]
    },
}

// Detection gallery

const DETECTION_GALLERY = source('components/DetectionGallery.tsx')
const DETECTION_GALLERY_PROPS: DetectionGalleryProps = {
    sightings: [
        {
            id: 's-1',
            label: 'person',
            when: '14:02:04',
            image: 'frame.jpg',
            box: { x: 0.4, y: 0.4, w: 0.05, h: 0.2 },
            confidence: 0.9,
            alert: true,
        },
        { id: 's-2', label: 'vehicle', affiliation: 'neutral', when: '14:02:06', image: 'frame.jpg' },
    ],
}
const detectionGallery = (props: Partial<DetectionGalleryProps> = {}) => draw(DetectionGallery, { ...DETECTION_GALLERY_PROPS, ...props })
const sightingTiles = (elements: El[]) => elements.filter((element) => element.attrs['data-slot'] === 'sighting')

const DETECTION_GALLERY_ADAPTER: Adapter = {
    wordObjects: { DETECTION_GALLERY_WORDS },
    complete: ['DETECTION_GALLERY_WORDS'],
    words: {
        open: [
            'DETECTION_GALLERY_WORDS.open',
            (said: (name: string, when: string) => string, fill) => said(String(fill.name), String(fill.when)),
        ],
    },
    options: { min: propValues(DETECTION_GALLERY, 'DetectionGalleryProps', 'min') },
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the detection gallery states no effects'),
    keys: {
        Tab: () => {
            const tiles = sightingTiles(detectionGallery({ onSelect: noop }))
            if (tiles.length !== 2 || !tiles.every((tile) => tile.tag === 'button' && focusable(tile)))
                return 'each tile is not a button in the tab order with onSelect'
            return sightingTiles(detectionGallery()).every((tile) => tile.tag === 'div') ? true : 'a tile takes focus with no onSelect'
        },
        'Enter (a tile has focus)': () => {
            const picked: string[] = []
            return live(createElement(DetectionGallery, { ...DETECTION_GALLERY_PROPS, onSelect: (id) => picked.push(id) }), (box) => {
                const tiles = [...box.querySelectorAll<HTMLElement>('[data-slot="sighting"]')]
                // A native button: a browser presses it on Enter, and the press is a click.
                if (tiles.some((tile) => tile.tagName !== 'BUTTON')) return 'a tile is not a native button, which Enter presses'
                act(() => tiles[1].click())
                return picked.join(' ') === 's-2' ? true : `pressing the second tile picked ${picked.join(', ')}`
            })
        },
    },
    more: () => {
        const tiles = sightingTiles(detectionGallery({ selected: 's-2' }))
        return [
            check(
                'states.alert (an alert sighting is marked)',
                's-1',
                tiles.find((tile) => tile.attrs['data-alert'] !== undefined) === tiles[0] ? 's-1' : 'none',
            ),
            check(
                'states.selected (the chosen sighting is marked)',
                's-2',
                tiles.find((tile) => tile.attrs['data-selected'] !== undefined) === tiles[1] ? 's-2' : 'none',
            ),
        ]
    },
}

// Picture zones

const PICTURE_ZONES_PROPS: PictureZonesProps = {
    zones: [
        {
            id: 'quay',
            name: 'Quay',
            kind: 'region',
            points: [
                [0.1, 0.1],
                [0.4, 0.1],
                [0.4, 0.4],
            ],
        },
        {
            id: 'gate',
            name: 'Gate line',
            kind: 'line',
            tone: 'critical',
            points: [
                [0.5, 0.2],
                [0.5, 0.8],
            ],
        },
    ],
}
const pictureZones = (props: Partial<PictureZonesProps> = {}) => draw(PictureZones, { ...PICTURE_ZONES_PROPS, ...props })
const zoneHandles = (elements: El[]) => elements.filter((element) => element.attrs['data-slot'] === 'zone-handle')

const PICTURE_ZONES_ADAPTER: Adapter = {
    wordObjects: { PICTURE_ZONES_WORDS },
    complete: ['PICTURE_ZONES_WORDS'],
    words: {
        zones: 'PICTURE_ZONES_WORDS.zones',
        point: [
            'PICTURE_ZONES_WORDS.point',
            (said: (zone: string, place: number) => string, fill) => said(String(fill.zone), Number(fill.place)),
        ],
        drawing: 'PICTURE_ZONES_WORDS.drawing',
    },
    options: { draw: ['region', 'line'] },
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('picture zones state no effects'),
    keys: {
        Tab: () => {
            const handles = zoneHandles(pictureZones({ selected: 'quay', onChange: noop }))
            if (handles.length !== 3 || !handles.every((handle) => handle.tag === 'button' && focusable(handle)))
                return "the picked zone's corners are not buttons in the tab order"
            return zoneHandles(pictureZones({ selected: 'quay' })).length === 0 ? true : 'handles show with no onChange'
        },
        'ArrowLeft, ArrowRight, ArrowUp, ArrowDown (a handle has focus)': () => {
            let changed: PictureZone[] = []
            return live(
                createElement(PictureZones, { ...PICTURE_ZONES_PROPS, selected: 'quay', onChange: (zones) => (changed = zones) }),
                (box) => {
                    const handle = box.querySelector<HTMLElement>('[data-slot="zone-handle"]')
                    if (handle === null) return 'there is no handle'
                    act(() => {
                        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
                    })
                    const moved = changed.find((zone) => zone.id === 'quay')?.points[0]
                    return moved !== undefined && Math.abs(moved[0] - 0.11) < 1e-9 && moved[1] === 0.1
                        ? true
                        : `ArrowRight moved the corner to ${String(moved)}`
                },
            )
        },
        'Enter (drawing)': () => {
            let drawn: number | undefined
            return live(
                createElement(PictureZones, { ...PICTURE_ZONES_PROPS, draw: 'line', onDrawn: (points) => (drawn = points.length) }),
                (box) => {
                    const layer = box.querySelector<HTMLElement>('[data-slot="zone-draw"]')
                    if (layer === null) return 'there is no drawing layer'
                    act(() => {
                        layer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
                    })
                    return drawn === undefined ? true : 'Enter finished a line with too few points'
                },
            )
        },
        'Escape (drawing)': () => {
            let cancelled = 0
            return live(
                createElement(PictureZones, { ...PICTURE_ZONES_PROPS, draw: 'region', onDrawCancel: () => (cancelled += 1) }),
                (box) => {
                    const layer = box.querySelector<HTMLElement>('[data-slot="zone-draw"]')
                    if (layer === null) return 'there is no drawing layer'
                    act(() => {
                        layer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
                    })
                    return cancelled === 1 ? true : 'Escape did not give up drawing'
                },
            )
        },
    },
    more: () => {
        const names = pictureZones()
            .filter((element) => element.attrs['data-slot'] === 'zone-name')
            .map((element) => element.text)
        return [check('anatomy.name (each zone named)', 'Quay Gate line', names.join(' '))]
    },
}

// Camera control

const CAMERA_CONTROL_PROPS: CameraControlProps = {
    onMove: noop,
    onZoom: noop,
    onHome: noop,
    presets: [
        { id: 'gate', name: 'Gate' },
        { id: 'quay', name: 'Quay' },
    ],
    preset: 'gate',
    onPreset: noop,
}

const CAMERA_CONTROL_ADAPTER: Adapter = {
    wordObjects: { CAMERA_CONTROL_WORDS },
    complete: ['CAMERA_CONTROL_WORDS'],
    words: Object.fromEntries(Object.keys(CAMERA_CONTROL_WORDS).map((key) => [key, `CAMERA_CONTROL_WORDS.${key}`])),
    options: {},
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the camera control states no effects'),
    keys: {
        Tab: () => {
            const drawn = draw(CameraControl, CAMERA_CONTROL_PROPS)
            const pad = drawn.find((element) => element.attrs['data-slot'] === 'camera-pad')
            if (pad?.attrs.tabindex !== '0') return 'the pad is not a stop'
            const stops = drawn
                .filter((element) => element.tag === 'button' && focusable(element))
                .map((element) => element.attrs['aria-label'] ?? element.text)
            return stops.join(', ') === 'Home, Zoom in, Zoom out, Gate, Quay'
                ? true
                : `the buttons in the tab order are ${stops.join(', ')}`
        },
        'ArrowUp, ArrowDown, ArrowLeft, ArrowRight (the pad has focus)': () => {
            const told: (CameraMove | null)[] = []
            return live(createElement(CameraControl, { ...CAMERA_CONTROL_PROPS, onMove: (move) => told.push(move) }), (box) => {
                const pad = box.querySelector<HTMLElement>('[data-slot="camera-pad"]')
                if (pad === null) return 'there is no pad'
                act(() => {
                    pad.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
                })
                act(() => {
                    pad.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }))
                })
                const said = told.map((move) => (move === null ? 'stop' : `${String(move.pan)} ${String(move.tilt)}`)).join(', ')
                return said === '-1 0, stop' ? true : `holding and letting go of ArrowLeft told ${said}`
            })
        },
    },
}

// Color field

const COLOR_FIELD_ADAPTER: Adapter = {
    wordObjects: { COLOR_FIELD_WORDS, COLOR_PICKER_WORDS },
    complete: ['COLOR_PICKER_WORDS'],
    words: {
        unreadable: 'COLOR_FIELD_WORDS.unreadable',
        example: 'COLOR_FIELD_WORDS.example',
        pick: 'COLOR_FIELD_WORDS.pick',
        clear: 'COLOR_FIELD_WORDS.clear',
        area: 'COLOR_PICKER_WORDS.area',
        areaValue: [
            'COLOR_PICKER_WORDS.areaValue',
            (said: (saturation: number, brightness: number) => string, fill) => said(Number(fill.saturation), Number(fill.brightness)),
        ],
        hue: 'COLOR_PICKER_WORDS.hue',
        swatches: 'COLOR_PICKER_WORDS.swatches',
    },
    options: {},
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the color field states no effects'),
    keys: {
        'Alt, ArrowDown (the input has focus)': () =>
            live(createElement(ColorField, { id: 'c', label: 'Color', defaultValue: '#1e90ff' }), (box) => {
                const input = box.querySelector<HTMLInputElement>('input')
                if (input === null) return 'there is no input'
                act(() => {
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
                })
                const trigger = box.querySelector<HTMLElement>('[aria-label="Choose a color"]')
                return trigger?.getAttribute('aria-expanded') === 'true' ? true : 'Alt and the down arrow did not open the picker'
            }),
        'ArrowLeft, ArrowRight (the area has focus)': () => {
            const told: string[] = []
            return live(createElement(ColorPicker, { value: '#808080', onValueChange: (value) => told.push(value) }), (box) => {
                const area = box.querySelector<HTMLElement>('[data-slot="color-area"]')
                if (area === null) return 'there is no area'
                act(() => {
                    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }))
                })
                return told.length === 1 && told[0] !== '#808080' ? true : `ArrowRight with Shift told ${told.join(', ')}`
            })
        },
        'ArrowUp, ArrowDown (the area has focus)': () => {
            const told: string[] = []
            return live(createElement(ColorPicker, { value: '#808080', onValueChange: (value) => told.push(value) }), (box) => {
                const area = box.querySelector<HTMLElement>('[data-slot="color-area"]')
                if (area === null) return 'there is no area'
                act(() => {
                    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true }))
                })
                return told[0] === '#9a9a9a' ? true : `ArrowUp with Shift told ${told.join(', ')}`
            })
        },
    },
    more: () => {
        const input = draw(ColorField, { id: 'c', label: 'Color', defaultValue: '#1e90ff' }).find((element) => element.tag === 'input')
        return [check('options.value (written as #rrggbb)', '#1e90ff', input?.attrs.value)]
    },
}

// Tags field

const TAGS_FIELD_PROPS: TagsFieldProps = { id: 'tags', label: 'Labels', defaultValue: ['harbor'], suggestions: ['juniper', 'larkspur'] }
/** A tags field drawn in the page, a key pressed in its input after typing `text`, and the tags it told. */
const tagsAfter = (text: string, key: string, props: Partial<TagsFieldProps> = {}) => {
    let told: string[] | undefined
    return live(createElement(TagsField, { ...TAGS_FIELD_PROPS, ...props, onValueChange: (tags) => (told = tags) }), (box) => {
        const input = box.querySelector<HTMLInputElement>('input')
        if (input === null) return 'no input'
        if (text !== '')
            act(() => {
                const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
                set?.call(input, text)
                input.dispatchEvent(new Event('input', { bubbles: true }))
            })
        act(() => {
            input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
        })
        return told === undefined ? 'nothing' : told.join(' ')
    })
}

const TAGS_FIELD_ADAPTER: Adapter = {
    wordObjects: { TAGS_FIELD_WORDS },
    complete: [],
    words: {
        remove: ['TAGS_FIELD_WORDS.remove', (said: (tag: string) => string, fill) => said(String(fill.tag))],
        duplicate: ['TAGS_FIELD_WORDS.duplicate', (said: (tag: string) => string, fill) => said(String(fill.tag))],
        full: ['TAGS_FIELD_WORDS.full', (said: (count: number) => string, fill) => said(Number(fill.count))],
        suggestions: 'TAGS_FIELD_WORDS.suggestions',
    },
    options: {},
    size: () => skip('a preview part: its sizes are not checked yet'),
    paint: () => skip('a preview part: its paints are not checked yet'),
    effect: () => skip('the tags field states no effects'),
    keys: {
        'Enter (the input has focus)': () => {
            const said = tagsAfter('orders', 'Enter')
            return said === 'harbor orders' ? true : `typing orders and Enter told ${said}`
        },
        ', (the input has focus)': () => {
            const said = tagsAfter('orders', ',')
            return said === 'harbor orders' ? true : `typing orders and a comma told ${said}`
        },
        'Backspace (the input is empty)': () => {
            const said = tagsAfter('', 'Backspace')
            return said === '' ? true : `Backspace in the empty input told ${said}`
        },
        'ArrowDown, ArrowUp (suggestions are open)': () => {
            const said = live(createElement(TagsField, { ...TAGS_FIELD_PROPS }), (box) => {
                const input = box.querySelector<HTMLInputElement>('input')
                if (input === null) return 'no input'
                act(() => {
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'r')
                    input.dispatchEvent(new Event('input', { bubbles: true }))
                })
                act(() => {
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
                })
                return box.querySelector('[role="option"][aria-selected="true"]')?.textContent ?? 'none'
            })
            return said === 'juniper' ? true : `ArrowDown marked ${said}`
        },
        'Escape (suggestions are open)': () => {
            const said = live(createElement(TagsField, { ...TAGS_FIELD_PROPS }), (box) => {
                const input = box.querySelector<HTMLInputElement>('input')
                if (input === null) return 'no input'
                act(() => {
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'jun')
                    input.dispatchEvent(new Event('input', { bubbles: true }))
                })
                act(() => {
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
                })
                return box.querySelector('[role="listbox"]') === null ? 'closed' : 'open'
            })
            return said === 'closed' ? true : 'Escape left the suggestions open'
        },
    },
}

// Playback timeline

const PLAYBACK_PROPS: PlaybackTimelineProps = {
    from: NOON - 2 * HOURS,
    to: NOON,
    value: NOON - HOURS,
    onValueChange: noop,
    activity: [4, 8, 2, 6],
    timeZone: 'UTC',
}
const playback = (props: Partial<PlaybackTimelineProps> = {}) => draw(PlaybackTimeline, { ...PLAYBACK_PROPS, ...props })
const PLAYBACKS = once(() => ({
    back: playback(),
    live: playback({ value: null }),
}))
const playbackPieces = (elements: El[]): Record<string, El | undefined> => {
    const head = bySlotIn(elements, 'playback-head')
    const rects = elements.filter((element) => element.tag === 'rect')
    return {
        container: bySlotIn(elements, 'playback-timeline'),
        bar: bySlotIn(elements, 'playback-readout')?.parent,
        readout: bySlotIn(elements, 'playback-readout'),
        strip: bySlotIn(elements, 'playback-strip'),
        head,
        line: elements.find((element) => element.parent === head),
        liveChip: bySlotIn(elements, 'time-mark'),
        barPlayed: rects[0],
        barAhead: rects.at(-1),
    }
}
/** What a playback timeline hands out when `act` presses on it, drawn in the page from `props`. */
function playbackHears(act_: (box: HTMLElement) => void, props: Partial<PlaybackTimelineProps> = {}): (number | null)[] {
    const heard: (number | null)[] = []
    live(
        createElement(PlaybackTimeline, {
            ...PLAYBACK_PROPS,
            ...props,
            onValueChange: (value) => heard.push(value),
        }),
        act_,
    )
    return heard
}
const headKeys = (keys: [string, KeyboardEventInit?][], props: Partial<PlaybackTimelineProps> = {}) =>
    playbackHears((box) => {
        const head = box.querySelector('[role="slider"]')
        for (const [key, init] of keys) press(head, key, init)
    }, props)
/** A move from the time shown, in minutes, or live. */
const minutes = (heard: (number | null)[], from = PLAYBACK_PROPS.value ?? NOON) =>
    heard.map((value) => (value === null ? 'live' : String((value - from) / 60_000))).join(' ')
/** How often playing moves the time on, in ms: what a second of playing hands out. */
function playFrame(): string {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
        const heard = playbackHears(() => act(() => vi.advanceTimersByTime(1_000)), { playing: true })
        return heard.length === 0 ? 'never' : String(1_000 / heard.length)
    } finally {
        vi.useRealTimers()
    }
}

const PLAYBACK_TIMELINE_ADAPTER: Adapter = {
    wordObjects: { PLAYBACK_TIMELINE_WORDS },
    complete: ['PLAYBACK_TIMELINE_WORDS'],
    words: Object.fromEntries(Object.keys(PLAYBACK_TIMELINE_WORDS).map((key) => [key, `PLAYBACK_TIMELINE_WORDS.${key}`])),
    options: {},
    size: () => skip('the playback timeline states no sizes: its strip height is a layout length'),
    paint: (_, name, state) => {
        if (name === 'barPlayed' || name === 'barAhead') return skip('a bar is an svg rect filled at an opacity: read in more')
        const pieces = playbackPieces(state === 'live' ? PLAYBACKS().live : PLAYBACKS().back)
        if (name === 'playhead') return state === 'focus' ? pieceWhere(pieces.head, ['focus-visible']) : pieceWhere(pieces.line)
        if (name === 'readout') return withPart(pieces.container, pieces.readout)
        return pieceWhere(pieces[name])
    },
    effect: () => skip('the playback timeline states no effects'),
    keys: {
        'ArrowLeft, ArrowDown (the playhead has focus)': () => {
            const tick = timelineTicks(NOON - 2 * HOURS, NOON, 640, 'UTC').step / 60_000
            const heard = minutes(headKeys([['ArrowLeft'], ['ArrowDown'], ['ArrowLeft', { shiftKey: true }]]))
            return heard === `-1 -1 ${String(-tick)}` ? true : `back a step, a step and a tick moves ${heard}`
        },
        'ArrowRight, ArrowUp (the playhead has focus)': () => {
            const tick = timelineTicks(NOON - 2 * HOURS, NOON, 640, 'UTC').step / 60_000
            const heard = minutes(headKeys([['ArrowRight'], ['ArrowUp'], ['ArrowRight', { shiftKey: true }]]))
            const atEdge = minutes(headKeys([['ArrowRight']], { value: NOON - 30_000 }))
            return heard === `1 1 ${String(tick)}` && atEdge === 'live'
                ? true
                : `on a step, a step and a tick moves ${heard}; at the edge ${atEdge}`
        },
        'PageDown, PageUp (the playhead has focus)': () => {
            const heard = minutes(headKeys([['PageDown'], ['PageUp']]))
            return heard === '-10 10' ? true : `ten steps back and on moves ${heard}`
        },
        'Home (the playhead has focus)': () => {
            const heard = minutes(headKeys([['Home']]))
            return heard === '-60' ? true : `Home moves ${heard}`
        },
        'End (the playhead has focus)': () => {
            const heard = minutes(headKeys([['End']]))
            return heard === 'live' ? true : `End moves ${heard}`
        },
    },
    more: () => {
        const { back, live: atLive } = PLAYBACKS()
        const pieces = playbackPieces(back)
        const bar = (rect: El | undefined) =>
            `${String(resolve([classesOf(rect)], [], READ.ink))}/${String(Math.round(Number(rect?.attrs['fill-opacity']) * 100))}`
        const shut = (elements: El[]) =>
            elements
                .filter((element) => element.tag === 'button' && 'disabled' in element.attrs)
                .map((element) => element.attrs['aria-label'] ?? element.text)
                .join(', ')
        const height = (rect: El | undefined) => rect?.attrs.height
        return [
            ...(['barPlayed', 'barAhead'] as const).map((name) =>
                check(`pieces.${name}.rest.ground`, String(SPECS.get('playback-timeline')?.pieces?.[name]?.rest.ground), bar(pieces[name])),
            ),
            check(
                'states.live (the readout says Live; Play and Step forward are shut)',
                'Live | Play, Step forward',
                `${String(playbackPieces(atLive).readout?.text)} | ${shut(atLive)}`,
            ),
            check(
                'states.back (the readout says the time shown; nothing shut)',
                'Nov 17, 11:00:00 | ',
                `${String(pieces.readout?.text)} | ${shut(back)}`,
            ),
            check(
                'states.back (a bar as tall as its count of the tallest, 80 percent of its bin)',
                '4 8 2 6 0.8',
                [
                    ...back.filter((element) => element.tag === 'rect').map(height),
                    back.find((element) => element.tag === 'rect')?.attrs.width,
                ].join(' '),
            ),
            check(
                'states.playing (playing up to the live edge returns to live)',
                'live',
                (() => {
                    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
                    try {
                        return minutes(
                            playbackHears(() => act(() => vi.advanceTimersByTime(250)), {
                                playing: true,
                                value: NOON - 10_000,
                            }),
                        )
                    } finally {
                        vi.useRealTimers()
                    }
                })(),
            ),
            ...layoutChecks('playback-timeline', {
                liveSnap: () => {
                    // The nearest a drag lets go and still plays back, on an axis 800 wide.
                    let x = 800
                    while (x > 0 && scrubTime(x, 800, NOON - 2 * HOURS, NOON, NOON) === null) x -= 1
                    return String(800 - x - 1)
                },
                frame: playFrame,
                stripHeight: () => lengthOn(pieces.strip, READ.height),
            }),
        ]
    },
}

// Status wall

const STATUS_WALL = source('components/StatusWall.tsx')
const TILE_PROPS: StatusTileProps = {
    name: 'api',
    status: 'up',
    caption: 'Service',
    icon: createElement(Server),
    value: '214',
    unit: 'ms',
    detail: 'Answering in time',
    series: [4, 8, 2, 6],
    flag: 'Simulated',
    updatedAt: NOON - 3_000,
    now: NOON,
}
const statusTile = (props: Partial<StatusTileProps> = {}) => draw(StatusTile, { ...TILE_PROPS, ...props })
const STATUS_TILES = once(() => ({
    ...(Object.fromEntries(WALL_STATUSES.map((status) => [status, statusTile({ status })])) as Record<WallStatus, El[]>),
    pressable: statusTile({ onSelect: noop }),
    selected: statusTile({ onSelect: noop, selected: true }),
    linked: statusTile({ href: 'https://example.org/sources/api' }),
}))
const statusTilePieces = (elements: El[]) => {
    const head = bySlotIn(elements, 'status-tile-head')
    const status = bySlotIn(elements, 'status-tile-status')
    const figure = bySlotIn(elements, 'status-tile-figure')
    const series = bySlotIn(elements, 'status-tile-series')
    const inside = (root: El | undefined, found: (element: El) => boolean) =>
        root === undefined ? undefined : elements.find((element) => within(element, root) && found(element))
    const row = inside(head, (element) => /\btext-label\b/.test(classesOf(element)))
    return {
        tile: bySlotIn(elements, 'status-tile'),
        glow: bySlotIn(elements, 'status-tile-glow'),
        cover: bySlotIn(elements, 'status-tile-cover'),
        head,
        caption: inside(head, (element) => /\btext-xs\b/.test(classesOf(element))),
        flag: inside(head, (element) => element.attrs['data-slot'] === 'chip'),
        row,
        name: inside(row, (element) => element.tag === 'span'),
        status,
        dot: inside(status, (element) => element.attrs['aria-hidden'] === 'true' && /\brounded-full\b/.test(classesOf(element))),
        figure,
        value: inside(figure, (element) => /\btext-statistic\b/.test(classesOf(element))),
        unit: inside(figure, (element) => !/\btext-statistic\b/.test(classesOf(element))),
        detail: bySlotIn(elements, 'status-tile-detail'),
        foot: bySlotIn(elements, 'status-tile-foot'),
        series,
        chart: inside(series, (element) => element.tag === 'svg'),
        area: inside(series, (element) => element.tag === 'path' && element.attrs.fill === 'currentColor'),
        line: inside(series, (element) => element.tag === 'path' && element.attrs.stroke === 'currentColor'),
    }
}
/** The token a tile's status color is: what its `--wall-tone` names. */
const wallTone = (elements: El[]) => /--wall-tone:\s*var\(--([a-z0-9-]+)\)/.exec(statusTilePieces(elements).tile?.attrs.style ?? '')?.[1]
/** The rule along a tile's top, in px, where it is drawn in the tile's status color. */
const wallRule = (elements: El[]) =>
    /(?:^|\s)shadow-\[inset_0_(\d+)px_0_var\(--wall-tone\)\]/.exec(classesOf(statusTilePieces(elements).tile))?.[1]
/** The narrowest a wall's tile gets, in px: the least its columns take. */
const wallTile = (tile?: StatusWallProps['tile']) =>
    numberIn(draw(StatusWall, { label: 'Sources', tile, children: null })[0]?.attrs.style ?? '', /minmax\(min\(([\d.]+)rem,/, 'rem')
const WALL_STATUS_SKIP = "the status color is the tile's --wall-tone, which a style sets: read in more"
/** Three tiles on a wall drawn in the page: a button, a plain tile and a link; `look` gets how often the button was pressed. */
const liveWall = <T>(look: (box: HTMLElement, selected: () => number) => T) => {
    let selected = 0
    return live(
        createElement(StatusWall, {
            label: 'Sources',
            children: [
                createElement(StatusTile, { ...TILE_PROPS, key: 'api', onSelect: () => (selected += 1) }),
                createElement(StatusTile, { ...TILE_PROPS, key: 'worker', name: 'worker' }),
                createElement(StatusTile, {
                    ...TILE_PROPS,
                    key: 'scheduler',
                    name: 'scheduler',
                    href: 'https://example.org/sources/scheduler',
                }),
            ],
        }),
        (box) => look(box, () => selected),
    )
}

const STATUS_WALL_ADAPTER: Adapter = {
    wordObjects: { STATUS_WALL_WORDS },
    complete: ['STATUS_WALL_WORDS'],
    words: Object.fromEntries(Object.keys(STATUS_WALL_WORDS).map((key) => [key, `STATUS_WALL_WORDS.${key}`])),
    options: {
        tile: [...(/const TILE = \{([^}]+)\}/.exec(STATUS_WALL)?.[1] ?? '').matchAll(/(\w+):/g)].map((match) => match[1]),
        status: [...WALL_STATUSES],
    },
    size: (size, key) => {
        const pieces = statusTilePieces(STATUS_TILES().up)
        if (size === 'wall') return pieceWhere(draw(StatusWall, { label: 'Sources', children: null })[0])
        if (size === 'head') return pieceWhere(key === 'gap' ? pieces.head : pieces.row)
        if (size === 'status') return pieceWhere(key === 'icon' ? pieces.dot : pieces.status)
        if (size === 'figure') return pieceWhere(key === 'text' ? pieces.value : pieces.figure)
        if (size === 'tile' || size === 'series') return pieceWhere(pieces[size])
        return undefined
    },
    paint: (_, name, state) => {
        const tiles = STATUS_TILES()
        const known = (WALL_STATUSES as readonly string[]).includes(state) && state !== 'unknown'
        if (name === 'tile') {
            if (known) return skip(WALL_STATUS_SKIP)
            if (state === 'unknown') return pieceWhere(statusTilePieces(tiles.unknown).tile)
            if (state === 'hover') return pieceWhere(statusTilePieces(tiles.pressable).tile, ['hover'])
            if (state === 'selected') return pieceWhere(statusTilePieces(tiles.selected).tile)
            if (state === 'focus') return pieceWhere(statusTilePieces(tiles.pressable).cover, ['focus-visible'])
            return pieceWhere(statusTilePieces(tiles.up).tile)
        }
        if (name === 'glow') return skip("the glow is a gradient of the tile's --wall-tone, which a style sets: read in more")
        if (name === 'series') return skip(WALL_STATUS_SKIP)
        if (name === 'status' && state !== 'rest')
            return skip('the dot is painted by a style its color sets: its ink and mark are read in more')
        const pieces = statusTilePieces(tiles.up)
        if (name === 'name') return withPart(pieces.row, pieces.name)
        if (name === 'caption' || name === 'status' || name === 'value' || name === 'unit' || name === 'detail')
            return pieceWhere(pieces[name])
        return undefined
    },
    effect: () => skip('the status wall states no effects'),
    keys: {
        Tab: () =>
            liveWall((box) => {
                const tiles = [...box.querySelectorAll('[data-slot="status-tile"]')]
                const stops = tiles.map((tile) => {
                    const cover = tile.querySelector<HTMLElement>('[data-slot="status-tile-cover"]')
                    if (cover === null) return 'none'
                    return cover.tabIndex < 0 || cover.hasAttribute('disabled') ? 'out of the tab order' : cover.tagName.toLowerCase()
                })
                // The cover is the tile's only stop, and the covers stand in the tiles' order.
                const others = box.querySelectorAll('button, a, [tabindex]').length - stops.filter((stop) => stop !== 'none').length
                return stops.join(' ') === 'button none a' && others === 0
                    ? true
                    : `a button, a plain and a linked tile stop at ${stops.join(', ')}, with ${String(others)} other stops`
            }),
        'Enter (a tile has focus)': () =>
            liveWall((box, selected) => {
                const [button, link] = [...box.querySelectorAll<HTMLElement>('[data-slot="status-tile-cover"]')]
                // A native button and a native link: a browser presses the one and follows the other on Enter.
                if (button?.tagName !== 'BUTTON') return 'a tile with onSelect is not a native button, which Enter presses'
                if (link?.tagName !== 'A' || link.getAttribute('href') !== 'https://example.org/sources/scheduler')
                    return 'a tile with href is not a native link to it, which Enter follows'
                act(() => button.click())
                return selected() === 1 ? true : `a press of the tile calls onSelect ${String(selected())} times`
            }),
        'Space (a tile with onSelect has focus)': () =>
            liveWall((box, selected) => {
                const button = box.querySelector<HTMLElement>('[data-slot="status-tile-cover"]')
                // A native button: a browser presses it on Space, and the press is a click.
                if (button?.tagName !== 'BUTTON' || button.getAttribute('type') !== 'button')
                    return 'a tile with onSelect is not a native button, which Space presses'
                act(() => button.click())
                return selected() === 1 ? true : `a press of the tile calls onSelect ${String(selected())} times`
            }),
    },
    more: () => {
        const tiles = STATUS_TILES()
        const spec = SPECS.get('status-wall')
        const up = statusTilePieces(tiles.up)
        const lone = statusTilePieces(draw(StatusTile, { name: 'api', status: 'up' }))
        const pulses = (element: El | undefined) => /\banimate-live\b/.test(classesOf(element))
        const wall = draw(StatusWall, { label: 'Sources', children: null })[0]
        return [
            ...WALL_STATUSES.flatMap((status) => {
                const pieces = statusTilePieces(tiles[status])
                const tone = wallTone(tiles[status])
                const named = (value: string | undefined) => value?.replace('wall-tone', String(tone))
                const dot = dotPaint(pieces.dot)
                const rule = wallRule(tiles[status])
                const glow = /color-mix\(in oklab, var\(--wall-tone\) (\d+)%, transparent\), transparent\)/.exec(
                    pieces.glow?.attrs.style ?? '',
                )
                const checks: Check[] = []
                if (status !== 'unknown') {
                    checks.push(
                        check(
                            `pieces.tile.${status}.edge`,
                            spec?.pieces?.tile[status].edge,
                            named(resolve([classesOf(pieces.tile)], [], READ.edge)),
                        ),
                        check(`pieces.tile.${status}.rule`, spec?.pieces?.tile[status].rule, rule === undefined ? undefined : tone),
                        check(
                            `pieces.glow.${status}.ground`,
                            spec?.pieces?.glow[status].ground,
                            glow === null ? undefined : `${String(tone)}/${glow[1]}`,
                        ),
                    )
                }
                checks.push(
                    check(
                        `pieces.status.${status}.ink`,
                        spec?.pieces?.status[status].ink,
                        resolve([classesOf(pieces.status)], [], READ.ink),
                    ),
                    // A hollow dot's mark is its edge.
                    check(`pieces.status.${status}.mark`, spec?.pieces?.status[status].mark, status === 'unknown' ? dot.edge : dot.ground),
                    check(
                        `pieces.series.${status}.mark`,
                        spec?.pieces?.series[status].mark,
                        /color:\s*var\(--wall-tone\)/.test(pieces.series?.attrs.style ?? '') ? tone : undefined,
                    ),
                )
                return checks
            }),
            check(
                'states.rest (each status says its word beside its dot)',
                'Up Degraded Down Unknown',
                WALL_STATUSES.map((status) => statusTilePieces(tiles[status]).status?.text).join(' '),
            ),
            check(
                'states.down (the dot and the glow breathe with the live pulse, and in no other status)',
                'down',
                WALL_STATUSES.filter((status) => {
                    const pieces = statusTilePieces(tiles[status])
                    return pulses(pieces.glow) && pulses(pieces.dot?.parent)
                }).join(' '),
            ),
            check(
                'states.unknown (a dashed edge, no rule, no glow and a hollow dot)',
                'dashed | no rule | no glow | hollow',
                (() => {
                    const pieces = statusTilePieces(tiles.unknown)
                    const dot = dotPaint(pieces.dot)
                    return [
                        /\bborder-dashed\b/.test(classesOf(pieces.tile)) ? 'dashed' : 'solid',
                        wallRule(tiles.unknown) === undefined ? 'no rule' : 'a rule',
                        pieces.glow === undefined ? 'no glow' : 'a glow',
                        dot.ground === undefined && /\bborder\b/.test(classesOf(pieces.dot)) ? 'hollow' : 'filled',
                    ].join(' | ')
                })(),
            ),
            check(
                'states.selected (a tile that is a button says whether it is pressed; a link says nothing)',
                'false true none',
                [tiles.pressable, tiles.selected, tiles.linked]
                    .map((elements) => statusTilePieces(elements).cover?.attrs['aria-pressed'] ?? 'none')
                    .join(' '),
            ),
            check(
                'states.hover (only a tile that is a control washes; a plain tile has no cover)',
                'none | no cover',
                `${resolve([classesOf(up.tile)], ['hover'], READ.ground) === 'hover' ? 'washed' : 'none'} | ${up.cover === undefined ? 'no cover' : 'a cover'}`,
            ),
            check(
                'states.rest (the series: a line at 70 percent over an area at 12 percent, both in the status color)',
                'currentColor 0.7 | currentColor 0.12',
                `${String(up.line?.attrs.stroke)} ${String(up.line?.attrs['stroke-opacity'])} | ${String(up.area?.attrs.fill)} ${String(up.area?.attrs['fill-opacity'])}`,
            ),
            check(
                'states.rest (equal values, or one, are a level line through the middle)',
                'M0.0 16.0 L50.0 16.0 L100.0 16.0 | M0 16.0 L100.0 16.0',
                `${wallSeriesPath([5, 5, 5])} | ${wallSeriesPath([5])}`,
            ),
            check(
                'states.rest (the series is decoration without seriesLabel, an image named by it with one)',
                'true | img Latency',
                (() => {
                    const named = statusTilePieces(statusTile({ seriesLabel: 'Latency' })).chart
                    return `${String(up.chart?.attrs['aria-hidden'])} | ${String(named?.attrs.role)} ${String(named?.attrs['aria-label'])}`
                })(),
            ),
            check(
                'states.rest (the figure, the detail, the freshness, the series and the caption line only with their options)',
                'none',
                (['caption', 'flag', 'figure', 'detail', 'foot', 'series'] as const).filter((name) => lone[name] !== undefined).join(' ') ||
                    'none',
            ),
            check(
                'states.rest (the freshness at the foot, No data for a source never heard from)',
                'live Live | lost No data',
                [tiles.up, statusTile({ updatedAt: null })]
                    .map((elements) => {
                        const fresh = bySlotIn(elements, 'freshness')
                        return `${String(fresh?.attrs['data-state'])} ${String(fresh?.text)}`
                    })
                    .join(' | '),
            ),
            check('states.rest (the flag is a chip at the end of the caption line)', 'Simulated', up.flag?.text),
            check(
                'states.rest (the wall is a group named by label, each tile an article)',
                'group Sources | article',
                `${String(wall?.attrs.role)} ${String(wall?.attrs['aria-label'])} | ${String(up.tile?.tag)}`,
            ),
            ...layoutChecks('status-wall', {
                tileSm: () => wallTile('sm'),
                // The default: no tile named.
                tileMd: () =>
                    wallTile() === wallTile('md') ? wallTile() : `${String(wallTile())} by default, ${String(wallTile('md'))} at md`,
                tileLg: () => wallTile('lg'),
                topRule: () => wallRule(tiles.up),
                glowHeight: () => lengthOn(up.glow, READ.height),
                seriesLine: () => up.line?.attrs['stroke-width'],
            }),
        ]
    },
}

// Alert ticker

const TICKER_ITEMS: AlertTickerItem[] = [
    { id: 'export', text: 'nightly-export failed at upload', tone: 'critical', when: '14:28', icon: createElement(Server) },
    { id: 'inventory', text: 'sync-inventory is running late', tone: 'warning', when: '14:21' },
    { id: 'index', text: 'rebuild-index succeeded' },
]
const ticker = (props: Partial<AlertTickerProps> = {}) => draw(AlertTicker, { items: TICKER_ITEMS, label: 'Alerts', ...props })
const TICKERS = once(() => ({
    plain: ticker(),
    pressable: ticker({ onSelect: noop }),
    empty: ticker({ items: [] }),
}))
const tickerPieces = (elements: El[]): Record<string, El | undefined> => {
    const item = bySlotIn(elements, 'alert-ticker-item')
    return {
        container: bySlotIn(elements, 'alert-ticker'),
        item,
        dot: elements.find((element) => element.attrs['aria-hidden'] === 'true' && /\brounded-full\b/.test(classesOf(element))),
        icon: elements.find((element) => element.parent === item && element.attrs['data-slot'] !== 'dot' && iconOf(elements, element)),
        when: bySlotIn(elements, 'alert-ticker-when'),
        position: bySlotIn(elements, 'alert-ticker-position'),
        empty: bySlotIn(elements, 'alert-ticker-empty'),
    }
}
/** The tone a ticker's shown alert has, by the state that names it; `rest` is an alert that names none. */
const TICKER_TONES: Record<string, AlertTickerItem['tone']> = {
    rest: undefined,
    critical: 'critical',
    warning: 'warning',
    good: 'good',
    quiet: 'quiet',
}
const tickerOf = (tone: AlertTickerItem['tone']) => ticker({ items: [{ id: 'one', text: 'send-digest queued', tone }] })
/**
 * A ticker drawn in the page on a clock the test moves: `look` gets the indexes it moved on to, and
 * `pass`, which lets that many ms go by.
 */
function tickerRuns<T>(props: Partial<AlertTickerProps>, look: (box: HTMLElement, moved: number[], pass: (ms: number) => void) => T): T {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
        const moved: number[] = []
        return live(
            createElement(AlertTicker, { items: TICKER_ITEMS, label: 'Alerts', ...props, onIndexChange: (index) => moved.push(index) }),
            (box) => look(box, moved, (ms) => act(() => vi.advanceTimersByTime(ms))),
        )
    } finally {
        vi.useRealTimers()
    }
}
const tickerItem = (box: HTMLElement) => box.querySelector<HTMLElement>('[data-slot="alert-ticker-item"]')
/** Whether the alert shown is sliding in, and from how far below, in px, over which motion token. */
const tickerSlide = (box: HTMLElement) => {
    const classes = tickerItem(box)?.className ?? ''
    return {
        moving: /(?:^|\s)animate-in(?:\s|$)/.test(classes) && /(?:^|\s)fade-in-0(?:\s|$)/.test(classes),
        from: numberIn(classes, /(?:^|\s)slide-in-from-bottom-([\d.]+)(?:\s|$)/, 'step'),
        over: durationIn(classes, /(?:^|\s)duration-(\w+)(?:\s|$)/),
        eased: /(?:^|\s)ease-motion(?:\s|$)/.test(classes),
    }
}
/** A pointer event as a browser sends it over the strip: React hears a pointer entering and leaving from these. */
const pointer = (target: Element | null, type: 'pointerover' | 'pointerout') =>
    act(() => {
        target?.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
    })
/** The first alert shown, held, then a newer alert put before it: whether the new one slides in. */
function tickerTakesPlace(): string {
    let put: (items: AlertTickerItem[]) => void = noop
    const Held = () => {
        const [items, setItems] = useState(TICKER_ITEMS)
        put = setItems
        return createElement(AlertTicker, { items, label: 'Alerts', paused: true })
    }
    return live(createElement(Held), (box) => {
        const first = tickerSlide(box).moving ? 'moving' : 'still'
        act(() => put([{ id: 'digest', text: 'send-digest failed at notify', tone: 'critical' }, ...TICKER_ITEMS]))
        return `${first} | ${tickerItem(box)?.textContent ?? 'nothing'} ${tickerSlide(box).moving ? 'moving' : 'still'}`
    })
}

const ALERT_TICKER_ADAPTER: Adapter = {
    wordObjects: { ALERT_TICKER_WORDS },
    complete: ['ALERT_TICKER_WORDS'],
    words: {
        empty: 'ALERT_TICKER_WORDS.empty',
        position: [
            'ALERT_TICKER_WORDS.position',
            (said: (index: number, count: number) => string, fill) => said(Number(fill.index), Number(fill.count)),
        ],
    },
    options: {},
    size: (size, key) => {
        const pieces = tickerPieces(TICKERS().plain)
        if (size === 'item' && key === 'icon') return pieceWhere(pieces.icon)
        return pieceWhere(pieces[size])
    },
    paint: (_, name, state) => {
        const tickers = TICKERS()
        if (name === 'dot') return skip('the dot is painted by a style its color sets: read in more')
        if (name === 'item') {
            const button = tickerPieces(tickers.pressable).item
            if (state === 'hover') return pieceWhere(button, ['hover'])
            if (state === 'focus') return pieceWhere(button, ['focus-visible'])
            const pieces = tickerPieces(tickers.plain)
            return withPart(pieces.container, pieces.item)
        }
        if (name === 'empty') {
            const pieces = tickerPieces(tickers.empty)
            return withPart(pieces.container, pieces.empty)
        }
        return pieceWhere(tickerPieces(tickers.plain)[name])
    },
    effect: () => skip('the alert ticker states no effects'),
    keys: {
        Tab: () => {
            const { item } = tickerPieces(TICKERS().pressable)
            if (item?.tag !== 'button' || !focusable(item)) return 'the alert shown is not a button in the tab order with onSelect'
            if (tickerPieces(TICKERS().plain).item?.tag === 'button') return 'the alert shown takes focus with no onSelect'
            return tickerRuns({ onSelect: noop }, (box, moved, pass) => {
                act(() => tickerItem(box)?.focus())
                pass(20_000)
                const held = moved.length
                act(() => tickerItem(box)?.blur())
                pass(5_000)
                return held === 0 && moved.join(' ') === '1'
                    ? true
                    : `with focus in it the ticker moves ${String(held)} times in 20 s; once focus leaves it moves to ${moved.slice(held).join(' ') || 'nothing'}`
            })
        },
        ...Object.fromEntries(
            ['Enter', 'Space'].map((key) => [
                `${key} (the alert has focus)`,
                () => {
                    const picked: string[] = []
                    return live(
                        createElement(AlertTicker, {
                            items: TICKER_ITEMS,
                            label: 'Alerts',
                            defaultIndex: 1,
                            paused: true,
                            onSelect: (id) => picked.push(id),
                        }),
                        (box) => {
                            const button = tickerItem(box)
                            // A native button: a browser presses it on Enter and Space, and the press is a click.
                            if (button?.tagName !== 'BUTTON' || button.getAttribute('type') !== 'button')
                                return `the alert shown is not a native button, which ${key} presses`
                            act(() => button.click())
                            return picked.join(' ') === 'inventory'
                                ? true
                                : `a press of the second alert picks ${picked.join(' ') || 'nothing'}`
                        },
                    )
                },
            ]),
        ),
    },
    more: () => {
        const tickers = TICKERS()
        const spec = SPECS.get('alert-ticker')
        const pieces = tickerPieces(tickers.plain)
        const button = tickerPieces(tickers.pressable).item
        /** Whether the ticker stays on its alert for 20 s, drawn with `props` and after `before`. */
        const holds_ = (props: Partial<AlertTickerProps>, before: (box: HTMLElement) => void = noop) =>
            tickerRuns(props, (box, moved, pass) => {
                before(box)
                pass(20_000)
                return moved.length === 0 ? 'held' : 'moves'
            })
        const reduced = () => {
            document.documentElement.setAttribute('data-motion', 'off')
            try {
                return holds_({})
            } finally {
                document.documentElement.removeAttribute('data-motion')
            }
        }
        return [
            ...Object.entries(TICKER_TONES).flatMap(([state, tone]) => {
                const paint = spec?.pieces?.dot[state]
                const found = dotPaint(tickerPieces(tickerOf(tone)).dot)
                return [
                    ...(paint?.mark === undefined ? [] : [check(`pieces.dot.${state}.mark`, paint.mark, found.ground)]),
                    ...(paint?.edge === undefined ? [] : [check(`pieces.dot.${state}.edge`, paint.edge, found.edge)]),
                ]
            }),
            check(
                'pieces.dot.rest.mark (info for an alert that says so, as for one with no tone)',
                String(spec?.pieces?.dot.rest.mark),
                dotPaint(tickerPieces(tickerOf('info')).dot).ground,
            ),
            check(
                'pieces.dot.quiet (hollow: an edge and no ground)',
                'hollow',
                (() => {
                    const dot = tickerPieces(tickerOf('quiet')).dot
                    return dotPaint(dot).ground === undefined && /\bborder\b/.test(classesOf(dot)) ? 'hollow' : 'filled'
                })(),
            ),
            check(
                'pieces.item.focus.ring.inset',
                String(spec?.pieces?.item.focus.ring?.inset),
                resolve([classesOf(button)], ['focus-visible'], READ.ringInset),
            ),
            check(
                'states.critical (the strip says the tone of the alert shown, info for one that names none; only a critical dot breathes)',
                'info critical warning good quiet | critical',
                `${Object.values(TICKER_TONES)
                    .map((tone) => tickerPieces(tickerOf(tone)).container?.attrs['data-tone'])
                    .join(' ')} | ${Object.values(TICKER_TONES)
                    .filter((tone) => /\banimate-live\b/.test(classesOf(tickerPieces(tickerOf(tone)).dot?.parent)))
                    .join(' ')}`,
            ),
            check(
                'states.rest (the first alert stands still, with when it happened and its place among the alerts)',
                'still | nightly-export failed at upload | 14:28 | 1 of 3',
                tickerRuns({}, (box) =>
                    [
                        tickerSlide(box).moving ? 'moving' : 'still',
                        tickerItem(box)?.textContent,
                        box.querySelector('[data-slot="alert-ticker-when"]')?.textContent,
                        box.querySelector('[data-slot="alert-ticker-position"]')?.textContent,
                    ].join(' | '),
                ),
            ),
            check(
                'states.moving (the interval passing: the next alert slides in, and the first again after the last)',
                'sync-inventory is running late moving 2 of 3 | 1 2 0',
                tickerRuns({}, (box, moved, pass) => {
                    pass(5_000)
                    const second = `${String(tickerItem(box)?.textContent)} ${tickerSlide(box).moving ? 'moving' : 'still'} ${String(
                        box.querySelector('[data-slot="alert-ticker-position"]')?.textContent,
                    )}`
                    pass(5_000)
                    pass(5_000)
                    return `${second} | ${moved.join(' ')}`
                }),
            ),
            check(
                "states.moving (the app's index: the ticker asks for the next and waits for it)",
                '1 | nightly-export failed at upload',
                tickerRuns({ index: 0 }, (box, moved, pass) => {
                    pass(20_000)
                    return `${moved.join(' ')} | ${String(tickerItem(box)?.textContent)}`
                }),
            ),
            check(
                "states.moving (a new alert taking the shown one's place slides in)",
                'still | send-digest failed at notify moving',
                tickerTakesPlace(),
            ),
            check(
                'states.held (paused, the pointer over the strip, focus in it, motion reduced, fewer than two alerts)',
                'held held held held held',
                [
                    holds_({ paused: true }),
                    holds_({}, (box) => pointer(box.querySelector('[data-slot="alert-ticker"]'), 'pointerover')),
                    holds_({ onSelect: noop }, (box) => act(() => tickerItem(box)?.focus())),
                    reduced(),
                    holds_({ items: TICKER_ITEMS.slice(0, 1) }),
                ].join(' '),
            ),
            check(
                'states.held (it moves on once the pointer leaves)',
                '1',
                tickerRuns({}, (box, moved, pass) => {
                    const strip = box.querySelector('[data-slot="alert-ticker"]')
                    pointer(strip, 'pointerover')
                    pass(20_000)
                    pointer(strip, 'pointerout')
                    pass(5_000)
                    return moved.join(' ')
                }),
            ),
            check(
                'states.empty (the strip keeps its height and says so, with no place)',
                'No alerts | 40 | no place',
                (() => {
                    const empty = tickerPieces(tickers.empty)
                    return `${String(empty.empty?.text)} | ${String(lengthOn(empty.container, READ.height))} | ${empty.position === undefined ? 'no place' : 'a place'}`
                })(),
            ),
            check(
                'states.rest (the place only with two alerts or more; a region named by label; the words cut to one line)',
                'no place | section Alerts | truncate',
                [
                    tickerPieces(ticker({ items: TICKER_ITEMS.slice(0, 1) })).position === undefined ? 'no place' : 'a place',
                    `${String(pieces.container?.tag)} ${String(pieces.container?.attrs['aria-label'])}`,
                    tickers.plain.some((element) => element.parent === pieces.item && /\btruncate\b/.test(classesOf(element)))
                        ? 'truncate'
                        : 'not cut',
                ].join(' | '),
            ),
            ...layoutChecks('alert-ticker', {
                // How long the first alert stands with no interval given, to a tenth of a second.
                interval: () =>
                    tickerRuns({}, (_, moved, pass) => {
                        let waited = 0
                        while (moved.length === 0 && waited < 60_000) {
                            pass(100)
                            waited += 100
                        }
                        return moved.length === 0 ? 'never' : String(waited)
                    }),
                slide: () =>
                    tickerRuns({}, (box, _, pass) => {
                        pass(5_000)
                        const slide = tickerSlide(box)
                        return slide.eased ? slide.over : `${String(slide.over)}, not eased by motion-ease`
                    }),
                slideFrom: () =>
                    tickerRuns({}, (box, _, pass) => {
                        pass(5_000)
                        return tickerSlide(box).from
                    }),
            }),
        ]
    },
}

// Kiosk

const KIOSK = source('components/Kiosk.tsx')
const KIOSK_PROPS: KioskProps = {
    mark: createElement('span', { 'data-mark': '' }, 'Tidevann'),
    title: 'Harbor',
    clock: '14:32',
    actions: createElement(Button, { variant: 'ghost', size: 'sm' }, 'Leave'),
    figures: createElement(
        Fragment,
        {},
        createElement(Stat, { label: 'Sources', value: '12' }),
        createElement(Stat, { label: 'Tracks', value: '248' }),
    ),
    children: createElement('div', { 'data-stage': '' }, 'Map'),
    aside: createElement(Button, { variant: 'outline', size: 'sm' }, 'Sources'),
    foot: createElement(AlertTicker, { items: TICKER_ITEMS, label: 'Alerts', paused: true, onSelect: noop }),
    label: 'Harbor wall',
}
const kiosk = (props: Partial<KioskProps> = {}) => draw(Kiosk, { ...KIOSK_PROPS, ...props })
const KIOSKS = once(() => ({
    full: kiosk(),
    bare: draw(Kiosk, { title: 'Harbor', children: 'Map' }),
}))
const kioskPieces = (elements: El[]): Record<string, El | undefined> => {
    const frame = bySlotIn(elements, 'kiosk')
    const head = bySlotIn(elements, 'kiosk-head')
    const stage = bySlotIn(elements, 'kiosk-stage')
    return {
        frame,
        // The column the frame's pieces stand in, which holds its padding and its gaps.
        column: elements.find((element) => element.parent === frame),
        head,
        mark: elements.find((element) => element.parent === head && element.tag === 'span' && element.attrs['data-slot'] === undefined),
        title: elements.find((element) => element.tag === 'h1'),
        actions: bySlotIn(elements, 'kiosk-actions'),
        clock: bySlotIn(elements, 'kiosk-clock'),
        figures: bySlotIn(elements, 'kiosk-figures'),
        body: bySlotIn(elements, 'kiosk-body'),
        stage,
        over: elements.find((element) => element.parent === stage),
        aside: bySlotIn(elements, 'kiosk-aside'),
        foot: bySlotIn(elements, 'kiosk-foot'),
    }
}
/** The variants the frame's wide room turns on: its own width from 48rem. */
const KIOSK_WIDE = ['@3xl']
/** The aside's width beside the stage, in px, at one of its widths. */
const kioskAside = (asideWidth?: KioskProps['asideWidth']) =>
    numberIn(classesOf(kioskPieces(kiosk({ asideWidth })).body), /(?:^|\s)@3xl:grid-cols-\[minmax\(0,1fr\)_([\d.]+)rem\]/, 'rem')

/** The kiosk is a frame: what stands in it (stats, a map, an alert ticker) has specs of its own. */
const KIOSK_ADAPTER: Adapter = {
    wordObjects: {},
    complete: [],
    words: {},
    options: { asideWidth: unionIn(KIOSK, 'KioskAsideWidth') },
    size: (size, key) => {
        const pieces = kioskPieces(KIOSKS().full)
        if (size === 'frame') return pieceWhere(pieces.column)
        if (size === 'head') return pieceWhere(key === 'text' ? pieces.title : pieces.head)
        if (size === 'clock') return pieceWhere(pieces.clock, KIOSK_WIDE)
        return pieceWhere(pieces[size])
    },
    paint: (_, name, state) => {
        const pieces = kioskPieces(KIOSKS().full)
        if (state !== 'rest' && state !== 'stacked') return undefined
        return pieceWhere(pieces[name], state === 'rest' ? KIOSK_WIDE : [])
    },
    effect: () => skip('the kiosk states no effects'),
    keys: {
        Tab: () =>
            live(
                createElement(Kiosk, {
                    ...KIOSK_PROPS,
                    children: createElement(Button, {}, 'Map'),
                }),
                (box) => {
                    const frame = box.querySelector('[data-slot="kiosk"]')
                    const stops = [...(frame?.querySelectorAll<HTMLElement>('button, a, [tabindex]') ?? [])]
                    const places = stops.map((stop) => {
                        const piece = stop.closest('[data-slot^="kiosk-"]:not([data-slot="kiosk-head"])')
                        return piece?.getAttribute('data-slot')?.replace('kiosk-', '') ?? 'the frame'
                    })
                    // The frame adds no stop of its own, and its pieces stand in the order Tab walks them.
                    return places.join(' ') === 'actions stage aside foot' && stops.every((stop) => stop.tabIndex >= 0)
                        ? true
                        : `Tab stops at ${places.join(', ') || 'nothing'}`
                },
            ),
    },
    more: () => {
        const { full, bare } = KIOSKS()
        const pieces = kioskPieces(full)
        const without = kioskPieces(bare)
        const wide = (element: El | undefined, read: Reader) => resolve([classesOf(element)], KIOSK_WIDE, read)
        const has = (element: El | undefined, name: string) => classesOf(element).split(/\s+/).includes(name)
        const rows = (element: El | undefined) => /(?:^|\s)grid-rows-\[minmax\(([\d.]+)rem,1fr\)(_auto)?\]/.exec(classesOf(element))
        return [
            check(
                'sizes.frame (16, 16 and 16 from a room 768 wide, the stage and the aside 16 apart too)',
                '16 16 16 | 16',
                `${[READ.pad, READ.pad, READ.gap].map((read) => wide(pieces.column, read)).join(' ')} | ${String(wide(pieces.body, READ.gap))}`,
            ),
            check(
                'states.rest (the frame as tall as its room on a column that grows to it; the aside beside the stage, as tall as it and scrolling by itself)',
                'h-full | beside | one row | scrolls by itself',
                [
                    has(pieces.frame, 'h-full') && has(pieces.column, 'grow') ? 'h-full' : 'its own height',
                    kioskAside() === undefined ? 'under' : 'beside',
                    has(pieces.body, '@3xl:grid-rows-[minmax(0,1fr)]') ? 'one row' : 'two rows',
                    has(pieces.aside, '@3xl:overflow-y-auto') && has(pieces.aside, 'min-h-0') ? 'scrolls by itself' : 'grows',
                ].join(' | '),
            ),
            check(
                'states.stacked (one column, the aside under the stage at its own height, the frame scrolling down and never sideways)',
                'one column | under at its own height | scrolls down | never sideways',
                [
                    has(pieces.body, 'grid-cols-1') ? 'one column' : 'columns',
                    rows(pieces.body)?.[2] === '_auto' ? 'under at its own height' : 'no row of its own',
                    has(pieces.frame, 'overflow-y-auto') ? 'scrolls down' : 'does not scroll',
                    has(pieces.frame, 'overflow-x-hidden') ? 'never sideways' : 'sideways',
                ].join(' | '),
            ),
            check(
                'states.stacked (the frame pads and spaces 12, the stage and the aside 12 apart)',
                '12 12 | 12',
                `${String(lengthOn(pieces.column, READ.pad))} ${String(lengthOn(pieces.column, READ.gap))} | ${String(lengthOn(pieces.body, READ.gap))}`,
            ),
            check(
                'states.rest (a region named by label, its title the heading cut to one line, its clock in tabular figures on one line)',
                'section Harbor wall | h1 truncate | tabular-nums whitespace-nowrap',
                [
                    `${String(pieces.frame?.tag)} ${String(pieces.frame?.attrs['aria-label'])}`,
                    `${String(pieces.title?.tag)} ${has(pieces.title, 'truncate') ? 'truncate' : 'wraps'}`,
                    ['tabular-nums', 'whitespace-nowrap'].filter((name) => has(pieces.clock, name)).join(' '),
                ].join(' | '),
            ),
            check(
                "states.rest (what is on the stage is laid over the stage's box and fills it; the head, the counters and the foot never shrink)",
                'absolute inset-0 | *:flex-1 | shrink-0 shrink-0 shrink-0',
                [
                    ['absolute', 'inset-0'].filter((name) => has(pieces.over, name)).join(' '),
                    has(pieces.over, '*:flex-1') ? '*:flex-1' : 'at its own height',
                    [pieces.head, pieces.figures, pieces.foot]
                        .map((element) => (has(element, 'shrink-0') ? 'shrink-0' : 'shrinks'))
                        .join(' '),
                ].join(' | '),
            ),
            check(
                'states.rest (the mark, the actions, the clock, the counters, the aside and the foot only with their options)',
                'none',
                (['mark', 'actions', 'clock', 'figures', 'aside', 'foot'] as const)
                    .filter((name) => without[name] !== undefined)
                    .join(' ') || 'none',
            ),
            check(
                'states.rest (the counters in as many equal columns as fit, each row filled to its ends)',
                'repeat(auto-fit, minmax(min(9rem, 100%), 1fr))',
                /grid-template-columns:\s*([^;]+)/.exec(pieces.figures?.attrs.style ?? '')?.[1],
            ),
            ...layoutChecks('kiosk', {
                // The frame is the container its pieces ask: `@3xl` is its own width, not the window's.
                wide: () =>
                    has(pieces.frame, '@container') && /(?:^|\s)@3xl:/.test(classesOf(pieces.column))
                        ? tailwind('container', '3xl')
                        : undefined,
                // The stage's row while stacked, and the body's least height beside the aside.
                stageMinHeight: () => {
                    const stacked = [rows(pieces.body), rows(without.body)].map((found) =>
                        found === null ? undefined : String(Number(found[1]) * 16),
                    )
                    const beside = wide(pieces.body, READ.minHeight)
                    return new Set([...stacked, beside]).size === 1 ? beside : `${stacked.join(' and ')} stacked, ${String(beside)} wide`
                },
                figureMinWidth: () => numberIn(pieces.figures?.attrs.style ?? '', /minmax\(min\(([\d.]+)rem,/, 'rem'),
                asideSm: () => kioskAside('sm'),
                // The default: no width named.
                asideMd: () =>
                    kioskAside() === kioskAside('md')
                        ? kioskAside()
                        : `${String(kioskAside())} by default, ${String(kioskAside('md'))} at md`,
                asideLg: () => kioskAside('lg'),
                headRowGap: () => lengthOn(pieces.head, lengthOf('gap-y-')),
            }),
        ]
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
    'call-tile': CALL_TILE_ADAPTER,
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
    chip: CHIP_ADAPTER,
    stat: STAT_ADAPTER,
    'description-list': DESCRIPTION_LIST_ADAPTER,
    'api-link': API_LINK_ADAPTER,
    'issue-count': ISSUE_COUNT_ADAPTER,
    'server-menu': SERVER_MENU_ADAPTER,
    'item-card': ITEM_CARD_ADAPTER,
    'sortable-grid': SORTABLE_GRID_ADAPTER,
    'markdown-view': MARKDOWN_VIEW_ADAPTER,
    'track-layer': TRACK_LAYER_ADAPTER,
    'map-ruler': MAP_RULER_ADAPTER,
    'map-coordinates': MAP_COORDINATES_ADAPTER,
    'map-go-to': MAP_GO_TO_ADAPTER,
    'map-follow': MAP_FOLLOW_ADAPTER,
    'map-compass': MAP_COMPASS_ADAPTER,
    'zone-layer': ZONE_LAYER_ADAPTER,
    'coverage-layer': COVERAGE_LAYER_ADAPTER,
    'link-layer': LINK_LAYER_ADAPTER,
    'track-glyph': TRACK_GLYPH_ADAPTER,
    freshness: FRESHNESS_ADAPTER,
    'track-card': TRACK_CARD_ADAPTER,
    'track-roster': TRACK_ROSTER_ADAPTER,
    'detection-overlay': DETECTION_OVERLAY_ADAPTER,
    'video-follow': VIDEO_FOLLOW_ADAPTER,
    'camera-wall': CAMERA_WALL_ADAPTER,
    'detection-timeline': DETECTION_TIMELINE_ADAPTER,
    'detection-gallery': DETECTION_GALLERY_ADAPTER,
    'picture-zones': PICTURE_ZONES_ADAPTER,
    'camera-control': CAMERA_CONTROL_ADAPTER,
    'color-field': COLOR_FIELD_ADAPTER,
    'tags-field': TAGS_FIELD_ADAPTER,
    'task-card': TASK_CARD_ADAPTER,
    'playback-timeline': PLAYBACK_TIMELINE_ADAPTER,
    'status-wall': STATUS_WALL_ADAPTER,
    'alert-ticker': ALERT_TICKER_ADAPTER,
    kiosk: KIOSK_ADAPTER,
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

async function keyChecks(spec: Spec, adapter: Adapter): Promise<Check[]> {
    const checks: Check[] = []
    // One probe at a time: each draws in the same page.
    for (const binding of spec.keyboard) {
        const name = keyName(binding)
        const probe = adapter.keys[name]
        if (probe === undefined) {
            checks.push(
                check(`keyboard.${name}`, binding.does, 'no probe in parts.test: say where sokkel-ui handles it, or why it cannot be read'),
            )
            continue
        }
        if (isSkip(probe)) continue
        const found = await probe()
        checks.push(check(`keyboard.${name}`, binding.does, found === true ? binding.does : found))
    }
    return checks
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
async function checksOf(id: string): Promise<Check[]> {
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
        ...(await keyChecks(spec, adapter)),
        ...((await adapter.more?.()) ?? []),
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
async function holds(id: string, ...aspects: string[]) {
    const allow = allowed(id)
    const differing = (await checksOf(id)).filter(
        (one) => aspects.some((aspect) => one.key.startsWith(aspect)) && !one.same && !allow.has(one.key),
    )
    expect(differing.map((one) => said(id, one))).toEqual([])
}

describe('the design pin', () => {
    it('has an adapter for every part and pattern in the contract', () => {
        expect([...SPECS.keys()].filter((id) => ADAPTERS[id] === undefined)).toEqual([])
    })
})

for (const id of SPECS.keys()) {
    // A preview spec's sizes, paints and layout may still move, so only its words, options, keys and routes are held.
    const preview = SPECS.get(id)?.status === 'preview'
    describe(id, () => {
        it('says the words the spec lists, and no word it does not', () => holds(id, 'words.'))
        it("keys its words by the catalogs' message ids", () => holds(id, 'messages.'))
        it('takes the values each option lists', () => holds(id, 'options.'))
        it.skipIf(preview)('draws each size at the lengths the spec gives', () => holds(id, 'sizes.'))
        it.skipIf(preview)('paints each state as the spec does', () => holds(id, 'variants.', 'pieces.', 'states.'))
        it('handles the keys the spec binds', () => holds(id, 'keyboard.'))
        it('meets the rest of the spec', () => (preview ? holds(id, 'routes.') : holds(id, 'routes.', 'layout.')))
        it("states its drift: each of sokkel-ui's drift entries still differs, and nothing else is allowed to", async () => {
            const spec = SPECS.get(id)
            const checks = await checksOf(id)
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
