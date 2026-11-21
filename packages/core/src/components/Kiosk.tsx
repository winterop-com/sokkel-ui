import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/** The aside's width beside the stage: 16rem, 20rem or 24rem. */
export type KioskAsideWidth = 'sm' | 'md' | 'lg'

/** The stage and the aside side by side from a room 48rem wide, the aside at its width. */
const BESIDE: Record<KioskAsideWidth, string> = {
    sm: '@3xl:grid-cols-[minmax(0,1fr)_16rem]',
    md: '@3xl:grid-cols-[minmax(0,1fr)_20rem]',
    lg: '@3xl:grid-cols-[minmax(0,1fr)_24rem]',
}

export interface KioskProps {
    /** The app's mark, before the title. */
    mark?: ReactNode
    /** What the wall shows. */
    title: ReactNode
    /** The time, drawn large in tabular numerals at the head's end. */
    clock?: ReactNode
    /** Quiet buttons at the head's end, before the clock: leave the wall, go full screen. */
    actions?: ReactNode
    /** A row of counters under the head, each a `Stat`: as many in a row as fit, wrapping in a narrow room. */
    figures?: ReactNode
    /** The stage: it takes all the room left, and what is put on it, such as a map, fills it. */
    children: ReactNode
    /** Beside the stage in a wide room, scrolling by itself; under it in a narrow one. */
    aside?: ReactNode
    /** The aside's width beside the stage: 16rem (`sm`), 20rem (`md`, the default) or 24rem (`lg`). */
    asideWidth?: KioskAsideWidth
    /** A strip along the bottom, such as an alert ticker. */
    foot?: ReactNode
    /** Names the region for a screen reader. */
    label?: string
    className?: string
}

/**
 * The frame of a wall or kiosk view, for a screen on a wall with nobody at a keyboard: no rail and
 * no top bar, only a head (the mark, the title, quiet actions and a large clock), a row of counters,
 * the stage with an aside beside it, and a strip along the bottom. It fills the height it is given
 * on the app's background and the stage takes all the room the rest leaves. In a room narrower than
 * 48rem everything stacks, the stage keeps 18rem of height and the frame scrolls down, never
 * sideways.
 */
export function Kiosk({ mark, title, clock, actions, figures, children, aside, asideWidth = 'md', foot, label, className }: KioskProps) {
    return (
        <section
            aria-label={label}
            data-slot="kiosk"
            className={cn(
                '@container flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-background text-foreground',
                className,
            )}
        >
            <div className="flex min-w-0 shrink-0 grow flex-col gap-3 p-3 @3xl:gap-4 @3xl:p-4">
                <header data-slot="kiosk-head" className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
                    {mark !== undefined && <span className="flex shrink-0 items-center">{mark}</span>}
                    <h1 className="min-w-0 flex-1 truncate text-page-title">{title}</h1>
                    {actions !== undefined && (
                        <div data-slot="kiosk-actions" className="flex shrink-0 items-center gap-1 text-muted-foreground">
                            {actions}
                        </div>
                    )}
                    {clock !== undefined && (
                        <span
                            data-slot="kiosk-clock"
                            className="shrink-0 text-page font-semibold whitespace-nowrap tabular-nums @3xl:text-statistic"
                        >
                            {clock}
                        </span>
                    )}
                </header>
                {figures !== undefined && (
                    <div
                        data-slot="kiosk-figures"
                        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(9rem, 100%), 1fr))' }}
                        className="grid min-w-0 shrink-0 gap-3 [:where(&>*)]:min-w-0"
                    >
                        {figures}
                    </div>
                )}
                <div
                    data-slot="kiosk-body"
                    className={cn(
                        'grid min-w-0 grow grid-cols-1 gap-3 @3xl:min-h-72 @3xl:basis-0 @3xl:grid-rows-[minmax(0,1fr)] @3xl:gap-4',
                        aside === undefined ? 'grid-rows-[minmax(18rem,1fr)]' : ['grid-rows-[minmax(18rem,1fr)_auto]', BESIDE[asideWidth]],
                    )}
                >
                    <div data-slot="kiosk-stage" className="relative min-h-0 min-w-0">
                        <div className="absolute inset-0 flex flex-col *:min-h-0 *:flex-1">{children}</div>
                    </div>
                    {aside !== undefined && (
                        <aside data-slot="kiosk-aside" className="min-h-0 min-w-0 @3xl:overflow-y-auto">
                            {aside}
                        </aside>
                    )}
                </div>
                {foot !== undefined && (
                    <footer data-slot="kiosk-foot" className="min-w-0 shrink-0">
                        {foot}
                    </footer>
                )}
            </div>
        </section>
    )
}
