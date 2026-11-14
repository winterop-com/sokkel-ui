import type { LucideIcon } from 'lucide-react'
import type { KeyboardEvent } from 'react'

import { cn } from '../lib/cn'

/** One tab of a side panel as the shell's tab strip shows it. */
export interface StripTab {
    id: string
    label: string
    icon?: LucideIcon
}

/** A side panel's tabs and the one shown, handed up to the shell for its strip. */
export interface PanelTabs {
    tabs: readonly StripTab[]
    active: string
    choose: (id: string) => void
}

/**
 * The shell's tab strip, for a `SidePanel` inside it: `publish` hands the panel's tabs up, null
 * takes them back. While `shown` the strip stands at the foot of the screen and the panel is drawn
 * as the sheet over it, its content the tabpanel `panelId` labelled by the strip's tab `tabId`.
 */
export interface PanelStrip {
    publish: (tabs: PanelTabs | null) => void
    shown: boolean
    tabId: (id: string) => string
    panelId: string
}

export interface PanelTabStripProps {
    tabs: readonly StripTab[]
    /** The panel's shown tab. */
    active: string
    /** Whether the sheet is up. */
    open: boolean
    /** The tablist's name. */
    label: string
    tabId: (id: string) => string
    panelId: string
    onPress: (id: string) => void
    className?: string
}

/** Where an arrow, Home or End moves focus in a row of `count` tabs from `at`, wrapping; undefined for any other key. */
export function stripStep(key: string, at: number, count: number): number | undefined {
    if (key === 'ArrowRight') return (at + 1) % count
    if (key === 'ArrowLeft') return (at - 1 + count) % count
    if (key === 'Home') return 0
    if (key === 'End') return count - 1
    return undefined
}

/**
 * A side panel's tabs as a strip at the foot of the screen, each a finger's height or more. The
 * open tab is selected and expanded; with the sheet down none is. The shown tab takes the Tab key,
 * and the arrows, Home and End move between the tabs without pressing them.
 */
export function PanelTabStrip({ tabs, active, open, label, tabId, panelId, onPress, className }: PanelTabStripProps) {
    const move = (event: KeyboardEvent<HTMLDivElement>) => {
        const at = tabs.findIndex((tab) => tabId(tab.id) === (event.target as HTMLElement).id)
        if (at < 0) return
        const next = stripStep(event.key, at, tabs.length)
        const tab = next === undefined ? undefined : tabs[next]
        if (tab === undefined) return
        event.preventDefault()
        document.getElementById(tabId(tab.id))?.focus()
    }
    return (
        <div
            role="tablist"
            aria-label={label}
            className={cn('flex h-shell-tabs shrink-0 items-stretch gap-1 border-t border-border-strong bg-sidebar px-2 py-1.5', className)}
            onKeyDown={move}
        >
            {tabs.map((tab) => {
                const on = open && tab.id === active
                const Icon = tab.icon
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={tabId(tab.id)}
                        aria-selected={on}
                        aria-expanded={on}
                        aria-controls={panelId}
                        tabIndex={tab.id === active ? 0 : -1}
                        className={cn(
                            'flex min-h-finger min-w-finger flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 outline-none focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid',
                            Icon === undefined ? 'text-sm' : 'text-xs',
                            on ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                        )}
                        onClick={() => onPress(tab.id)}
                    >
                        {Icon !== undefined && <Icon className="size-5" aria-hidden />}
                        <span className="max-w-full truncate">{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
