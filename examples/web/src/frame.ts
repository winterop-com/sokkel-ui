import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import type { AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import type { DesktopWindow } from '@winterop-com/sokkel-ui/lib/desktop'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'

/** What the host hands every demo: the palette's shared groups, the window, the look and the route. */
export interface Frame {
    /** The palette groups every demo lists after its own: the demos and the look. */
    palette: readonly PaletteGroup[]
    desktop: DesktopWindow | undefined
    appearance: AppearanceState
    /** The route's parts after the demo's own. */
    route: readonly string[]
}

export interface Demo {
    id: string
    name: string
    /** One line on the launcher's card. */
    summary: string
    icon: LucideIcon
    Component: ComponentType<{ frame: Frame }>
}
