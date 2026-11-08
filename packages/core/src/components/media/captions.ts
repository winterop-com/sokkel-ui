import type { CSSProperties } from 'react'

/** The inks a viewer may pick for captions, each a `--caption-*` token. */
export type CaptionColor = 'white' | 'yellow' | 'green' | 'cyan' | 'magenta'

/** What stands behind caption text: nothing, a see-through box, or a solid one. */
export type CaptionBackground = 'none' | 'translucent' | 'solid'

/** What holds caption text against a bright picture: an outline, a drop shadow, or nothing. */
export type CaptionEdge = 'outline' | 'shadow' | 'none'

/** How captions look. */
export interface CaptionStyle {
    /** The text's size as a share of the usual (`--caption-size`): 1 is the usual, 0.5 half of it. */
    size: number
    color: CaptionColor
    background: CaptionBackground
    edge: CaptionEdge
}

/**
 * What a viewer chose for captions, kept between videos: how they look and which track is on.
 * `track` is the chosen track's key (`captionTrackKey`), null when captions are off, and absent
 * while the viewer has chosen none, so the track marked `default` shows.
 */
export interface CaptionSettings extends CaptionStyle {
    track?: string | null
}

/** The sizes the captions menu offers, as shares of the usual. */
export const CAPTION_SIZES: readonly number[] = [0.5, 0.75, 1, 1.5, 2]
export const CAPTION_COLORS: readonly CaptionColor[] = ['white', 'yellow', 'green', 'cyan', 'magenta']
export const CAPTION_BACKGROUNDS: readonly CaptionBackground[] = ['none', 'translucent', 'solid']
export const CAPTION_EDGES: readonly CaptionEdge[] = ['outline', 'shadow', 'none']

/** Captions as the library draws them until told otherwise: words on the picture, outlined, with no box. */
export const CAPTION_STYLE: CaptionStyle = { size: 1, color: 'white', background: 'none', edge: 'outline' }

/** The key `VideoPlayer` keeps a viewer's caption settings under, after the app's prefix, unless the app hands it a store. */
export const CAPTIONS_KEY = 'video.captions'

/** The smallest and largest share of the usual size a kept setting may ask for. */
const SMALLEST = 0.25
const LARGEST = 4

const isSize = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= SMALLEST && value <= LARGEST
const oneOf =
    <T extends string>(options: readonly T[]) =>
    (value: unknown): value is T =>
        typeof value === 'string' && (options as readonly string[]).includes(value)
const isColor = oneOf(CAPTION_COLORS)
const isBackground = oneOf(CAPTION_BACKGROUNDS)
const isEdge = oneOf(CAPTION_EDGES)

/** Whether a kept value can be read as caption settings at all: an object, whatever fields it has. */
export function isCaptionChoice(value: unknown): value is Partial<CaptionSettings> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The settings captions are drawn with: each field the viewer chose that is still one the player
 * offers, and the app's defaults, then the library's, for the rest. A field kept by an older
 * version, or by hand, that is not one of the options falls back alone, so one bad field never
 * loses the others.
 */
export function captionSettings(chosen: unknown, defaults: Partial<CaptionStyle> = {}): CaptionSettings {
    const base: CaptionStyle = {
        size: isSize(defaults.size) ? defaults.size : CAPTION_STYLE.size,
        color: isColor(defaults.color) ? defaults.color : CAPTION_STYLE.color,
        background: isBackground(defaults.background) ? defaults.background : CAPTION_STYLE.background,
        edge: isEdge(defaults.edge) ? defaults.edge : CAPTION_STYLE.edge,
    }
    if (!isCaptionChoice(chosen)) return base
    const settings: CaptionSettings = {
        size: isSize(chosen.size) ? chosen.size : base.size,
        color: isColor(chosen.color) ? chosen.color : base.color,
        background: isBackground(chosen.background) ? chosen.background : base.background,
        edge: isEdge(chosen.edge) ? chosen.edge : base.edge,
    }
    if (chosen.track === null || typeof chosen.track === 'string') settings.track = chosen.track
    return settings
}

/** What a track is remembered by: its language where it has one, as the same language is chosen again on the next video, else its label. */
export function captionTrackKey(track: { label: string; lang?: string }): string {
    return track.lang !== undefined && track.lang !== '' ? track.lang : track.label
}

/**
 * Which of `tracks` to show: the one the viewer chose (by its key, or failing that by the language
 * the key names, so `en` finds `en-GB`), none when they turned captions off, and the track marked
 * `default` when they have chosen none or the chosen one is not offered here. -1 is none.
 */
export function chosenCaptionTrack(
    tracks: readonly { label: string; lang?: string; default?: boolean }[],
    track: string | null | undefined,
): number {
    if (track === null) return -1
    if (track !== undefined) {
        const exact = tracks.findIndex((one) => captionTrackKey(one) === track)
        if (exact >= 0) return exact
        const language = track.split('-')[0].toLowerCase()
        const near = tracks.findIndex((one) => one.lang !== undefined && one.lang.split('-')[0].toLowerCase() === language)
        if (near >= 0) return near
    }
    return tracks.findIndex((one) => one.default === true)
}

/** A token as a CSS value. */
const token = (name: string) => `var(--${name})`

/** The edge as a text shadow, sized by the text so it holds at every caption size. */
function shadowOf(edge: CaptionEdge): string {
    const ink = token('caption-edge')
    if (edge === 'none') return 'none'
    if (edge === 'shadow') {
        return `0.05em 0.07em 0.1em color-mix(in oklab, ${ink} 90%, transparent), 0 0 0.35em color-mix(in oklab, ${ink} 55%, transparent)`
    }
    const width = 'max(1px, 0.055em)'
    const ring = [
        `calc(-1 * ${width}) 0`,
        `${width} 0`,
        `0 calc(-1 * ${width})`,
        `0 ${width}`,
        `calc(-0.7 * ${width}) calc(-0.7 * ${width})`,
        `calc(0.7 * ${width}) calc(-0.7 * ${width})`,
        `calc(-0.7 * ${width}) calc(0.7 * ${width})`,
        `calc(0.7 * ${width}) calc(0.7 * ${width})`,
    ].map((offset) => `${offset} 0 ${ink}`)
    return [...ring, `0 0.05em 0.15em color-mix(in oklab, ${ink} 85%, transparent)`].join(', ')
}

function groundOf(background: CaptionBackground): string {
    if (background === 'none') return 'transparent'
    if (background === 'translucent') return `color-mix(in oklab, ${token('caption-ground')} 62%, transparent)`
    return token('caption-ground')
}

/**
 * The CSS a cue is drawn with: `text` for its lines, sized against the player's width (the player
 * is a size container) and never under `--caption-size-min`, with its ink and its edge; `box` for
 * the words of each line, the background behind them. Every color is a token, so a theme can
 * change them.
 */
export function captionCss(style: CaptionStyle): { text: CSSProperties; box: CSSProperties } {
    return {
        text: {
            fontSize: `max(${token('caption-size-min')}, calc(${token('caption-size')} * ${String(style.size)}))`,
            lineHeight: 1.35,
            fontWeight: 500,
            color: token(`caption-${style.color}`),
            textShadow: shadowOf(style.edge),
        },
        box: { backgroundColor: groundOf(style.background) },
    }
}
