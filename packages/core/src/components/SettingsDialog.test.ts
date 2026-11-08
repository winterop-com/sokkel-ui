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
            {
                id: 'theme',
                label: 'Theme',
                heading: 'Look and feel',
                settings: [
                    { id: 'scheme', title: 'Scheme', keywords: ['dark', 'light'], control: null },
                    { id: 'density', title: 'Density', keywords: ['compact'], control: null },
                ],
            },
        ],
    },
    {
        id: 'you',
        title: 'You',
        sections: [
            {
                id: 'account',
                label: 'Account',
                settings: [{ id: 'sessions', title: 'Other sessions', keywords: ['sign out', 'logout'], control: null }],
            },
        ],
    },
    {
        id: 'server',
        title: 'This server',
        sections: [{ id: 'server', label: 'Server', settings: [{ id: 'history', title: 'Run history', control: null }] }],
    },
]

const ids = (groups: SettingsGroup[]) => groups.flatMap((group) => group.sections.flatMap((section) => section.settings.map((s) => s.id)))

describe('a search over the settings', () => {
    test('leaves everything when it is blank', () => {
        expect(filterSettings(GROUPS, '  ')).toEqual(GROUPS)
    })

    test('keeps the settings whose title or description holds every word, ignoring case', () => {
        expect(ids(filterSettings(GROUPS, 'RUN'))).toEqual(['new-tab', 'history'])
        const described = filterSettings(GROUPS, 'sign opens')
        expect(described[0].sections[0].settings.map((s) => s.id)).toEqual(['start'])
    })

    test('finds a setting by its keywords, which may hold a space', () => {
        expect(ids(filterSettings(GROUPS, 'logout'))).toEqual(['sessions'])
        expect(ids(filterSettings(GROUPS, 'sign out'))).toEqual(['sessions'])
        expect(ids(filterSettings(GROUPS, 'Dark'))).toEqual(['scheme'])
    })

    test("keeps a whole section for its label or its heading, and narrows it by the setting's own words", () => {
        expect(ids(filterSettings(GROUPS, 'theme'))).toEqual(['scheme', 'density'])
        expect(ids(filterSettings(GROUPS, 'look and feel'))).toEqual(['scheme', 'density'])
        expect(ids(filterSettings(GROUPS, 'theme compact'))).toEqual(['density'])
        expect(ids(filterSettings(GROUPS, 'account'))).toEqual(['sessions'])
    })

    test('never joins two words into one across the parts it reads', () => {
        expect(ids(filterSettings(GROUPS, 'themescheme'))).toEqual([])
        expect(ids(filterSettings(GROUPS, 'darklight'))).toEqual([])
    })

    test('drops a section and a group left with no setting', () => {
        const groups = filterSettings(GROUPS, 'history')
        expect(groups.map((group) => group.id)).toEqual(['server'])
        expect(filterSettings(GROUPS, 'nothing like this')).toEqual([])
    })
})
