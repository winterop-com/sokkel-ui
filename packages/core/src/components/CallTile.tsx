import { Hand, MicOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordsPart } from '../lib/words'
import { PersonAvatar } from './PersonAvatar'

export interface CallTileWords {
    /** The muted mark's name, beside the person's name. */
    muted: string
    /** The raised hand's name, beside the person's name. */
    handRaised: string
}

export const CALL_TILE_WORDS: CallTileWords = { muted: 'Muted', handRaised: 'Hand raised' }

/** Where a catalog holds a call tile's words. */
export const CALL_TILE_PART: WordsPart<CallTileWords> = { id: 'callTile', words: CALL_TILE_WORDS }

/**
 * The person's picture in a tile: 16 percent of the tile's width (28 of its height, at 16:9), never
 * under 64 nor over 160, its initials growing with it, so a large tile is not left with a small badge.
 */
const PICTURE = 'size-[clamp(4rem,16cqw,10rem)] text-[length:clamp(var(--text-page),5cqw,var(--text-display))]'

export interface CallTileProps {
    /** The person's name, at the tile's foot. */
    name: string
    /** Their picture, centered while there is no video. */
    image?: string
    /** Their microphone is off: a struck microphone before the name. */
    muted?: boolean
    /** Their hand is raised: a hand before the name. */
    handRaised?: boolean
    /** Their video (a `video`, or a still), filling the tile in place of the picture, cropped to it. */
    children?: ReactNode
    className?: string
    words?: Partial<CallTileWords>
}

/**
 * One person on a call: a 16:9 tile on the call's dark ground, their video filling it (`children`)
 * or their picture centered, sized to the tile, and their name at its foot on a dark chip with a
 * struck microphone while muted and a hand while raised. Tiles sit in a grid (`Columns`) on the
 * call's picture, the call bar floating over its foot. Nothing in a tile is selectable, so a press, a
 * double press or a drag on it never highlights the name.
 */
export function CallTile({ name, image, muted = false, handRaised = false, children, className, words: given }: CallTileProps) {
    const words = useWords(CALL_TILE_PART, given)
    return (
        <div
            data-slot="call-tile"
            className={cn(
                '@container relative aspect-video overflow-hidden rounded-surface bg-terminal-foreground/10 select-none',
                className,
            )}
        >
            {children !== undefined ? (
                <div data-slot="call-tile-video" className="absolute inset-0 *:size-full *:object-cover">
                    {children}
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <PersonAvatar name={name} image={image} size="2xl" className={PICTURE} />
                </div>
            )}
            <span
                data-slot="call-tile-name"
                className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-control bg-terminal/70 px-1.5 text-help text-terminal-foreground"
            >
                {muted && <MicOff className="size-3.5 shrink-0" aria-label={words.muted} />}
                {handRaised && <Hand className="size-3.5 shrink-0" aria-label={words.handRaised} />}
                <span className="min-w-0 truncate">{name}</span>
            </span>
        </div>
    )
}
