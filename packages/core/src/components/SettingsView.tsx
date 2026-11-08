import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { ChipBar, type ChipBarWords } from './ChipBar'
import { FormBar } from './FormBar'
import { PageHeader } from './PageHeader'
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
import { Page } from './Shell'
import { SubNav } from './SubNav'
import { Button } from './ui/button'

export type { Setting, SettingsGroup, SettingsSection, SettingsWords } from './settings-parts'

/** The words a settings page says. */
export interface SettingsViewWords extends SettingsWords {
    /** The row of sections a narrow page shows on top: the buttons that scroll it. */
    chips: Partial<ChipBarWords>
    /** The navigation column's resize edge. */
    resize: string
}

const WORDS: SettingsViewWords = { ...SETTINGS_WORDS, chips: {}, resize: 'Resize the column' }

export interface SettingsViewProps {
    groups: readonly SettingsGroup[]
    /** The id of the chosen section. */
    active: string
    onActiveChange: (id: string) => void
    search: string
    onSearchChange: (search: string) => void
    /** The note at the start of the footer, in place of the words' `saved`: when the settings were last saved, or how they sync. */
    footer?: ReactNode
    /**
     * Adds Reset to defaults at the start of the footer, which asks once more before it calls this.
     * It is given the shown section's id when `resetScope` is `section`, and nothing when it is `all`.
     */
    onReset?: (section?: string) => void
    /** What Reset to defaults puts back: the shown section (the default) or every setting. */
    resetScope?: 'section' | 'all'
    /** Adds Done at the footer's end, for where the person goes once they are through, such as back to the page they came from. */
    onDone?: () => void
    /** The width in pixels the navigation column starts at; it resizes from its edge, as `SubNav` does. */
    defaultNavSize?: number
    className?: string
    words?: Partial<SettingsViewWords>
}

/**
 * Settings as a page of the app, inside `Shell`: the same groups, search, reset and words as
 * `SettingsDialog`, laid out as a page. The sections stand down the side in a `SubNav` with the
 * search over them, the chosen section's rows fill the page under its title and scroll on their own,
 * and a `FormBar` across the foot says that changes are kept as they are made (or the app's own
 * `footer`), with Reset to defaults at its start when `onReset` is given and Done at its end when
 * `onDone` is.
 *
 * A search narrows the rows to those whose title, description or `keywords` match, or whose
 * section's name does, and the sections to those that still have one; when the chosen section has
 * none left, the first that does is shown.
 *
 * Below the `lg` breakpoint the side column gives way to the search and a row of the sections on
 * top of the page, which scrolls sideways when they do not fit and keeps the chosen one in view.
 */
export function SettingsView({
    groups,
    active,
    onActiveChange,
    search,
    onSearchChange,
    footer,
    onReset,
    resetScope = 'section',
    onDone,
    defaultNavSize = 240,
    className,
    words,
}: SettingsViewProps) {
    const say = { ...WORDS, ...words }
    const pane = useRef<HTMLDivElement>(null)
    const { visible, sections, shown } = shownSettings(groups, search, active)
    const all = resetScope === 'all'
    const searchField = (
        <SearchField value={search} onChange={onSearchChange} placeholder={say.search} shortcut={false} words={{ clear: say.clear }} />
    )

    // A section chosen anew starts at its top, as a page reached by a link does.
    const shownId = shown?.id
    useEffect(() => {
        pane.current?.scrollTo({ top: 0 })
    }, [shownId])

    return (
        <div data-slot="settings-view" className={cn('flex h-full min-h-0 flex-col', className)}>
            <div className="flex min-h-0 flex-1">
                <SubNav label={say.title} search={searchField} defaultSize={defaultNavSize} words={{ resize: say.resize }}>
                    <div className="flex flex-col gap-4">
                        <SettingsNavList groups={visible} shown={shownId} ground="sidebar" onChoose={onActiveChange} />
                    </div>
                </SubNav>
                <div ref={pane} className="min-w-0 flex-1 overflow-y-auto">
                    <Page className="max-w-3xl">
                        <div className="flex flex-col gap-3 lg:hidden">
                            {searchField}
                            {sections.length > 0 && (
                                <ChipBar
                                    label={say.title}
                                    chips={sections.map((section) => ({ value: section.id, label: section.label }))}
                                    value={shownId ?? ''}
                                    onValueChange={onActiveChange}
                                    words={say.chips}
                                />
                            )}
                        </div>
                        {shown === undefined ? (
                            <p className="text-sm text-muted-foreground">{say.noMatch}</p>
                        ) : (
                            <section className="flex flex-col">
                                <PageHeader title={shown.heading ?? shown.label} />
                                <SettingRows section={shown} />
                            </section>
                        )}
                    </Page>
                </div>
            </div>
            <FormBar
                note={footer ?? say.saved}
                start={
                    onReset === undefined ? undefined : <SettingsReset onReset={onReset} all={all} section={shown} say={say} size="sm" />
                }
            >
                {onDone !== undefined && (
                    <Button size="sm" onClick={onDone}>
                        {say.done}
                    </Button>
                )}
            </FormBar>
        </div>
    )
}
