'use client'

import { Navigation2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { useMapContext, type MapCorner } from './context'
import { ControlButton } from './control'
import { formatBearing } from './geodesy'

/** The words a compass says. */
export interface MapCompassWords {
    /** The button's name: what a press does, and the bearing the map is turned to. */
    resetNorth: (bearing: string) => string
}

export const MAP_COMPASS_WORDS: MapCompassWords = {
    resetNorth: (bearing) => `Reset to north (bearing ${bearing})`,
}

/** Where a catalog holds a compass's words, and the arguments its phrases name. */
export const MAP_COMPASS_PART: WordsPart<MapCompassWords> = { id: 'mapCompass', words: MAP_COMPASS_WORDS, args: { resetNorth: 'bearing' } }

/** A compass's phrases as ICU messages in English, for the catalog. */
export const MAP_COMPASS_MESSAGES: WordMessages<MapCompassWords> = {
    resetNorth: 'Reset to north (bearing {bearing})',
}

export interface MapCompassProps {
    /** The corner it stands in; the top right, under the map's own controls, by default. */
    corner?: MapCorner
    words?: Partial<MapCompassWords>
}

/**
 * A compass among the map's buttons: its needle points north as the map is turned, and a press
 * turns the map back to north. A map turns only with `rotate` on its `MapView`; without it the
 * needle stays up.
 */
export function MapCompass({ corner = 'top-right', words }: MapCompassProps) {
    const { map, scope, corners } = useMapContext()
    const said = useWords(MAP_COMPASS_PART, words)
    const [bearing, setBearing] = useState(() => map.getBearing())
    useEffect(() => {
        const update = () => setBearing(map.getBearing())
        update()
        map.on('rotate', update)
        return () => {
            map.off('rotate', update)
        }
    }, [map])
    return createPortal(
        <ControlButton
            label={said.resetNorth(formatBearing(bearing))}
            container={scope}
            corner={corner}
            onClick={() => map.easeTo({ bearing: 0, pitch: 0, duration: 300 })}
        >
            <Navigation2 className="fill-critical stroke-critical" style={{ transform: `rotate(${String(-bearing)}deg)` }} />
        </ControlButton>,
        corners[corner],
    )
}
