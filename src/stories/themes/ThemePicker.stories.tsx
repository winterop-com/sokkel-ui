import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SettingRow } from '@winterop-com/sokkel-ui/SettingRow'
import { ThemePicker, themeSettings, type ThemePickerWords, type ThemeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { CORNERS, THEMES, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'

/**
 * The appearance controls on their own, as an app's settings page holds them. Here they change
 * only themselves; the kitchen sink shows them re-theming an app.
 */
const meta: Meta = { title: 'Themes/Theme picker', parameters: { frame: 'padded' } }
export default meta

const START: ThemeSettings = { theme: 'paper', scheme: 'dark', density: 'regular', corners: 'theme', typeface: 'theme' }

function Picker({
    full,
    list = false,
    cards = false,
    words,
}: {
    full: boolean
    list?: boolean
    cards?: boolean
    words?: Partial<ThemePickerWords>
}) {
    const [settings, setSettings] = useState(START)
    return (
        <div
            className={
                list || cards
                    ? 'w-full max-w-md rounded-surface border border-border-strong bg-card p-4'
                    : 'w-full max-w-xs rounded-surface border border-border-strong bg-card p-4'
            }
        >
            <ThemePicker
                value={settings}
                onChange={setSettings}
                themes={THEMES}
                corners={full ? CORNERS : undefined}
                typefaces={full ? TYPEFACES : undefined}
                themeList={list}
                themeCards={cards}
                words={words}
            />
        </div>
    )
}

/** The theme, the scheme and the density, which the picker offers without being told. */
export const Basic: StoryObj = { render: () => <Picker full={false} /> }

/** With corners and typefaces given as well. */
export const Full: StoryObj = { render: () => <Picker full /> }

/**
 * The themes as rows (`themeList`), each with its swatch, its name and the line saying how it looks,
 * as a settings section with room for them lists them; the select says the same line under each name.
 */
export const ThemeList: StoryObj = { name: 'Theme list', render: () => <Picker full={false} list /> }

/** The themes as cards (`themeCards`), each a small page in its own theme's background, card, lines, text and brand. */
export const ThemeCards: StoryObj = { name: 'Theme cards', render: () => <Picker full={false} cards /> }

/**
 * The choices as settings rows (`themeSettings`), as a settings dialog's appearance section lists
 * them: each with its title and a line on what it changes, its control beside it while the row has
 * room and under it on a phone.
 */
export const SettingsRows: StoryObj = {
    name: 'Settings rows',
    render: function Render() {
        const [settings, setSettings] = useState<ThemeSettings>({ ...START, motion: 'system' })
        return (
            <Stack gap="none" className="max-w-2xl divide-y divide-border">
                {themeSettings({
                    value: settings,
                    onChange: setSettings,
                    themes: THEMES,
                    corners: CORNERS,
                    typefaces: TYPEFACES,
                    system: true,
                }).map((setting) => (
                    <SettingRow key={setting.id} {...setting} />
                ))}
            </Stack>
        )
    },
}

/** The words in Norwegian, as an app that translates them passes them. */
export const Translated: StoryObj = {
    render: () => (
        <Picker
            full={false}
            words={{
                theme: 'Tema',
                scheme: 'Fargeskjema',
                dark: 'Mørk',
                light: 'Lys',
                density: 'Tetthet',
                regular: 'Vanlig',
                compact: 'Kompakt',
            }}
        />
    ),
}
