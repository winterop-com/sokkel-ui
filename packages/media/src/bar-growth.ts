/**
 * How the player along the foot of a screen grows from its one line, as arithmetic over its own
 * height and width: the heights where things change and the sizes that scale between them.
 */

/**
 * How the bar grows once it is dragged taller than its one line:
 *
 * - `rows`: what plays, the transport and the volume in a top row over a waveform as wide as the
 *   bar, with the cover across both rows.
 * - `panel`: the large now-playing panel, the cover flush and as tall as the bar, the words and the
 *   waveform over the transport.
 * - `stage`: a stage centered on the bar, the words over a wide waveform with the transport under
 *   it, between the cover and the volume.
 */
export type MediaBarLayout = 'rows' | 'panel' | 'stage'

/** The one-line bar's height, the least the bar is dragged to. */
export const LINE = 64

/** The bar's own width from which it lays out on one row, the `@2xl` container size. */
export const WIDE = 672

/** The transport's row under the panel: `--spacing-shell-foot`. */
export const FOOT = 46

/** The fullscreen view's width under which it is laid out for a phone. */
export const PHONE = 640

/** The height from which each layout leaves the one line and grows; under it every layout is the one-line bar. */
export const GROWS_FROM: Readonly<Record<MediaBarLayout, number>> = { rows: 96, panel: 104, stage: 96 }

/** The height from which the transport takes its larger size. */
export const TALL = 260

/** The height at which the growth is complete; past it only the room for the words grows. */
const GROWN = 300

/** The height of the stage's transport row. */
const STAGE_CONTROLS = 36

/** The least width the stage keeps between the cover and the volume. */
const STAGE_LEAST = 360

/** The least width of a stage's side column that holds the volume's slider. */
const STAGE_SIDE = 176

/** The width the top row of `rows` needs beside the cover for the volume's slider. */
const ROWS_VOLUME_ROOM = 600

/** The width the panel needs beside its cover for the volume's slider. */
const PANEL_VOLUME_ROOM = 480

/** The least width the panel keeps beside a wide bar's cover. */
const PANEL_LEAST = 360

/** Whether the layout has left the one line at this height. */
export function grows(layout: MediaBarLayout, height: number): boolean {
    return height >= GROWS_FROM[layout]
}

/** How far `value` has come from `from` to `to`, from 0 to 1. */
export function ramp(value: number, from: number, to: number): number {
    return Math.min(1, Math.max(0, (value - from) / (to - from)))
}

/** The number `at` of the way from `from` to `to`. */
export function blend(from: number, to: number, at: number): number {
    return from + (to - from) * at
}

/** The whole number `at` of the way from `from` to `to`. */
export function mix(from: number, to: number, at: number): number {
    return Math.round(blend(from, to, at))
}

// The room the words have is reckoned before the sizes beside it are rounded, so it only ever grows
// with the bar and the words never step back to saying less while it is dragged taller.

/** The height at which the visualizer starts to show behind the words, and the height it is at its most from. */
export const GLOW_FROM = 88
export const GLOW_FULL = 220

/** The most the visualizer shows behind the words, faint enough that they stay clear over it. */
export const GLOW_MOST = 0.3

/**
 * How strongly the visualizer shows behind the words at this height: nothing up to `GLOW_FROM`,
 * rising fast at first so it is plainly there by the time a layout grows, and at its most from
 * `GLOW_FULL`.
 */
export function glow(height: number): number {
    return GLOW_MOST * Math.sqrt(ramp(height, GLOW_FROM, GLOW_FULL))
}

/**
 * How much the words say in the room they have: the title and the artist on one line, the two on
 * two lines, the liner (a line in the accent over the title and the artist), and the liner at its
 * largest.
 */
export type Tier = 'line' | 'pair' | 'liner' | 'poster'

const TIERS: readonly Tier[] = ['line', 'pair', 'liner', 'poster']

/** The room each tier needs, in pixels. */
export const TIER_ROOM: Readonly<Record<Tier, number>> = { line: 22, pair: 44, liner: 74, poster: 120 }

/** The most the words say in `room` pixels, never more than `most`. */
export function tierFor(room: number, most: Tier = 'poster'): Tier {
    const fits = [...TIERS].reverse().find((tier) => room >= TIER_ROOM[tier]) ?? 'line'
    return TIERS.indexOf(fits) > TIERS.indexOf(most) ? most : fits
}

/** What `rows` is at one height and width. */
export interface RowsGrowth {
    /** The room above and below the two rows. */
    pad: number
    /** The waveform's height, the bottom row. */
    wave: number
    /** The room between the two rows. */
    gap: number
    /** The top row's height. */
    head: number
    tier: Tier
    /** The cover's side: across both rows on a wide bar, beside the words in the top row on a narrow one. */
    cover: number
    /** Whether the fullscreen button has the bar's corner, the top row being tall enough to keep it clear of the controls. */
    corner: boolean
    /** Whether the volume is drawn as the mute button alone, its slider having no room. */
    compactVolume: boolean
}

