import { CornerDownLeft } from 'lucide-react'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useWords, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { useMapContext, type MapCorner } from './context'
import { parseCoordinates } from './geodesy'
import type { LngLat } from './geometry'

/** The words a go-to field says. */
export interface MapGoToWords {
    /** The field's name, for a screen reader. */
    label: string
    placeholder: string
    /** The button that goes there. */
    go: string
    /** Said under the field when what it holds is not a position. */
    invalid: string
}

export const MAP_GO_TO_WORDS: MapGoToWords = {
    label: 'Go to coordinates',
    placeholder: 'Lat, lon',
    go: 'Go',
    invalid: 'Write a position as latitude, longitude.',
}

/** Where a catalog holds a go-to field's words. */
export const MAP_GO_TO_PART: WordsPart<MapGoToWords> = { id: 'mapGoTo', words: MAP_GO_TO_WORDS }

export interface MapGoToProps {
    /** The corner it stands in; the top left by default. */
    corner?: MapCorner
    /** The zoom it flies to, unless the map is in closer already. */
    zoom?: number
    /** Called with each position it goes to. */
    onGo?: (position: LngLat) => void
    className?: string
    words?: Partial<MapGoToWords>
}

/**
 * A small field over the map that takes a position as "lat, lon" (`60.39, 5.32`, or with hemisphere
 * letters, `60.39 N, 5.32 E`) and flies there on Enter, holding the camera from then on. What does
 * not read as a position is marked and said under the field.
 */
export function MapGoTo({ corner = 'top-left', zoom = 10, onGo, className, words }: MapGoToProps) {
    const { map, corners, holdCamera } = useMapContext()
    const said = useWords(MAP_GO_TO_PART, words)
    const [text, setText] = useState('')
    const [invalid, setInvalid] = useState(false)
    const issue = useId()
    const go = () => {
        const position = parseCoordinates(text)
        if (position === null) {
            setInvalid(true)
            return
        }
        setInvalid(false)
        holdCamera()
        map.flyTo({ center: position, zoom: Math.max(map.getZoom(), zoom), duration: 900 })
        onGo?.(position)
    }
    return createPortal(
        <form
            role="search"
            aria-label={said.label}
            className={cn('w-56 max-w-full rounded-surface bg-card/95 p-1 shadow-surface ring-1 ring-foreground/10', className)}
            onSubmit={(event) => {
                event.preventDefault()
                go()
            }}
        >
            <div className="flex items-center gap-1">
                <Input
                    value={text}
                    aria-label={said.label}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? issue : undefined}
                    placeholder={said.placeholder}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    className="tabular-nums"
                    onChange={(event) => {
                        setText(event.target.value)
                        if (invalid) setInvalid(false)
                    }}
                />
                <IconButton label={said.go} type="submit" side={corner.endsWith('left') ? 'right' : 'left'}>
                    <CornerDownLeft aria-hidden />
                </IconButton>
            </div>
            {invalid && (
                <p id={issue} className="px-1 pt-1 text-help text-critical-ink">
                    {said.invalid}
                </p>
            )}
        </form>,
        corners[corner],
    )
}
