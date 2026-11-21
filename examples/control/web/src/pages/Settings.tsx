import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SecretField } from '@winterop-com/sokkel-ui/SecretField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { useThemeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import type { AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { CORNERS, DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Clock, KeyRound, Map as MapIcon, MonitorPlay, Palette, Radio, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { chooseSource, DEFAULT_SETTINGS, setSettings, type Settings as Options } from '../settings'
import { SOURCES, type ControlSource } from '../sources'
import { command } from '../store'
import { CARRIED } from '../themes'
import type { Watch } from '../watch'

const OFFERED = new Set(CARRIED)
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

/** What a section's Reset to defaults puts back. */
const SECTION_KEYS: Record<string, (keyof Options)[]> = {
    sources: ['sources'],
    wall: ['cycle', 'dwell', 'globe'],
    map: ['labels', 'trails'],
    time: ['zone'],
}

/** Whose data a source shows and under which license, with links to both. */
function Credit({ source }: { source: ControlSource }) {
    const credit = source.attribution
    if (credit === undefined) return <>Simulated alone: it reaches no network.</>
    return (
        <>
            Data from{' '}
            <TextLink href={credit.href} external variant="inline">
                {credit.name}
            </TextLink>
            {'. '}
            {credit.licenseHref === undefined ? (
                credit.license
            ) : (
                <TextLink href={credit.licenseHref} external variant="inline">
                    {credit.license}
                </TextLink>
            )}
            {'. '}
            {source.limit}
        </>
    )
}

/** The sign-in the server's checks are made with: typed here, held in memory by the window that reads the sources, and never kept. */
function SignIn({ signedIn }: { signedIn: boolean }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState<string | undefined>('')
    return (
        <Stack gap="sm">
            <TextField id="server-username" label="Username" value={username} onChange={setUsername} autoComplete="off" />
            <SecretField id="server-password" label="Password" value={password} onChange={setPassword} autoComplete="off" />
            <Stack gap="xs" align="start">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={username === '' || password === undefined || password === ''}
                    onClick={() => {
                        command({ do: 'credentials', username, password: password ?? '' })
                        setPassword('')
                    }}
                >
                    Check signed in
                </Button>
                {signedIn && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            command({ do: 'credentials', username: '', password: '' })
                            setUsername('')
                        }}
                    >
                        Forget the sign-in
                    </Button>
                )}
            </Stack>
        </Stack>
    )
}

