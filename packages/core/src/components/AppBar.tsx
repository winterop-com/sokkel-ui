import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { trafficLightsStyle, useTrafficLights, windowPressHandler, type DesktopWindow } from '../lib/desktop'
import { TopBar, type TopBarProps } from './TopBar'

/**
 * The app's bar along the top of a screen drawn without `Shell`, such as a page a dialog opens
 * over or a screen of its own: the app's mark, the trail to the screen, the search and the
 * actions, in the bar the shell draws, so the screen reads as the same app. `children` are drawn
 * over the bar, such as a `PageProgress` along its foot. With `desktop` it is the window's title
 * strip, as the shell's is: it drags the window and leaves room for the window's buttons.
 */
export function AppBar({
    children,
    className,
    desktop,
    ...bar
}: TopBarProps & {
    children?: ReactNode
    className?: string
    /** The desktop window the screen stands in, when its native title bar is hidden; leave it off in a browser. */
    desktop?: DesktopWindow
}) {
    const lights = useTrafficLights(desktop)
    return (
        <header
            data-window-drag={desktop === undefined ? undefined : ''}
            style={trafficLightsStyle(desktop)}
            onMouseDown={windowPressHandler(desktop)}
            className={cn(
                'relative flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong bg-sidebar px-3',
                lights && 'ps-(--spacing-traffic-lights)',
                className,
            )}
        >
            <TopBar {...bar} />
            {children}
        </header>
    )
}
