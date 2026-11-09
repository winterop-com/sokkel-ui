/**
 * The visualizer's looks the settings and the fullscreen picker offer, and how each is drawn by
 * the library's `SoundVisualizer`: its kind, where it stands, whether it is mirrored, and the
 * colors and effect the settings choose.
 */
import type { SoundVisualizerProps } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import type { MediaVisualizerOption } from '@winterop-com/sokkel-ui-media/MediaBar'

import type { Effect, Look, Ramp } from './data'

export const LOOKS: readonly (MediaVisualizerOption & { id: Look })[] = [
    { id: 'spectrum', label: 'Bars' },
    { id: 'mirror', label: 'Mirror' },
    { id: 'area', label: 'Area' },
    { id: 'wave', label: 'Wave' },
    { id: 'ring', label: 'Ring' },
]

export const RAMPS: readonly { value: Ramp; label: string }[] = [
    { value: 'theme', label: 'Theme' },
    { value: 'heat', label: 'Heat' },
    { value: 'cool', label: 'Cool' },
    { value: 'lagoon', label: 'Lagoon' },
    { value: 'ink', label: 'Ink' },
]

export const EFFECTS: readonly { value: Effect; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'glow', label: 'Glow' },
    { value: 'trails', label: 'Trails' },
]

export const isLook = (id: string): id is Look => LOOKS.some((look) => look.id === id)

/** The visualizer's props for a look, in the colors and effect chosen. */
export function lookProps(look: Look, ramp: Ramp, effect: Effect): Partial<SoundVisualizerProps> {
    const colors = ramp === 'theme' ? { ramp: 'primary' as const } : { ramp }
    switch (look) {
        case 'mirror':
            return { kind: 'spectrum', mirror: true, ...colors, effect }
        case 'area':
            return { kind: 'area', ...colors, effect }
        case 'wave':
            return { kind: 'wave', ...colors, effect }
        case 'ring':
            return { kind: 'ring', ...colors, effect }
        default:
            return { kind: 'spectrum', ...colors, effect }
    }
}