/** The control site's settings as a dialog: which sources are read and how, the wall, the map, times and the look. */
export function Settings({
    watch,
    appearance,
    section,
    open,
    onClose,
    onReset,
}: {
    watch: Watch
    appearance: AppearanceState
    /** The section shown first, as the account menu's Appearance names; Sources when none. */
    section?: string
    open: boolean
    onClose: () => void
    /** Asks whether to put the demo back as it started. */
    onReset: () => void
}) {
    const { options, state, shared } = watch
    const [active, setActive] = useState(section ?? 'sources')
    const [search, setSearch] = useState('')
    const groups: SettingsGroup[] = [
        {
            id: 'site',
            title: 'Site',
            sections: [
                {
                    id: 'sources',
                    label: 'Sources',
                    icon: Radio,
                    settings: SOURCES.map((source) => {
                        const held = state.sources.find((each) => each.id === source.id)
                        const on = held?.enabled ?? true
                        const live = held?.live ?? true
                        return {
                            id: source.id,
                            title: source.label,
                            description: source.summary,
                            note: on && (live || source.read === undefined) ? <Credit source={source} /> : undefined,
                            keywords: [source.kind, source.attribution?.name ?? 'simulated'],
                            control: (
                                <Segmented
                                    label={source.label}
                                    value={!on ? 'off' : live ? 'live' : 'simulated'}
                                    onValueChange={(next: 'off' | 'live' | 'simulated') =>
                                        chooseSource(source.id, { on: next !== 'off', live: next === 'off' ? live : next === 'live' })
                                    }
                                    options={[
                                        ...(source.read === undefined ? [] : [{ value: 'live' as const, label: 'Live' }]),
                                        { value: 'simulated' as const, label: 'Simulated' },
                                        { value: 'off' as const, label: 'Off' },
                                    ]}
                                />
                            ),
                        }
                    }),
                },
                {
                    id: 'server',
                    label: 'Server sign-in',
                    icon: KeyRound,
                    reset: false,
                    settings: [
                        {
                            id: 'sign-in',
                            title: 'Sign in for the server’s checks',
                            description: shared.signedIn
                                ? 'The checks read the server’s system info and who is signed in. The sign-in is held in memory and is gone when the window that reads the sources closes.'
                                : 'Without one, the checks ask only what the server tells anyone. A sign-in is held in memory alone, never written to this browser, and is sent only through the site’s own server to the demo server.',
                            keywords: ['credentials', 'password', 'username'],
                            control: <SignIn signedIn={shared.signedIn} />,
                            layout: 'below',
                        },
                    ],
                },
                {
                    id: 'wall',
                    label: 'Wall',
                    icon: MonitorPlay,
                    settings: [
                        {
                            id: 'cycle',
                            title: 'Move the camera',
                            description: 'The wall’s map goes from one region of interest to the next by itself.',
                            control: (
                                <Switch
                                    aria-label="Move the camera"
                                    checked={options.cycle}
                                    onCheckedChange={(cycle) => setSettings({ cycle })}
                                />
                            ),
                        },
                        {
                            id: 'dwell',
                            title: 'Stay on a region for',
                            description: 'How long the camera rests before it moves on.',
                            control: (
                                <Segmented
                                    label="Stay on a region for"
                                    value={String(options.dwell)}
                                    onValueChange={(next) => setSettings({ dwell: Number(next) as Options['dwell'] })}
                                    options={[
                                        { value: '15', label: '15 s' },
                                        { value: '30', label: '30 s' },
                                        { value: '60', label: '1 min' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'globe',
                            title: 'Draw the world as a globe',
                            description: 'Off draws the wall’s map flat.',
                            control: (
                                <Switch
                                    aria-label="Draw the world as a globe"
                                    checked={options.globe}
                                    onCheckedChange={(globe) => setSettings({ globe })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'map',
                    label: 'Map',
                    icon: MapIcon,
                    settings: [
                        {
                            id: 'labels',
                            title: 'Names on the map',
                            description: 'Writes each track’s name beside it where there is room.',
                            control: (
                                <Switch
                                    aria-label="Names on the map"
                                    checked={options.labels}
                                    onCheckedChange={(labels) => setSettings({ labels })}
                                />
                            ),
                        },
                        {
                            id: 'trails',
                            title: 'Trails',
                            description: 'Draws where each vessel and aircraft has been.',
                            control: (
                                <Switch
                                    aria-label="Trails"
                                    checked={options.trails}
                                    onCheckedChange={(trails) => setSettings({ trails })}
                                />
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'you',
            title: 'You',
            sections: [
                {
                    id: 'time',
                    label: 'Time',
                    icon: Clock,
                    settings: [
                        {
                            id: 'zone',
                            title: 'Times in',
                            description: 'The zone the clocks, the alerts and the timeline write times in.',
                            control: (
                                <Segmented
                                    label="Times in"
                                    value={options.zone}
                                    onValueChange={(zone: Options['zone']) => setSettings({ zone })}
                                    options={[
                                        { value: 'utc', label: 'UTC' },
                                        { value: 'local', label: 'Local' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: [
                        ...useThemeSettings({
                            value: appearance.settings,
                            onChange: appearance.setSettings,
                            themes: APP_THEMES,
                            corners: CORNERS,
                            system: true,
                        }),
                    ],
                },
            ],
        },
        {
            id: 'demo',
            title: 'Demo',
            sections: [
                {
                    id: 'demo',
                    label: 'Demo',
                    icon: RotateCcw,
                    reset: false,
                    settings: [
                        {
                            id: 'reset-demo',
                            title: 'Reset demo data',
                            description: 'Puts every setting back as the demo started, and loads the page again.',
                            control: (
                                <Button variant="outline" size="sm" onClick={onReset}>
                                    Reset
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
    ]
    return (
        <SettingsDialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onClose()
            }}
            groups={groups}
            active={active}
            onActiveChange={setActive}
            search={search}
            onSearchChange={setSearch}
            onReset={(shown) => {
                const keys = shown === undefined ? [] : (SECTION_KEYS[shown] ?? [])
                setSettings(Object.fromEntries(keys.map((key) => [key, DEFAULT_SETTINGS[key]])) as Partial<Options>)
                if (shown === 'appearance') appearance.setSettings({ ...DEFAULT_APPEARANCE })
            }}
        />
    )
}
