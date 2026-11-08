import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { useAppearance } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { appearanceCommands } from '@winterop-com/sokkel-ui/lib/commands'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'

import { DEMOS } from './demos'
import { desktopWindow } from './desktop'
import type { Frame } from './frame'
import { Launcher } from './Launcher'
import { go, useRoute } from './router'

/** The demo host: `#/` is the launcher, `#/<demo>` a demo, each drawing its own shell. */
export function App() {
    const route = useRoute()
    const appearance = useAppearance()
    const desktop = useMemo(desktopWindow, [])
    const { settings, setSettings } = appearance

    const palette = useMemo(
        (): PaletteGroup[] => [
            {
                title: 'Demos',
                rank: 10,
                commands: [
                    { id: 'demo-home', label: 'All demos', icon: LayoutGrid, onSelect: () => go('/') },
                    ...DEMOS.map((demo) => ({
                        id: `demo-${demo.id}`,
                        label: demo.name,
                        hint: demo.summary,
                        icon: demo.icon,
                        onSelect: () => go(`/${demo.id}`),
                    })),
                ],
            },
            ...appearanceCommands(settings, setSettings).map((group) => ({ ...group, rank: 20 })),
        ],
        [settings, setSettings],
    )

    const frame: Frame = { palette, desktop, appearance, route: route.slice(1) }
    const demo = DEMOS.find((one) => one.id === route[0])

    return <TooltipProvider>{demo === undefined ? <Launcher frame={frame} /> : <demo.Component frame={frame} />}</TooltipProvider>
}
