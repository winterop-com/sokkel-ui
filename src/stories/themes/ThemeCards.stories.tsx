import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { type Scheme, SchemeChoice } from '@winterop-com/sokkel-ui/SchemeChoice'
import { SettingRow } from '@winterop-com/sokkel-ui/SettingRow'
import { ThemeCards } from '@winterop-com/sokkel-ui/ThemeCards'

/**
 * The theme as cards, each a small page in its own theme's tokens, and the scheme as its own
 * control: the two parts `ThemePicker` is made of, for an app that gives each a settings row.
 */
const meta: Meta = { title: 'Themes/Theme cards', parameters: { frame: 'padded' } }
export default meta

function Cards() {
    const [theme, setTheme] = useState('contrast')
    return <ThemeCards value={theme} onValueChange={setTheme} />
}

/** Every theme as a card in the scheme the toolbar sets, contrast chosen; the arrow keys move and choose. */
export const Basic: StoryObj = { render: () => <Cards /> }

/** Every theme's card in the light scheme, where their backgrounds, cards and lines differ most from the dark. */
export const Light: StoryObj = { globals: { theme: 'light' }, render: () => <Cards /> }

/** Every theme's card in the dark scheme. */
export const Dark: StoryObj = { globals: { theme: 'dark' }, render: () => <Cards /> }

/**
 * The scheme and the theme as two settings rows, as an app's appearance section lists them, each
 * found by its own title: `SchemeChoice` beside its title, `ThemeCards` under its description.
 */
export const SettingsRows: StoryObj = {
    name: 'Settings rows',
    render: function Render() {
        const [scheme, setScheme] = useState<Scheme>('system')
        const [theme, setTheme] = useState('tidevann')
        return (
            <Stack gap="none" className="max-w-2xl divide-y divide-border">
                <SettingRow
                    title="Scheme"
                    description="Light, dark, or following the device."
                    control={<SchemeChoice value={scheme} onValueChange={setScheme} />}
                />
                <SettingRow
                    title="Theme"
                    description="The colors of surfaces, lines, text and the accent."
                    layout="below"
                    control={<ThemeCards value={theme} onValueChange={setTheme} />}
                />
            </Stack>
        )
    },
}
