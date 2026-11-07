import { IconButton } from './IconButton'
import { ChevronLeft, ChevronRight, XIcon, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { SearchField } from './SearchField'
import { SettingRow } from './SettingRow'
import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from './ui/dialog'

/** One setting in a section: what it is called, what it does, and the control that sets it. */
export interface Setting {
    id: string
    title: string
    description?: string
    /** A line under the description: what the setting needs, or what it changes elsewhere. */
    note?: ReactNode
    control: ReactNode
}

/** A page of settings, reached from the dialog's navigation. */
export interface SettingsSection {
    id: string
    label: string
    icon?: LucideIcon
    /** The heading over the section's rows; the label when absent. */
    heading?: string
    settings: readonly Setting[]
}

/** Sections under a title in the navigation: Preferences, You, This server. */
export interface SettingsGroup {
    id: string
    title?: string
    sections: readonly SettingsSection[]
}

/** The words a settings dialog says. */
export interface SettingsDialogWords {
    title: string
    search: string
    clear: string
    close: string
    back: string
    noMatch: string
}

const WORDS: SettingsDialogWords = {
    title: 'Settings',
    search: 'Search settings',
    clear: 'Clear the search',
    close: 'Close',
    back: 'Back',
    noMatch: 'No setting matches the search.',
}

/**
 * The groups as a search leaves them: each section keeps the settings whose title or description
 * holds every word of the search, and a section or group left empty is dropped. An empty search
 * leaves everything.
 */
export function filterSettings(groups: readonly SettingsGroup[], search: string): SettingsGroup[] {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return [...groups]
    const matches = (setting: Setting) => {
        const text = `${setting.title} ${setting.description ?? ''}`.toLowerCase()
        return words.every((word) => text.includes(word))
    }
    return groups
        .map((group) => ({
            ...group,
            sections: group.sections
                .map((section) => ({ ...section, settings: section.settings.filter(matches) }))
                .filter((section) => section.settings.length > 0),
        }))
        .filter((group) => group.sections.length > 0)
}

/**
 * A large dialog of settings: the navigation on the left, a search over every setting at its top
 * and the sections under their group titles, and the chosen section's rows on the right, which
 * scroll on their own.
 *
 * A search narrows the rows to those whose title or description match, and the navigation to the
 * sections that still have one. When the chosen section has none left, the first section that does
 * is shown.
 *
 * On a phone the dialog fills the screen and the navigation is a list to go into: choosing a
 * section shows its rows, and a back button returns to the list. `phoneStart` says which of the
 * two a phone opens on.
 */
export function SettingsDialog({
    open,
    onOpenChange,
    groups,
    active,
    onActiveChange,
    search,
    onSearchChange,
    phoneStart = 'list',
    words = WORDS,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    groups: readonly SettingsGroup[]
    /** The id of the chosen section. */
    active: string
    onActiveChange: (id: string) => void
    search: string
    onSearchChange: (search: string) => void
    phoneStart?: 'list' | 'section'
    words?: Partial<SettingsDialogWords>
}) {
    const say = { ...WORDS, ...words }
    const [phoneView, setPhoneView] = useState(phoneStart)
    const nav = useRef<HTMLElement | null>(null)
    const pane = useRef<HTMLDivElement | null>(null)
    const visible = filterSettings(groups, search)
    const sections = visible.flatMap((group) => group.sections)
    const shown = sections.find((section) => section.id === active) ?? sections[0]
    const inSection = phoneView === 'section'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                initialFocus={() => {
                    // A wide screen starts in the search; a phone starts on the pane in view, so no keyboard rises.
                    if (window.matchMedia('(min-width: 40rem)').matches) return nav.current?.querySelector('input') ?? true
                    return (phoneView === 'section' ? pane.current : nav.current) ?? true
                }}
                className={cn(
                    'flex h-[min(44rem,calc(100svh-4rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl',
                    'max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
                )}
            >
                <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-4 max-sm:pl-2">
                    {inSection && (
                        <IconButton label={say.back} className="sm:hidden" onClick={() => setPhoneView('list')}>
                            <ChevronLeft aria-hidden />
                        </IconButton>
                    )}
                    <DialogTitle className={cn('flex-1 text-base leading-6 font-medium', !inSection && 'max-sm:pl-2')}>
                        {say.title}
                    </DialogTitle>
                    <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={say.close} title={say.close} />}>
                        <XIcon aria-hidden />
                    </DialogClose>
                </div>
                <div className="flex min-h-0 flex-1">
                    <nav
                        ref={nav}
                        tabIndex={-1}
                        aria-label={say.title}
                        className={cn(
                            'flex w-full flex-col gap-4 overflow-y-auto p-3 outline-none sm:w-56 sm:shrink-0 sm:border-r sm:border-border',
                            inSection && 'max-sm:hidden',
                        )}
                    >
                        <SearchField
                            value={search}
                            onChange={onSearchChange}
                            placeholder={say.search}
                            shortcut={false}
                            words={{ clear: say.clear }}
                        />
                        {visible.map((group) => (
                            <div key={group.id} className="flex flex-col gap-0.5">
                                {group.title !== undefined && (
                                    <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.title}</div>
                                )}
                                {group.sections.map((section) => {
                                    const chosen = section.id === shown?.id
                                    const Icon = section.icon
                                    return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            aria-current={chosen ? 'page' : undefined}
                                            className={cn(
                                                'flex min-h-finger items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0 sm:py-1.5',
                                                chosen
                                                    ? 'sm:bg-secondary sm:font-medium sm:text-foreground'
                                                    : 'sm:text-muted-foreground sm:hover:bg-secondary/60 sm:hover:text-foreground',
                                            )}
                                            onClick={() => {
                                                onActiveChange(section.id)
                                                setPhoneView('section')
                                            }}
                                        >
                                            {Icon !== undefined && <Icon className="size-4 shrink-0" aria-hidden />}
                                            <span className="min-w-0 flex-1 truncate">{section.label}</span>
                                            <ChevronRight className="size-4 shrink-0 text-faint sm:hidden" aria-hidden />
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                        {visible.length === 0 && <p className="px-2 text-sm text-muted-foreground sm:hidden">{say.noMatch}</p>}
                    </nav>
                    <div
                        key={shown?.id}
                        ref={pane}
                        tabIndex={-1}
                        className={cn('min-w-0 flex-1 overflow-y-auto px-4 py-5 outline-none sm:px-8', !inSection && 'max-sm:hidden')}
                    >
                        {shown === undefined ? (
                            <p className="text-sm text-muted-foreground">{say.noMatch}</p>
                        ) : (
                            <section className="flex flex-col">
                                <h2 className="pb-1 text-base font-semibold">{shown.heading ?? shown.label}</h2>
                                <div className="flex flex-col divide-y divide-border">
                                    {shown.settings.map((setting) => (
                                        <SettingRow
                                            key={setting.id}
                                            title={setting.title}
                                            description={setting.description}
                                            note={setting.note}
                                            control={setting.control}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
