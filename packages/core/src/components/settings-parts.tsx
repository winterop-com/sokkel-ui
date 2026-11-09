import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ConfirmDialog } from './DialogShell'
import { SettingRow, type SettingRowLayout } from './SettingRow'
import { Button } from './ui/button'

/** One setting in a section: what it is called, what it does, and the control that sets it. */
export interface Setting {
    id: string
    title: string
    description?: string
    /** A line under the description: what the setting needs, or what it changes elsewhere. */
    note?: ReactNode
    control: ReactNode
    /** Where the control sits: `trailing` for a switch or a small button, `below` for a wide control; by the row's width when absent. */
    layout?: SettingRowLayout
    /** Other words the search finds the setting by, never drawn: "logout" for Sign out, "dark" for the scheme. */
    keywords?: readonly string[]
}

/** A page of settings, reached from the navigation. */
export interface SettingsSection {
    id: string
    label: string
    icon?: LucideIcon
    /** The heading over the section's rows; the label when absent. */
    heading?: string
    settings: readonly Setting[]
    /**
     * `false` leaves Reset to defaults out while this section shows, for one with nothing to put
     * back (an account, sample data). Only a `section` reset reads it; a reset of every setting shows.
     */
    reset?: boolean
}

/** Sections under a title in the navigation: Preferences, You, This server. */
export interface SettingsGroup {
    id: string
    title?: string
    sections: readonly SettingsSection[]
}

/** The words settings say, in a dialog and on a page alike. */
export interface SettingsWords {
    title: string
    search: string
    clear: string
    noMatch: string
    /** The footer's note, unless the app gives its own `footer`. */
    saved: string
    /** The footer's button that ends the visit: it closes the dialog, or calls a page's `onDone`. */
    done: string
    /** The footer's button that asks to reset. */
    reset: string
    /** The question asked before the shown section is reset, given its label. */
    resetSection: (section: string) => string
    /** The line under that question. */
    resetSectionDetail: (section: string) => string
    /** The question asked before every setting is reset. */
    resetAll: string
    /** The line under that question. */
    resetAllDetail: string
    /** The verb that answers either question. */
    resetConfirm: string
    cancel: string
}

export const SETTINGS_WORDS: SettingsWords = {
    title: 'Settings',
    search: 'Search settings',
    clear: 'Clear the search',
    noMatch: 'No setting matches the search.',
    saved: 'Changes are saved as you make them',
    done: 'Done',
    reset: 'Reset to defaults',
    resetSection: (section) => `Reset ${section} to its defaults?`,
    resetSectionDetail: (section) => `Every setting in ${section} goes back to its default.`,
    resetAll: 'Reset every setting to its default?',
    resetAllDetail: 'Every setting in every section goes back to its default.',
    resetConfirm: 'Reset',
    cancel: 'Cancel',
}

/**
 * The groups as a search leaves them: each section keeps the settings that hold every word of the
 * search in their title, description or keywords or in the section's label or heading, so a search
 * for a section's name keeps the whole section, and a section or group left empty is dropped. An
 * empty search leaves everything.
 */
export function filterSettings(groups: readonly SettingsGroup[], search: string): SettingsGroup[] {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return [...groups]
    const matches = (section: SettingsSection) => (setting: Setting) => {
        const text = [section.label, section.heading ?? '', setting.title, setting.description ?? '', ...(setting.keywords ?? [])]
            .join('\n')
            .toLowerCase()
        return words.every((word) => text.includes(word))
    }
    return groups
        .map((group) => ({
            ...group,
            sections: group.sections
                .map((section) => ({ ...section, settings: section.settings.filter(matches(section)) }))
                .filter((section) => section.settings.length > 0),
        }))
        .filter((group) => group.sections.length > 0)
}

/** What a search leaves of the settings and which section shows: the chosen one, or the first left when it has no match. */
export interface SettingsShown {
    visible: SettingsGroup[]
    sections: SettingsSection[]
    shown: SettingsSection | undefined
}

