import { X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One open document: a note, a file, a query. */
export interface DocumentTab {
    id: string
    label: string
    icon?: LucideIcon
    /** Holds changes not saved yet: a dot stands in the close button's place until the tab is pointed at. */
    dirty?: boolean
    /** A longer name shown on hover, such as the document's folder and name. */
    title?: string
}

/** The words the tabs say. */
export interface DocumentTabsWords {
    /** What the strip is called, for a screen reader. */
    label: string
    /** A tab's close button. */
    close: (label: string) => string
    /** The dot of a tab with changes not saved yet. */
    unsaved: string
}

const WORDS: DocumentTabsWords = {
    label: 'Open documents',
    close: (label) => `Close ${label}`,
    unsaved: 'Not saved yet',
}

export interface DocumentTabsProps {
    tabs: readonly DocumentTab[]
    /** The tab shown, or null for none. */
    active: string | null
    onActiveChange: (id: string) => void
    /** Closes a tab, from its close button or a middle click; without it tabs have no close. */
    onClose?: (id: string) => void
    /** Controls at the strip's end, outside its scrolling: a new document, a menu of recent ones. */
    end?: ReactNode
    className?: string
    words?: Partial<DocumentTabsWords>
}

/**
 * The documents open in a work area, a tab each, as an editor shows them: the icon, the name cut
 * short to fit, and a close button, which a tab with unsaved changes shows as a dot until pointed
 * at. The shown tab stands on the content's ground, joined to it, under a line in the primary ink. A middle click closes a tab; the
 * arrow keys, Home and End move along the strip and show the tab reached. Past the room it has,
 * the strip scrolls sideways, keeping the shown tab in view, while `end` stays at its end.
 */
export function DocumentTabs({ tabs, active, onActiveChange, onClose, end, className, words: given }: DocumentTabsProps) {
    const words = { ...WORDS, ...given }
    const strip = useRef<HTMLDivElement>(null)

    // The shown tab is scrolled into view as it changes, opened from elsewhere or reached by the keys.
    useEffect(() => {
        if (active === null) return
        strip.current
            ?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)
            ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [active, tabs.length])

    const move = (event: KeyboardEvent, index: number) => {
        const to =
            event.key === 'ArrowRight'
                ? Math.min(tabs.length - 1, index + 1)
                : event.key === 'ArrowLeft'
                  ? Math.max(0, index - 1)
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : null
        if (to === null) return
        event.preventDefault()
        const tab = tabs[to]
        if (tab === undefined) return
        onActiveChange(tab.id)
        strip.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(tab.id)}"] [role="tab"]`)?.focus()
    }

    return (
        // The rule under the strip is an inset line the shown tab's ground covers, so the tab joins the content.
        <div
            data-slot="document-tabs"
            className={cn('flex h-9 min-w-0 shrink-0 items-stretch bg-sidebar shadow-[inset_0_-1px_0_var(--border-strong)]', className)}
        >
            <div
                ref={strip}
                role="tablist"
                aria-label={words.label}
                className="no-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto"
            >
                {tabs.map((tab, index) => {
                    const shown = tab.id === active
                    const Icon = tab.icon
                    return (
                        <div
                            key={tab.id}
                            data-tab={tab.id}
                            data-active={shown || undefined}
                            title={tab.title ?? tab.label}
                            className={cn(
                                'group/row relative flex max-w-56 min-w-0 shrink-0 items-center border-r border-border text-sm',
                                shown
                                    ? 'bg-background text-foreground shadow-[inset_0_2px_0_var(--primary)]'
                                    : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                            )}
                            onAuxClick={(event) => {
                                if (event.button !== 1 || onClose === undefined) return
                                event.preventDefault()
                                onClose(tab.id)
                            }}
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={shown}
                                tabIndex={shown || (active === null && index === 0) ? 0 : -1}
                                className={cn(
                                    'flex h-full min-w-0 flex-1 items-center gap-1.5 ps-3 outline-none focus-visible:ring-focus focus-visible:ring-ring focus-visible:ring-inset',
                                    onClose === undefined ? 'pe-3' : 'pe-1',
                                )}
                                onClick={() => onActiveChange(tab.id)}
                                onKeyDown={(event) => move(event, index)}
                            >
                                {Icon !== undefined && <Icon className="size-4 shrink-0" aria-hidden />}
                                <span className={cn('truncate', shown && 'font-medium')}>{tab.label}</span>
                            </button>
                            {onClose !== undefined && (
                                <span className="relative me-1.5 flex size-5 shrink-0 items-center justify-center">
                                    {tab.dirty === true && (
                                        <span
                                            role="img"
                                            aria-label={words.unsaved}
                                            className="size-2 rounded-full bg-foreground group-hover/row:opacity-0"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        aria-label={words.close(tab.label)}
                                        title={words.close(tab.label)}
                                        className={cn(
                                            'absolute inset-0 flex items-center justify-center rounded-sm text-muted-foreground hover:bg-hover hover:text-foreground',
                                            tab.dirty === true || !shown
                                                ? 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100'
                                                : undefined,
                                        )}
                                        onClick={() => onClose(tab.id)}
                                    >
                                        <X className="size-3.5" aria-hidden />
                                    </button>
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
            {/* Below md the end keeps room for its controls' finger hit areas, so none reaches past the window. */}
            {end !== undefined && <div className="flex shrink-0 items-center gap-1 px-1.5 max-md:pe-2.5">{end}</div>}
        </div>
    )
}
