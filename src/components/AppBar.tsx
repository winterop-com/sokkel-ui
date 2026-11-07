import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { TopBar, type TopBarProps } from './TopBar'

/**
 * The app's bar along the top of a screen drawn without `Shell`, such as a page a dialog opens
 * over or a screen of its own: the app's mark, the trail to the screen, the search and the
 * actions, in the bar the shell draws, so the screen reads as the same app. `children` are drawn
 * over the bar, such as a `PageProgress` along its foot.
 */
export function AppBar({ children, className, ...bar }: TopBarProps & { children?: ReactNode; className?: string }) {
    return (
        <header
            className={cn('relative flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong bg-sidebar px-3', className)}
        >
            <TopBar {...bar} />
            {children}
        </header>
    )
}