/** The groups a search leaves, their sections in order, and the section shown for the `active` id. */
export function shownSettings(groups: readonly SettingsGroup[], search: string, active: string): SettingsShown {
    const visible = filterSettings(groups, search)
    const sections = visible.flatMap((group) => group.sections)
    return { visible, sections, shown: sections.find((section) => section.id === active) ?? sections[0] }
}

export interface SettingsNavListProps {
    groups: readonly SettingsGroup[]
    /** The id of the section shown. */
    shown: string | undefined
    onChoose: (id: string) => void
    ground: 'dialog' | 'sidebar'
}

/**
 * The sections under their group titles, the shown one marked. `ground` is what they stand on: a
 * dialog's own, where a phone draws them as a list to go into, each a finger tall with a chevron;
 * or the rail's, beside a page, where the shown one wears the rail's accent.
 */
export function SettingsNavList({ groups, shown, onChoose, ground }: SettingsNavListProps) {
    const dialog = ground === 'dialog'
    return groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-0.5">
            {group.title !== undefined && <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.title}</div>}
            {group.sections.map((section) => {
                const chosen = section.id === shown
                const Icon = section.icon
                return (
                    <button
                        key={section.id}
                        type="button"
                        aria-current={chosen ? 'page' : undefined}
                        className={cn(
                            'flex items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring',
                            dialog
                                ? [
                                      'min-h-finger sm:min-h-0 sm:py-1.5',
                                      chosen
                                          ? 'sm:bg-secondary sm:font-medium sm:text-foreground'
                                          : 'sm:text-muted-foreground sm:hover:bg-hover sm:hover:text-foreground',
                                  ]
                                : [
                                      'py-1.5',
                                      chosen
                                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                          : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                                  ],
                        )}
                        onClick={() => onChoose(section.id)}
                    >
                        {Icon !== undefined && <Icon className="size-4 shrink-0" aria-hidden />}
                        <span className="min-w-0 flex-1 truncate">{section.label}</span>
                        {dialog && <ChevronRight className="size-4 shrink-0 text-faint sm:hidden" aria-hidden />}
                    </button>
                )
            })}
        </div>
    ))
}

export interface SettingRowsProps {
    section: SettingsSection
}

/** A section's settings, one row each, ruled apart. */
export function SettingRows({ section }: SettingRowsProps) {
    return (
        <div className="flex flex-col divide-y divide-border">
            {section.settings.map((setting) => (
                <SettingRow
                    key={setting.id}
                    title={setting.title}
                    description={setting.description}
                    note={setting.note}
                    control={setting.control}
                    layout={setting.layout}
                />
            ))}
        </div>
    )
}

export interface SettingsResetProps {
    onReset: (section?: string) => void
    /** Resets every setting rather than the shown section. */
    all: boolean
    section: SettingsSection | undefined
    say: SettingsWords
    size?: 'sm' | 'default'
    className?: string
}

/**
 * Reset to defaults and the question it asks before it runs: for the shown section, given its
 * label and id, or for every setting when `all`. The answer calls `onReset` with the section's id,
 * or with nothing for every setting. Nothing is drawn for a section when none is shown, or when the
 * shown one says it has no `reset`.
 */
export function SettingsReset({ onReset, all, section, say, size, className }: SettingsResetProps) {
    const [asking, setAsking] = useState(false)
    if (!all && (section === undefined || section.reset === false)) return null
    const label = section?.label ?? ''
    return (
        <>
            <Button variant="ghost" size={size} className={className} onClick={() => setAsking(true)}>
                {say.reset}
            </Button>
            <ConfirmDialog
                open={asking}
                onOpenChange={setAsking}
                question={all ? say.resetAll : say.resetSection(label)}
                detail={all ? say.resetAllDetail : say.resetSectionDetail(label)}
                confirm={{
                    label: say.resetConfirm,
                    destructive: true,
                    onConfirm: () => {
                        onReset(all ? undefined : section?.id)
                        setAsking(false)
                    },
                }}
                words={{ cancel: say.cancel }}
            />
        </>
    )
}
