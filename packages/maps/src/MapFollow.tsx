'use client'

import { LocateFixed, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { useMapContext, type MapCorner } from './context'
import type { LngLat } from './geometry'

/** The words a followed track's banner says. */
export interface MapFollowWords {
    /** What the banner says while the map follows something, by its name. */
    following: (name: string) => string
    /** The button that lets it go. */
    release: string
}

export const MAP_FOLLOW_WORDS: MapFollowWords = {
    following: (name) => `Following ${name}`,
    release: 'Stop following',
}

/** Where a catalog holds a follow banner's words, and the arguments its phrases name. */
export const MAP_FOLLOW_PART: WordsPart<MapFollowWords> = { id: 'mapFollow', words: MAP_FOLLOW_WORDS, args: { following: 'name' } }

/** A follow banner's phrases as ICU messages in English, for the catalog. */
export const MAP_FOLLOW_MESSAGES: WordMessages<MapFollowWords> = {
    following: 'Following {name}',
}

export interface MapFollowProps {
    /** Where the followed thing is now; the map keeps it centered as it changes. */
    position: LngLat
    /** What is followed, as the banner names it. */
    name: string
    /** Called when the reader lets it go: by the banner's button, or by dragging the map away. */
    onRelease: () => void
    /** The zoom the map goes to when it starts following, unless it is in closer already. */
    zoom?: number
    /** How long each step after the followed thing takes, in milliseconds: a `TrackLayer`'s `transition`, so the two glide as one. */
    duration?: number
    /** The corner the banner stands in; the top left by default. */
    corner?: MapCorner
    className?: string
    words?: Partial<MapFollowWords>
}

/**
 * Keeps the map centered on one moving thing, such as the selected track, for as long as it is
 * drawn: each new position is eased to, the camera is held so the map no longer fits its layers,
 * and a banner in a corner says what is followed, with a button that lets it go. Dragging the map
 * lets it go too.
 */
export function MapFollow({ position, name, onRelease, zoom, duration = 600, corner = 'top-left', className, words }: MapFollowProps) {
    const { map, corners, holdCamera } = useMapContext()
    const said = useWords(MAP_FOLLOW_PART, words)
    const releaseNow = useRef(onRelease)
    useEffect(() => {
        releaseNow.current = onRelease
    })

    const started = useRef(false)
    const [lng, lat] = position
    useEffect(() => {
        holdCamera()
        const first = !started.current
        started.current = true
        if (first) map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), zoom ?? 0), duration: 500 })
        else map.easeTo({ center: [lng, lat], duration, easing: (t) => 1 - (1 - t) ** 2 })
    }, [map, lng, lat, zoom, duration, holdCamera])

    useEffect(() => {
        const release = () => releaseNow.current()
        map.on('dragstart', release)
        return () => {
            map.off('dragstart', release)
        }
    }, [map])

    return createPortal(
        <div
            role="status"
            className={cn(
                'flex max-w-full items-center gap-1.5 self-start rounded-control bg-card/95 py-0.5 ps-2 pe-0.5 text-xs text-card-foreground shadow-surface ring-1 ring-map-selection',
                className,
            )}
        >
            <LocateFixed aria-hidden className="size-3.5 shrink-0 text-map-selection" />
            <span className="min-w-0 truncate font-medium">{said.following(name)}</span>
            <IconButton
                label={said.release}
                size="icon-xs"
                side={corner.endsWith('left') ? 'right' : 'left'}
                onClick={() => releaseNow.current()}
            >
                <X aria-hidden />
            </IconButton>
        </div>,
        corners[corner],
    )
}