/**
 * `rows`: the waveform grows from 18 to 96 pixels between the bar's growing and `TALL`, and the top
 * row takes what it leaves, its words saying more as it grows; on a narrow bar they stop at two
 * lines, as the transport shares their row, and short of room for the volume's slider they stop at
 * the liner. A wide bar's cover is as tall as the two rows, up to a quarter of the width.
 */
export function rowsGrowth(height: number, width: number): RowsGrowth {
    const narrow = width < WIDE
    const padAt = blend(10, 14, ramp(height, GROWS_FROM.rows, GROWN))
    const waveAt = blend(18, 96, ramp(height, GROWS_FROM.rows, TALL))
    const gap = 8
    const room = height - 2 * padAt - waveAt - gap
    const pad = Math.round(padAt)
    const wave = Math.round(waveAt)
    const cover = narrow ? Math.min(Math.floor(room), 72) : Math.min(height - 2 * pad, Math.round(width * 0.25))
    const compactVolume = width - 24 - cover - 16 < ROWS_VOLUME_ROOM
    return {
        pad,
        wave,
        gap,
        head: height - 2 * pad - wave - gap,
        tier: tierFor(room, narrow ? 'pair' : compactVolume ? 'liner' : 'poster'),
        cover,
        corner: room >= 64,
        compactVolume,
    }
}

/**
 * The least height at which a wide `rows` bar draws its cover `cover` pixels across, such as a
 * height to start at; the bar's width must be at least four times the cover. Under the height the
 * layout grows from, it is that height.
 */
export function rowsHeightFor(cover: number): number {
    if (!Number.isFinite(cover)) return GROWS_FROM.rows
    let height = Math.max(GROWS_FROM.rows, Math.ceil(cover))
    while (rowsGrowth(height, Number.POSITIVE_INFINITY).cover < cover) height += 1
    return height
}

/** What `panel` is at one height and width. */
export interface PanelGrowth {
    /** The waveform's height. */
    wave: number
    /** The room between the words and the waveform. */
    gap: number
    /** The room the words have over the waveform. */
    room: number
    tier: Tier
    /** The cover's side: flush and as tall as the bar on a wide one, beside the words on a narrow one, where 0 leaves it out. */
    cover: number
    compactVolume: boolean
}

/**
 * `panel`: from `GROWS_FROM.panel` the waveform grows from 20 to 60 pixels and the words say more
 * as their room grows. A wide bar's cover is as tall as the bar, leaving the panel beside it at
 * least 360 pixels; a narrow bar puts a cover of up to 112 pixels beside the words once there is
 * room for one.
 */
export function panelGrowth(height: number, width: number): PanelGrowth {
    const narrow = width < WIDE
    const grown = ramp(height, GROWS_FROM.panel, GROWN)
    const room = height - FOOT - blend(20, 60, grown) - blend(4, 12, grown) - 12
    const beside = Math.min(112, Math.floor(room))
    const cover = narrow ? (beside >= 44 ? beside : 0) : Math.min(height, width - PANEL_LEAST)
    return {
        wave: mix(20, 60, grown),
        gap: mix(4, 12, grown),
        room,
        tier: tierFor(room, narrow ? 'liner' : 'poster'),
        cover,
        compactVolume: width - cover < PANEL_VOLUME_ROOM,
    }
}

/** What `stage` is at one height and width. */
export interface StageGrowth {
    /** The room around the bar's edge. */
    pad: number
    wave: number
    /** The room between the words, the waveform and the transport. */
    gap: number
    room: number
    tier: Tier
    /** The width of each side column; 0 on a narrow bar, which has none. */
    side: number
    /** The cover's side in the left column; 0 on a narrow bar. */
    cover: number
    /** The height under the visualizer, from the bar's foot to the waveform's top, which it stands on. */
    under: number
    compactVolume: boolean
    /** Whether the transport takes its larger size. */
    tall: boolean
}

/**
 * `stage`: from `GROWS_FROM.stage` the waveform grows from 18 to 56 pixels and the words say more
 * as their room grows. The two side columns are as wide as each other, so the stage stays
 * centered on the bar: as wide as the cover, never narrower than the volume needs, and never so
 * wide that the stage has less than 360 pixels.
 */
export function stageGrowth(height: number, width: number): StageGrowth {
    const narrow = width < WIDE
    const padded = ramp(height, GROWS_FROM.stage, GLOW_FULL)
    const grown = ramp(height, GROWS_FROM.stage, GROWN)
    const room = height - 2 * blend(6, 16, padded) - blend(18, 56, grown) - STAGE_CONTROLS - 2 * blend(2, 12, grown)
    const pad = mix(6, 16, padded)
    const wave = mix(18, 56, grown)
    const gap = mix(2, 12, grown)
    const most = Math.floor((width - 2 * pad - 2 * 24 - STAGE_LEAST) / 2)
    const side = narrow ? 0 : Math.max(0, Math.min(Math.max(height - 2 * pad, STAGE_SIDE), most))
    return {
        pad,
        wave,
        gap,
        room,
        tier: tierFor(room, narrow ? 'liner' : 'poster'),
        side,
        cover: narrow ? 0 : Math.min(height - 2 * pad, side),
        under: pad + STAGE_CONTROLS + 2 * gap + wave,
        compactVolume: side < STAGE_SIDE,
        tall: height >= TALL,
    }
}
