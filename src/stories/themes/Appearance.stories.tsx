import type { Meta, StoryObj } from '@storybook/react-vite'

import { useAppearance } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { useScheme } from '@winterop-com/sokkel-ui/hooks/use-scheme'
import { Stack, Row } from '@winterop-com/sokkel-ui/Layout'
import { CORNERS, THEMES, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { NavBar } from '@winterop-com/sokkel-ui/NavBar'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { SchemeToggle } from '@winterop-com/sokkel-ui/SchemeToggle'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'
import { fromGlobals } from './themes'

/**
 * The look kept and worn by the library's hooks: `useScheme` for light, dark or the system's, and
 * `useAppearance` for the whole look a `ThemePicker` sets. Each keeps its choice in `localStorage`
 * and wears it on `<html>`, so a choice here holds after a reload. Each story starts from the
 * toolbar's look, given as the hooks' defaults.
 */
const meta: Meta = { title: 'Themes/Appearance' }
export default meta

function SchemeDemo({ globals }: { globals: Record<string, unknown> }) {
    const fallback = fromGlobals(globals).scheme
    const { scheme, setScheme } = useScheme(fallback)
    return (
        <TooltipProvider>
            <Row gap="sm">
                <Segmented
                    label="Scheme"
                    value={scheme}
                    onChoose={setScheme}
                    options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                    ]}
                />
                <SchemeToggle fallback={fallback} />
            </Row>
        </TooltipProvider>
    )
}

/** `useScheme` behind a three-way choice and `SchemeToggle`, the theme toggle wired to it: both follow the one kept scheme. */
export const Scheme: StoryObj = {
    parameters: { frame: 'padded' },
    render: (_, { globals }) => <SchemeDemo globals={globals} />,
}

function SettingsDemo({ globals }: { globals: Record<string, unknown> }) {
    const defaults = fromGlobals(globals)
    const { settings, setSettings } = useAppearance(defaults)
    return (
        <TooltipProvider>
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <NavBar
                    mark={<TidevannMark />}
                    name="Tidevann"
                    links={[
                        { id: 'overview', label: 'Overview', href: '#' },
                        { id: 'projects', label: 'Projects', href: '#' },
                        { id: 'settings', label: 'Settings', href: '#', active: true },
                    ]}
                    end={
                        <>
                            <SchemeToggle fallback={defaults.scheme} />
                            <PersonAvatar name="ada" image={pictureOf('ada')} size="md" className="ml-1" />
                        </>
                    }
                />
                <main className="min-h-0 flex-1 overflow-y-auto">
                    <Stack gap="xl" className="mx-auto max-w-3xl px-4 py-6">
                        <PageHeader title="Settings" />
                        <Section title="Appearance">
                            <ThemePicker
                                value={settings}
                                onChange={setSettings}
                                themes={THEMES}
                                corners={CORNERS}
                                typefaces={TYPEFACES}
                                system
                                className="max-w-80"
                            />
                        </Section>
                    </Stack>
                </main>
            </Stack>
        </TooltipProvider>
    )
}

/**
 * Tidevann's settings page: `useAppearance` in the app's root, its settings in `ThemePicker` with
 * the system's scheme offered, and `SchemeToggle` in the bar following the same choice.
 */
export const SettingsPage: StoryObj = {
    render: (_, { globals }) => <SettingsDemo globals={globals} />,
}
