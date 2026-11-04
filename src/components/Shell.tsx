import { Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * The app's frame: the rail on the left, a thin top bar over the content, the content as the one
 * thing that scrolls, and an optional foot strip.
 *
 * The top bar and the rail's head are the same height and share one rule, so the shell reads as
 * one strip across the window; the foot strip lines up with the rail's foot cell the same way.
 *
 * Below the `md` breakpoint the rail leaves the frame: a menu button at the start of the top bar
 * opens it as a drawer over the content, and a press outside it or on a link closes it.
 */
export function Shell({
    rail,
    top,
    foot,
    panel,
    children,
    words = { menu: 'Open the navigation', close: 'Close the navigation' },
}: {
    rail: ReactNode
    /** What the top bar holds: a search, the version, the theme control. */
    top?: ReactNode
    /** What the foot strip holds to the right of the rail's foot cell, if anything. */
    foot?: ReactNode
    /** A side panel as the shell's right column, full height, its header level with the top bar. */
    panel?: ReactNode
    children: ReactNode
    words?: { menu: string; close: string }
}) {
    const [drawer, setDrawer] = useState(false)
    return (
        <div className="flex h-svh min-h-0 bg-background text-foreground">
            <div className="hidden md:flex">{rail}</div>
            {drawer && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <button type="button" aria-label={words.close} className="absolute inset-0 bg-scrim" onClick={() => setDrawer(false)} />
                    <div
                        className="absolute inset-y-0 left-0 flex shadow-pop"
                        onClick={(event) => {
                            if ((event.target as HTMLElement).closest('a')) setDrawer(false)
                        }}
                    >
                        {rail}
                    </div>
                </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
                {top !== undefined && (
                    <header className="flex h-shell-top shrink-0 items-center gap-2 border-b border-border-strong bg-sidebar px-3">
                        <button
                            type="button"
                            aria-label={words.menu}
                            title={words.menu}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary md:hidden"
                            onClick={() => setDrawer(true)}
                        >
                            <Menu className="size-4" aria-hidden />
                        </button>
                        {top}
                    </header>
                )}
                <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
                {foot !== undefined && (
                    <footer className="flex h-shell-foot shrink-0 items-center gap-3 border-t border-border-strong bg-sidebar px-3 text-xs text-muted-foreground">
                        {foot}
                    </footer>
                )}
            </div>
            {panel !== undefined && <div className="hidden lg:flex">{panel}</div>}
        </div>
    )
}

/** The content's own padding, the density's page inset, for a page to sit in. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-(--density-page-gap) px-(--density-page-inset) pt-(--density-page-top) pb-10', className)}>
            {children}
        </div>
    )
}
