import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { useAppearance, type AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { appearanceCommands } from '@winterop-com/sokkel-ui/lib/commands'
import type { DesktopWindow } from '@winterop-com/sokkel-ui/lib/desktop'
import { RotateCcw } from 'lucide-react'
import { useMemo } from 'react'

import { resetAll } from './backend'
import { desktopWindow } from './desktop'
import { useRoute } from './router'

/** What every example's page is drawn with: the palette's shared groups, the window, the look and the route. */
export interface Frame {
    /** The palette groups an example lists after its own: the look, and putting the demo data back. */
    palette: readonly PaletteGroup[]
    desktop: DesktopWindow | undefined
    appearance: AppearanceState
    /** The hash route's parts: `#/today` is `['today']`. */
    route: readonly string[]
}

/** The frame for an example's page, followed as the look and the route change. */
export function useFrame(): Frame {
    const route = useRoute()
    const appearance = useAppearance()
    const desktop = useMemo(desktopWindow, [])
    const { settings, setSettings } = appearance
    const palette = useMemo(
        (): PaletteGroup[] => [
            ...appearanceCommands(settings, setSettings).map((group) => ({ ...group, rank: 20 })),
            {
                title: 'Demo',
                rank: 30,
                commands: [
                    {
                        id: 'demo-reset',
                        label: 'Reset demo data',
                        icon: RotateCcw,
                        onSelect: () => {
                            void resetAll().then(() => window.location.reload())
                        },
                    },
                ],
            },
        ],
        [settings, setSettings],
    )
    return { palette, desktop, appearance, route }
}
