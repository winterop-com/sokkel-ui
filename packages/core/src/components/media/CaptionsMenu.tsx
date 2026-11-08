import { Captions } from 'lucide-react'
import type { RefObject } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
    CAPTION_BACKGROUNDS,
    CAPTION_COLORS,
    CAPTION_EDGES,
    CAPTION_SIZES,
    type CaptionBackground,
    type CaptionColor,
    type CaptionEdge,
    type CaptionStyle,
} from './captions'
import { toneButton } from './MediaControls'

/** The words the captions menu says, each with an English default in `VideoPlayer`'s words. */
export interface CaptionsMenuWords {
    captions: string
    captionsOff: string
    captionSize: string
    captionColor: string
    captionBackground: string
    captionEdge: string
    captionColors: Record<CaptionColor, string>
    captionBackgrounds: Record<CaptionBackground, string>
    captionEdges: Record<CaptionEdge, string>
}

export interface CaptionsMenuProps {
    /** The tracks offered, by label. */
    tracks: readonly { label: string }[]
    /** The track shown, -1 for none. */
    track: number
    onTrackChange: (index: number) => void
    style: CaptionStyle
    /** Called with the one setting the viewer changed. */
    onStyleChange: (change: Partial<CaptionStyle>) => void
    words: CaptionsMenuWords
    /** Where the menu is put, so it stays in the player when the player fills the screen. */
    container?: RefObject<HTMLElement | null>
    onOpenChange?: (open: boolean) => void
}

/** A share of the usual size as a percent. */
const percent = (size: number) => `${String(Math.round(size * 100))}%`

/**
 * The captions button over a video and its menu: the tracks and Off, then the text's size, ink,
 * background and edge, each a submenu that says what is chosen.
 */
export function CaptionsMenu({ tracks, track, onTrackChange, style, onStyleChange, words, container, onOpenChange }: CaptionsMenuProps) {
    const on = track >= 0
    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label={words.captions} aria-pressed={on} className={toneButton('overlay')} />
                }
            >
                <Captions className={cn(on && 'text-primary')} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent container={container} side="top" align="end" className="w-auto min-w-48">
                <DropdownMenuRadioGroup
                    value={String(track)}
                    onValueChange={(value: string) => {
                        onTrackChange(Number(value))
                    }}
                >
                    <DropdownMenuRadioItem value="-1">{words.captionsOff}</DropdownMenuRadioItem>
                    {tracks.map((one, index) => (
                        <DropdownMenuRadioItem key={`${String(index)}-${one.label}`} value={String(index)}>
                            {one.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <Choice
                    label={words.captionSize}
                    value={String(style.size)}
                    options={CAPTION_SIZES.map((size) => ({ value: String(size), label: percent(size) }))}
                    onChange={(value) => {
                        onStyleChange({ size: Number(value) })
                    }}
                    container={container}
                    shown={percent(style.size)}
                />
                <Choice
                    label={words.captionColor}
                    value={style.color}
                    options={CAPTION_COLORS.map((color) => ({ value: color, label: words.captionColors[color] }))}
                    onChange={(value) => {
                        onStyleChange({ color: value as CaptionColor })
                    }}
                    container={container}
                    shown={words.captionColors[style.color]}
                />
                <Choice
                    label={words.captionBackground}
                    value={style.background}
                    options={CAPTION_BACKGROUNDS.map((background) => ({ value: background, label: words.captionBackgrounds[background] }))}
                    onChange={(value) => {
                        onStyleChange({ background: value as CaptionBackground })
                    }}
                    container={container}
                    shown={words.captionBackgrounds[style.background]}
                />
                <Choice
                    label={words.captionEdge}
                    value={style.edge}
                    options={CAPTION_EDGES.map((edge) => ({ value: edge, label: words.captionEdges[edge] }))}
                    onChange={(value) => {
                        onStyleChange({ edge: value as CaptionEdge })
                    }}
                    container={container}
                    shown={words.captionEdges[style.edge]}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** One setting as a submenu: its name and what is chosen, opening on the options. */
function Choice({
    label,
    value,
    shown,
    options,
    onChange,
    container,
}: {
    label: string
    value: string
    shown: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    container?: RefObject<HTMLElement | null>
}) {
    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <span className="flex-1">{label}</span>
                <span className="text-muted-foreground">{shown}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent container={container} className="min-w-32">
                <DropdownMenuRadioGroup value={value} onValueChange={(next: string) => onChange(next)}>
                    {options.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    )
}
