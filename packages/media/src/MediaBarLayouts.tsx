import type { ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { TALL, WIDE, glow, panelGrowth, rowsGrowth, stageGrowth } from './bar-growth'
import {
    Backdrop,
    Cover,
    Extras,
    FullscreenButton,
    RepeatButton,
    Scrub,
    ShuffleButton,
    Speed,
    Steps,
    Volume,
    Words,
    type Deck,
} from './MediaBarParts'
import { LiveMark, Position } from '@winterop-com/sokkel-ui/media/MediaControls'

/** What every arrangement of the bar is given. */
export interface BarProps {
    deck: Deck
    /** The bar's height and its own width, in pixels. */
    height: number
    width: number
    /** The visualizer drawn faint behind the words once the bar grows. */
    visualizer?: ReactNode
    /** Opens the fullscreen view; no fullscreen button without it. */
    onFullscreen?: () => void
}

/** The fullscreen button, in a corner or in a row of controls. */
function Expand({ deck, onFullscreen, corner = false }: { deck: Deck; onFullscreen?: () => void; corner?: boolean }) {
    if (onFullscreen === undefined) return null
    return <FullscreenButton label={deck.words.fullscreen} onClick={onFullscreen} className={cn(corner && 'absolute top-1.5 right-1.5')} />
}

/**
 * The one-line bar, drawn by every layout until it grows: what plays at the left with the cover
 * growing with the height, the transport over the position in the middle, the speed, the volume
 * and the extra controls at the right. Under `WIDE` it folds into two rows, the title beside the
 * transport over the position, the speed at the position's end.
 */
export function LineBar({ deck, height, width, onFullscreen }: BarProps) {
    const wide = width >= WIDE
    const line =
        deck.subtitle ??
        (deck.artist !== undefined || deck.album !== undefined ? <MetaLine inline items={[deck.artist, deck.album]} /> : undefined)
    const cover = height - 17
    const position = deck.live ? (
        <LiveMark label={deck.words.live} />
    ) : (
        <Position
            at={deck.at}
            duration={deck.duration}
            buffered={deck.buffered}
            label={deck.words.seek}
            onSeek={deck.onSeek}
            onScrub={deck.onScrub}
        />
    )
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] @2xl:gap-x-6 @2xl:py-2">
            <div className="flex min-w-0 items-center gap-3">
                <div
                    className="size-10 shrink-0 overflow-hidden rounded-mini @2xl:size-12"
                    style={wide && cover > 48 ? { width: cover, height: cover } : undefined}
                >
                    <Cover deck={deck} flush />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{deck.title}</p>
                    {line !== undefined && <p className="truncate text-xs text-muted-foreground">{line}</p>}
                </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1 @2xl:flex-col @2xl:items-stretch @2xl:justify-center @2xl:gap-0.5">
                <div className="flex items-center justify-center gap-1 @2xl:gap-2">
                    {wide && <ShuffleButton deck={deck} />}
                    <Steps deck={deck} />
                    {wide && <RepeatButton deck={deck} />}
                    {!wide && <Extras deck={deck} />}
                    {!wide && <Expand deck={deck} onFullscreen={onFullscreen} />}
                </div>
                {wide && position}
            </div>

            {!wide && (
                <div className="col-span-2 flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">{position}</div>
                    <Speed deck={deck} />
                </div>
            )}

            {wide && (
                <div className="flex min-w-0 items-center justify-end gap-2">
                    <Speed deck={deck} />
                    <Volume deck={deck} />
                    <Extras deck={deck} />
                    <Expand deck={deck} onFullscreen={onFullscreen} />
                </div>
            )}
        </div>
    )
}

/**
 * `rows`: the cover at the left across both rows; the words, the transport (centered) and the
 * volume in the top row; and the waveform, as wide as the rest of the bar, in the bottom row. The
 * visualizer rises behind the top row and stands on the waveform. The fullscreen button ends the
 * top row until the row is tall enough to give it the corner. On a narrow bar the cover moves
 * into the top row beside the words, and the volume is left to the device.
 */
export function RowsBar({ deck, height, width, visualizer, onFullscreen }: BarProps) {
    const narrow = width < WIDE
    const rows = rowsGrowth(height, width)
    return (
        <div className="relative flex h-full gap-4 px-3" style={{ paddingBlock: rows.pad }}>
            {!narrow && <Cover deck={deck} size={rows.cover} className={cn('self-center', rows.cover >= 160 && 'rounded-surface')} />}
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: rows.gap }}>
                <div
                    className={cn(
                        'relative grid min-h-0 flex-1 items-end',
                        narrow
                            ? 'grid-cols-[minmax(0,1fr)_auto] gap-x-3'
                            : rows.compactVolume
                              ? 'grid-cols-[minmax(0,1fr)_auto_auto] gap-x-6'
                              : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-6',
                    )}
                >
                    <Backdrop visualizer={visualizer} strength={glow(height)} className="-top-3" />
                    <div className="relative flex min-w-0 items-end gap-3">
                        {narrow && <Cover deck={deck} size={rows.cover} className="self-center" />}
                        <Words deck={deck} tier={rows.tier} className="min-w-0 flex-1" />
                    </div>
                    <div className="relative flex items-center gap-2">
                        {!narrow && <ShuffleButton deck={deck} />}
                        <Steps deck={deck} size={height >= TALL ? 'md' : 'sm'} />
                        {!narrow && <RepeatButton deck={deck} />}
                        {narrow && <Extras deck={deck} />}
                        {narrow && !rows.corner && <Expand deck={deck} onFullscreen={onFullscreen} />}
                    </div>
                    {!narrow && (
                        <div className="relative flex min-w-0 items-center justify-end gap-2">
                            <Speed deck={deck} />
                            <Volume deck={deck} compact={rows.compactVolume} />
                            <Extras deck={deck} />
                            {!rows.corner && <Expand deck={deck} onFullscreen={onFullscreen} />}
                        </div>
                    )}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                    <Scrub deck={deck} height={rows.wave} className="min-w-0 flex-1" />
                    {narrow && <Speed deck={deck} />}
                </div>
            </div>
            {rows.corner && <Expand deck={deck} onFullscreen={onFullscreen} corner />}
        </div>
    )
}

