import { IconButton } from './IconButton'
import { ChevronLeft, ChevronRight, XIcon, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ConfirmDialog, NESTED } from './DialogShell'
import { SearchField } from './SearchField'
import { SettingRow, type SettingRowLayout } from './SettingRow'
import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from './ui/dialog'

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
    /** The footer's note, unless the app gives its own `footer`. */
    saved: string
    /** The footer's button that closes the dialog. */
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

const WORDS: SettingsDialogWords = {
    title: 'Settings',
    search: 'Search settings',
    clear: 'Clear the search',
    close: 'Close',
    back: 'Back',
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

export interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    groups: readonly SettingsGroup[]
    /** The id of the chosen section. */
    active: string
    onActiveChange: (id: string) => void
    search: string
    onSearchChange: (search: string) => void
    phoneStart?: 'list' | 'section'
    /** The note at the start of the footer, in place of the words' `saved`: when the settings were last saved, or how they sync. */
    footer?: ReactNode
    /**
     * Adds Reset to defaults at the start of the footer, which asks once more before it calls this.
     * It is given the shown section's id when `resetScope` is `section`, and nothing when it is `all`.
     */
    onReset?: (section?: string) => void
    /** What Reset to defaults puts back: the shown section (the default) or every setting. */
    resetScope?: 'section' | 'all'
    words?: Partial<SettingsDialogWords>
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
 * A footer under both, outside the scrolling, says that changes are kept as they are made (or
 * the app's own `footer`) and ends with Done, which closes the dialog. `onReset` adds Reset to
 * defaults at its start, for the shown section or for every setting, asked once more before it runs.
 *
 * On a phone the dialog fills the screen and the navigation is a list to go into: choosing a
 * section shows its rows, and a back button returns to the list. `phoneStart` says which of the
 * two a phone opens on. The footer stays at the foot of the screen, clear of the home indicator,
 * and a section's reset shows only inside the section.
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
    footer,
    onReset,
    resetScope = 'section',
    words = WORDS,
}: SettingsDialogProps) {
    const say = { ...WORDS, ...words }
    const [phoneView, setPhoneView] = useState(phoneStart)
    const [resetting, setResetting] = useState(false)
    const nav = useRef<HTMLElement | null>(null)
    const pane = useRef<HTMLDivElement | null>(null)
    const visible = filterSettings(groups, search)
    const sections = visible.flatMap((group) => group.sections)
    const shown = sections.find((section) => section.id === active) ?? sections[0]
    const inSection = phoneView === 'section'
    const all = resetScope === 'all'
    const resettable = onReset !== undefined && (all || shown !== undefined)

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
                    NESTED,
                    'max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
                )}
            >
                <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-4 max-sm:pl-2">
                    {inSection && (
                        <IconButton label={say.back} className="sm:hidden" onClick={() => setPhoneView('list')}>
                            <ChevronLeft aria-hidden />
                        </IconButton>
                    )}
                    <DialogTitle className={cn('flex-1', !inSection && 'max-sm:pl-2')}>{say.title}</DialogTitle>
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
                                                    : 'sm:text-muted-foreground sm:hover:bg-hover sm:hover:text-foreground',
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
                                <h2 className="pb-1 text-detail-title">{shown.heading ?? shown.label}</h2>
                                <div className="flex flex-col divide-y divide-border">
                                    {shown.settings.map((setting) => (
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
                            </section>
                        )}
                    </div>
                </div>
                <DialogFooter className="m-0 shrink-0 flex-nowrap max-sm:rounded-none max-sm:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]">
                    {resettable && (
                        <Button variant="ghost" className={cn(!all && !inSection && 'max-sm:hidden')} onClick={() => setResetting(true)}>
                            {say.reset}
                        </Button>
                    )}
                    <div role="status" className="min-w-0 flex-1 text-xs text-muted-foreground">
                        {footer ?? say.saved}
                    </div>
                    <DialogClose render={<Button />}>{say.done}</DialogClose>
                </DialogFooter>
                {onReset !== undefined && (
                    <ConfirmDialog
                        open={resetting}
                        onOpenChange={setResetting}
                        question={all ? say.resetAll : say.resetSection(shown?.label ?? '')}
                        detail={all ? say.resetAllDetail : say.resetSectionDetail(shown?.label ?? '')}
                        confirm={{
                            label: say.resetConfirm,
                            destructive: true,
                            onConfirm: () => {
                                onReset(all ? undefined : shown?.id)
                                setResetting(false)
                            },
                        }}
                        words={{ cancel: say.cancel }}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
