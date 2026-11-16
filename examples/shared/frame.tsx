import type { PaletteGroup } from '@winterop-com/sokkel-ui/CommandPalette'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { useAppearance, type AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { THEMES, type ThemeOption } from '@winterop-com/sokkel-ui/lib/appearance'
import { appearanceCommands } from '@winterop-com/sokkel-ui/lib/commands'
import type { DesktopWindow } from '@winterop-com/sokkel-ui/lib/desktop'
import { RotateCcw } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { resetAll } from './backend'
import { useDesktopWindow } from './desktop'
import { useRoute } from './router'

/** What every example's page is drawn with: the palette's shared groups, the window, the look and the route. */
export interface Frame {
    /** The palette groups an example lists after its own: the look, and putting the demo data back. */
    palette: readonly PaletteGroup[]
    desktop: DesktopWindow | undefined
    appearance: AppearanceState
    /** The hash route's parts: `#/today` is `['today']`. */
    route: readonly string[]
    /** The themes the example carries the styles of, the only ones its palette and its Settings offer. */
    themes: readonly ThemeOption[]
    /** Asks whether to reset the demo data, and resets it and loads the page again on yes. */
    askReset: () => void
    /** What the frame draws over the page, such as its question before the demo data is reset; drawn once in the app. */
    dialogs: ReactNode
}

/** The base theme alone, the one every example's `styles.css` carries. */
const BASE: readonly string[] = ['tidevann']

/**
 * The frame for an example's page, followed as the look and the route change. `carried` are the
 * themes whose styles the example's `app.css` imports, the only ones its palette and Settings
 * offer; the base alone when not given. Keep it a constant, so the palette is not built anew on
 * every render.
 */
export function useFrame(carried: readonly string[] = BASE): Frame {
    const route = useRoute()
    const appearance = useAppearance()
    const desktop = useDesktopWindow()
    const { settings, setSettings } = appearance
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)
    const askReset = useCallback(() => setResetting(true), [])
    const themes = useMemo(() => THEMES.filter((theme) => carried.includes(theme.value)), [carried])
    const palette = useMemo(
        (): PaletteGroup[] => [
            ...appearanceCommands(settings, setSettings, { themes }).map((group) => ({ ...group, rank: 20 })),
            {
                title: 'Demo',
                rank: 30,
                commands: [{ id: 'demo-reset', label: 'Reset demo data', icon: RotateCcw, onSelect: askReset }],
            },
        ],
        [settings, setSettings, themes, askReset],
    )
    const dialogs = (
        <ConfirmDialog
            open={resetting}
            onOpenChange={(next) => !busy && setResetting(next)}
            question="Reset the demo data?"
            detail="Everything changed since the demo started is put back, and the page loads again."
            confirm={{
                label: 'Reset',
                destructive: true,
                busy,
                busyLabel: 'Resetting',
                onConfirm: () => {
                    setBusy(true)
                    void resetAll().then(() => window.location.reload())
                },
            }}
        />
    )
    return { palette, desktop, appearance, route, themes, askReset, dialogs }
}
