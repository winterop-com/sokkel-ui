import { describe, expect, test } from 'vitest'

import { filterSettings, type SettingsGroup } from './SettingsDialog'

const GROUPS: SettingsGroup[] = [
    {
        id: 'preferences',
        title: 'Preferences',
        sections: [
            {
                id: 'general',
                label: 'General',
                settings: [
                    { id: 'start', title: 'Start page', description: 'What opens after you sign in.', control: null },
                    { id: 'new-tab', title: 'Open runs in a new tab', control: null },
                ],
            },
            { id: 'theme', label: 'Theme', settings: [{ id: 'scheme', title: 'Scheme', control: null }] },
        ],
    },
    {
        id: 'server',
        title: 'This server',
        sections: [{ id: 'server', label: 'Server', settings: [{ id: 'history', title: 'Run history', control: null }] }],
    },
]

describe('a search over the settings', () => {
    test('leaves everything when it is blank', () => {
        expect(filterSettings(GROUPS, '  ')).toEqual(GROUPS)
    })

    test('keeps the settings whose title or description holds every word, ignoring case', () => {
        const ids = filterSettings(GROUPS, 'RUN').flatMap((group) => group.sections.flatMap((section) => section.settings.map((s) => s.id)))
        expect(ids).toEqual(['new-tab', 'history'])
        const described = filterSettings(GROUPS, 'sign opens')
        expect(described[0].sections[0].settings.map((s) => s.id)).toEqual(['start'])
    })

    test('drops a section and a group left with no setting', () => {
        const groups = filterSettings(GROUPS, 'history')
        expect(groups.map((group) => group.id)).toEqual(['server'])
        expect(filterSettings(GROUPS, 'nothing like this')).toEqual([])
    })
})
