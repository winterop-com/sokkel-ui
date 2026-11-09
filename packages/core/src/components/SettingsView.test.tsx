import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { shownSettings, type SettingsGroup } from './settings-parts'
import { SettingsView } from './SettingsView'

const GROUPS: SettingsGroup[] = [
    {
        id: 'preferences',
        title: 'Preferences',
        sections: [
            {
                id: 'general',
                label: 'General',
                settings: [{ id: 'start', title: 'Start page', description: 'What opens after you sign in.', control: null }],
            },
            { id: 'theme', label: 'Theme', heading: 'Look and feel', settings: [{ id: 'scheme', title: 'Scheme', control: null }] },
            { id: 'account', label: 'Account', reset: false, settings: [{ id: 'name', title: 'Name', control: null }] },
        ],
    },
]

describe('shownSettings', () => {
    it('shows the chosen section', () => {
        expect(shownSettings(GROUPS, '', 'theme').shown?.id).toBe('theme')
    })

    it('shows the first section left when the chosen one has no match', () => {
        const { sections, shown } = shownSettings(GROUPS, 'sign in', 'theme')
        expect(sections.map((section) => section.id)).toEqual(['general'])
        expect(shown?.id).toBe('general')
    })

    it('shows none when nothing matches', () => {
        expect(shownSettings(GROUPS, 'nothing like this', 'general')).toEqual({ visible: [], sections: [], shown: undefined })
    })
})

describe('SettingsView', () => {
    const view = (extra: Partial<Parameters<typeof SettingsView>[0]> = {}) =>
        renderToStaticMarkup(
            <SettingsView
                groups={GROUPS}
                active="theme"
                onActiveChange={() => undefined}
                search=""
                onSearchChange={() => undefined}
                {...extra}
            />,
        )

    it('titles the page with the heading of the section and says changes are kept', () => {
        const page = view()
        expect(page).toContain('Look and feel</h1>')
        expect(page).toContain('Changes are saved as you make them')
        expect(page).not.toContain('>Done</button>')
        expect(page).not.toContain('Reset to defaults')
    })

    it('adds Done with `onDone`, and Reset to defaults and the note of the app with `onReset` and `footer`', () => {
        const page = view({ onDone: () => undefined, onReset: () => undefined, footer: 'Synced at 09:52' })
        expect(page).toContain('>Done</button>')
        expect(page).toContain('Reset to defaults')
        expect(page).toContain('Synced at 09:52')
    })

    it('leaves Reset to defaults out for a section with nothing to put back, unless every setting is reset', () => {
        expect(view({ active: 'account', onReset: () => undefined })).not.toContain('Reset to defaults')
        expect(view({ active: 'account', onReset: () => undefined, resetScope: 'all' })).toContain('Reset to defaults')
    })

    it('says when nothing matches the search', () => {
        expect(view({ search: 'nothing like this' })).toContain('No setting matches the search.')
    })
})