/**
 * `panel`: the large now-playing panel. The cover is flush and as tall as the bar at its left
 * edge; the words and the waveform fill the room over the transport, the visualizer rising behind
 * the words and standing on the waveform; shuffle, repeat and the transport run along the foot
 * with the volume and the extra controls at its end; the fullscreen button keeps the room's top
 * right corner. On a narrow bar a smaller cover moves beside the words and the transport is
 * centered at the foot.
 */
export function PanelBar({ deck, height, width, visualizer, onFullscreen }: BarProps) {
    const narrow = width < WIDE
    const panel = panelGrowth(height, width)
    return (
        <div className="flex h-full">
            {!narrow && <Cover deck={deck} size={panel.cover} flush className="self-center" />}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="relative flex h-full flex-col justify-end px-5 pt-2 pb-1" style={{ gap: panel.gap }}>
                        <div className="relative flex min-h-0 flex-1 items-end">
                            <Backdrop visualizer={visualizer} strength={glow(height)} className="-inset-x-5 -top-2" />
                            <div className={cn('relative flex min-w-0 flex-1 items-end gap-3', onFullscreen !== undefined && 'pr-8')}>
                                {narrow && panel.cover > 0 && <Cover deck={deck} size={panel.cover} />}
                                <Words deck={deck} tier={panel.tier} className="min-w-0 flex-1" />
                            </div>
                        </div>
                        <Scrub deck={deck} height={panel.wave} />
                    </div>
                    <Expand deck={deck} onFullscreen={onFullscreen} corner />
                </div>
                <div className={cn('flex h-shell-foot shrink-0 items-center gap-1 px-3', narrow && 'justify-center')}>
                    {!narrow && <ShuffleButton deck={deck} />}
                    {!narrow && <RepeatButton deck={deck} />}
                    <Steps deck={deck} />
                    {!narrow && <div className="flex-1" />}
                    <Speed deck={deck} />
                    {!narrow && <Volume deck={deck} compact={panel.compactVolume} />}
                    <Extras deck={deck} />
                </div>
            </div>
        </div>
    )
}

/**
 * `stage`: three columns, the cover at the left, inset and growing; the stage in the middle,
 * centered on the bar, with the words over a wide waveform and the transport under it; the volume
 * and the extra controls at the foot of the right column, and the fullscreen button in the top
 * right corner. The visualizer rises behind the stage from the cover to the bar's end, standing
 * on the waveform. On a narrow bar the stage has the whole width.
 */
export function StageBar({ deck, height, width, visualizer, onFullscreen }: BarProps) {
    const narrow = width < WIDE
    const stage = stageGrowth(height, width)
    return (
        <div className="relative h-full">
            <Backdrop
                visualizer={visualizer}
                strength={glow(height)}
                style={{ left: narrow ? 0 : stage.cover + 2 * stage.pad, bottom: stage.under }}
            />
            <div
                className={cn('relative grid h-full gap-x-6', narrow && 'grid-cols-1')}
                style={{
                    padding: stage.pad,
                    gridTemplateColumns: narrow ? undefined : `${String(stage.side)}px minmax(0,1fr) ${String(stage.side)}px`,
                }}
            >
                {!narrow && (
                    <div className="flex min-w-0 items-center">
                        <Cover deck={deck} size={stage.cover} className={cn(stage.cover >= 160 && 'rounded-surface')} />
                    </div>
                )}
                <div className="flex min-w-0 flex-col items-center justify-end" style={{ gap: stage.gap }}>
                    <Words deck={deck} tier={stage.tier} center className={cn('w-full', onFullscreen !== undefined && 'px-8')} />
                    <Scrub deck={deck} height={stage.wave} className="w-full" />
                    <div className="flex h-9 items-center justify-center gap-2">
                        {!narrow && <ShuffleButton deck={deck} />}
                        <Steps deck={deck} size={stage.tall ? 'md' : 'sm'} />
                        {!narrow && <RepeatButton deck={deck} />}
                        {narrow && <Speed deck={deck} />}
                        {narrow && <Extras deck={deck} />}
                    </div>
                </div>
                {!narrow && (
                    <div className="flex min-w-0 flex-col items-end justify-end">
                        <div className="flex h-9 items-center gap-2">
                            <Speed deck={deck} />
                            <Volume deck={deck} compact={stage.compactVolume} />
                            <Extras deck={deck} />
                        </div>
                    </div>
                )}
            </div>
            <Expand deck={deck} onFullscreen={onFullscreen} corner />
        </div>
    )
}
