import { isValidElement, type ReactElement, type ReactNode } from 'react'

import type { SoundVisualizerProps } from './SoundVisualizer'

/**
 * Whether a node is a `SoundVisualizer` element, told by the mark the part carries rather than by
 * its identity, so a player that takes one in a slot need not import it to ask.
 */
export function isSoundVisualizer(node: ReactNode): node is ReactElement<SoundVisualizerProps> {
    return isValidElement(node) && typeof node.type === 'function' && (node.type as { soundVisualizer?: unknown }).soundVisualizer === true
}
