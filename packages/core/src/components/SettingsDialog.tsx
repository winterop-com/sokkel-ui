import { ChevronLeft, XIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { NESTED, SHEET } from './DialogShell'
import { IconButton } from './IconButton'
import { SearchField } from './SearchField'
import {
    SETTINGS_WORDS,
    SettingRows,
    SettingsNavList,
    SettingsReset,
    shownSettings,
    type SettingsGroup,
    type SettingsWords,
} from './settings-parts'
import { Button } from './ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from './ui/dialog'

export { filterSettings, type Setting, type SettingsGroup, type SettingsSection, type SettingsWords } from './settings-parts'

/** The words a settings dialog says. */
export interface SettingsDialogWords extends SettingsWords {
    close: string
    back: string
}

/** A settings dialog's own words in English; a dialog with words of its own starts from these. */
export const SETTINGS_DIALOG_WORDS: SettingsDialogWords = { ...SETTINGS_WORDS, close: 'Close', back: 'Back' }

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
     * A section with `reset: false` shows none while it is the shown one, under a `section` reset.
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
 * A search narrows the rows to those whose title, description or `keywords` match, or whose
 * section's name does, and the navigation to the sections that still have one. When the chosen
 * section has none left, the first section that does is shown.
 *
 * A footer under both, outside the scrolling, says that changes are kept as they are made (or
 * the app's own `footer`) and ends with Done, which closes the dialog. `onReset` adds Reset to
 * defaults at its start, for the shown section or for every setting, asked once more before it runs.
 *
 * Below `md` (768), on a phone or a foldable, the dialog fills the screen and the navigation is a
 * list to go into: choosing a section shows its rows, and a back button returns to the list.
 * `phoneStart` says which of the two it opens on. The footer stays at the foot of the screen, clear of the home indicator,
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
    words = SETTINGS_DIALOG_WORDS,
}: SettingsDialogProps) {
    const say = { ...SETTINGS_DIALOG_WORDS, ...words }
    const [phoneView, setPhoneView] = useState(phoneStart)
    const nav = useRef<HTMLElement | null>(null)
    const pane = useRef<HTMLDivElement | null>(null)
    const { visible, shown } = shownSettings(groups, search, active)
    const inSection = phoneView === 'section'
    const all = resetScope === 'all'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                initialFocus={() => {
                    // A wide screen starts in the search; a phone starts on the pane in view, so no keyboard rises.
                    if (window.matchMedia('(min-width: 48rem)').matches) return nav.current?.querySelector('input') ?? true
                    return (phoneView === 'section' ? pane.current : nav.current) ?? true
                }}
                className={cn('flex h-[min(44rem,calc(100svh-4rem))] flex-col gap-0 overflow-hidden p-0 md:max-w-4xl', NESTED, SHEET)}
            >
                <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-4 max-md:pl-2">
                    {inSection && (
                        <IconButton label={say.back} className="md:hidden" onClick={() => setPhoneView('list')}>
                            <ChevronLeft aria-hidden />
                        </IconButton>
                    )}
                    <DialogTitle className={cn('flex-1', !inSection && 'max-md:pl-2')}>{say.title}</DialogTitle>
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
                            'flex w-full flex-col gap-4 overflow-y-auto p-3 outline-none md:w-56 md:shrink-0 md:border-r md:border-border',
                            inSection && 'max-md:hidden',
                        )}
                    >
                        <SearchField
                            value={search}
                            onChange={onSearchChange}
                            placeholder={say.search}
                            label={say.searchLabel}
                            shortcut={false}
                            words={{ clear: say.clear }}
                        />
                        <SettingsNavList
                            groups={visible}
                            shown={shown?.id}
                            ground="dialog"
                            onChoose={(id) => {
                                onActiveChange(id)
                                setPhoneView('section')
                            }}
                        />
                        {visible.length === 0 && <p className="px-2 text-sm text-muted-foreground md:hidden">{say.noMatch}</p>}
                    </nav>
                    <div
                        key={shown?.id}
                        ref={pane}
                        tabIndex={-1}
                        className={cn('min-w-0 flex-1 overflow-y-auto px-4 py-5 outline-none md:px-8', !inSection && 'max-md:hidden')}
                    >
                        {shown === undefined ? (
                            <p className="text-sm text-muted-foreground">{say.noMatch}</p>
                        ) : (
                            <section className="flex flex-col">
                                <h2 className="pb-1 text-detail-title">{shown.heading ?? shown.label}</h2>
                                <SettingRows section={shown} />
                            </section>
                        )}
                    </div>
                </div>
                <DialogFooter className="m-0 shrink-0 flex-nowrap max-md:rounded-none max-md:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]">
                    {onReset !== undefined && (
                        <SettingsReset
                            onReset={onReset}
                            all={all}
                            section={shown}
                            say={say}
                            className={cn(!all && !inSection && 'max-md:hidden')}
                        />
                    )}
                    <div role="status" className="min-w-0 flex-1 text-xs text-muted-foreground">
                        {footer ?? say.saved}
                    </div>
                    <DialogClose render={<Button />}>{say.done}</DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
