import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { useThemeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import type { AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { CORNERS, DEFAULT_APPEARANCE, type ThemeOption } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Layers, Palette, Radio, Ruler } from 'lucide-react'
import { useEffect, useState } from 'react'

import { clock } from '../watch'
import { DEFAULT_SETTINGS, setSettings, type Settings as Options } from '../settings'
import { EPOCH } from '../sim/world'
import { NIGHT_THEME } from '../themes'
import { shownAt } from './Watch'

/** What a section's Reset to defaults puts back. */
const SECTION_KEYS: Record<string, (keyof Options)[]> = {
    units: ['unit', 'coordinates', 'format'],
    map: ['trails', 'labels', 'coverage', 'links'],
    feed: ['speed', 'paused', 'seed'],
}

/** Whether the look is the night watch's: darkroom in its dark scheme. */
export const isNight = (appearance: AppearanceState): boolean => appearance.settings.theme === NIGHT_THEME && appearance.resolved === 'dark'

/** Puts the night watch's look on, or takes it off for the base theme as the system has it. */
export function setNight(appearance: AppearanceState, night: boolean): void {
    appearance.setSettings({
        ...appearance.settings,
        theme: night ? NIGHT_THEME : DEFAULT_APPEARANCE.theme,
        scheme: night ? 'dark' : 'system',
    })
}

/** A switch for a setting's row. */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
}

/** The watch's settings as a dialog: its units, what the map draws, the simulated feed and the look. */
export function Settings({
    options,
    appearance,
    themes,
    section,
    onClose,
}: {
    options: Options
    appearance: AppearanceState
    themes: readonly ThemeOption[]
    /** The section shown first, as the account menu's Appearance names; Units when none. */
    section?: string
    onClose: () => void
}) {
    const [active, setActive] = useState(section ?? 'units')
    const [search, setSearch] = useState('')
    const [seed, setSeed] = useState(String(options.seed))
    useEffect(() => setSeed(String(options.seed)), [options.seed])
    const seedValue = Number(seed)
    const seedValid = Number.isInteger(seedValue) && seedValue > 0 && seedValue < 1_000_000

    const groups: SettingsGroup[] = [
        {
            id: 'watch',
            title: 'Watch',
            sections: [
                {
                    id: 'units',
                    label: 'Units',
                    icon: Ruler,
                    settings: [
                        {
                            id: 'unit',
                            title: 'Distances',
                            description: 'On the ruler, the task lines, the rings round harbor and a track’s facts.',
                            keywords: ['km', 'miles', 'nautical'],
                            control: (
                                <Segmented
                                    label="Distances"
                                    value={options.unit}
                                    onValueChange={(unit) => setSettings({ unit })}
                                    options={[
                                        { value: 'km', label: 'Kilometers' },
                                        { value: 'mi', label: 'Miles' },
                                        { value: 'nmi', label: 'Nautical miles' },
                                    ]}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'coordinates',
                            title: 'Positions',
                            description: 'Under the map and in a track’s facts. Go to takes either.',
                            keywords: ['mgrs', 'grid', 'latitude', 'longitude', 'coordinates'],
                            control: (
                                <Segmented
                                    label="Positions"
                                    value={options.coordinates}
                                    onValueChange={(coordinates) => setSettings({ coordinates })}
                                    options={[
                                        { value: 'latlon', label: 'Lat, lon' },
                                        { value: 'mgrs', label: 'MGRS' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'format',
                            title: 'Latitude and longitude',
                            description:
                                options.coordinates === 'mgrs' ? 'Used when positions are written as lat, lon.' : 'How each is written.',
                            control: (
                                <Segmented
                                    label="Latitude and longitude"
                                    value={options.format}
                                    onValueChange={(format) => setSettings({ format })}
                                    options={[
                                        { value: 'decimal', label: 'Decimal' },
                                        { value: 'dms', label: 'Degrees, minutes' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'map',
                    label: 'Map',
                    icon: Layers,
                    settings: [
                        {
                            id: 'trails',
                            title: 'Trails',
                            description: 'Where each track has been these twenty minutes.',
                            control: <Toggle label="Trails" checked={options.trails} onChange={(trails) => setSettings({ trails })} />,
                        },
                        {
                            id: 'labels',
                            title: 'Names',
                            description: 'Each track’s name beside it.',
                            control: <Toggle label="Names" checked={options.labels} onChange={(labels) => setSettings({ labels })} />,
                        },
                        {
                            id: 'coverage',
                            title: 'Radar cover',
                            description: 'What the three radars reach, and rings round harbor.',
                            control: (
                                <Toggle label="Radar cover" checked={options.coverage} onChange={(coverage) => setSettings({ coverage })} />
                            ),
                        },
                        {
                            id: 'links',
                            title: 'Task lines',
                            description: 'A line from each running task’s unit to its target, with how far and which way.',
                            control: <Toggle label="Task lines" checked={options.links} onChange={(links) => setSettings({ links })} />,
                        },
                    ],
                },
            ],
        },
        {
            id: 'demo',
            title: 'Demo',
            sections: [
                {
                    id: 'feed',
                    label: 'Feed',
                    icon: Radio,
                    settings: [
                        {
                            id: 'paused',
                            title: 'Pause the feed',
                            description: 'Holds the clock and every track still.',
                            keywords: ['pause', 'resume', 'live'],
                            control: (
                                <Toggle label="Pause the feed" checked={options.paused} onChange={(paused) => setSettings({ paused })} />
                            ),
                        },
                        {
                            id: 'speed',
                            title: 'Speed',
                            description: 'How much simulated time passes each second.',
                            keywords: ['simulation', 'fast'],
                            control: (
                                <Segmented
                                    label="Speed"
                                    value={String(options.speed)}
                                    onValueChange={(next) => setSettings({ speed: Number(next) as Options['speed'] })}
                                    options={[
                                        { value: '1', label: '1×' },
                                        { value: '10', label: '10×' },
                                        { value: '30', label: '30×' },
                                        { value: '60', label: '60×' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'seed',
                            title: 'Seed',
                            description: 'The same seed brings the same contacts at the same moments. A new one starts the waters again.',
                            keywords: ['random'],
                            control: (
                                <Row gap="xs">
                                    <Input
                                        aria-label="Seed"
                                        inputMode="numeric"
                                        value={seed}
                                        aria-invalid={!seedValid || undefined}
                                        onChange={(event) => setSeed(event.target.value)}
                                        className="w-24"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!seedValid || seedValue === options.seed}
                                        onClick={() => {
                                            setSettings({ seed: seedValue })
                                            shownAt.set(null)
                                        }}
                                    >
                                        Use
                                    </Button>
                                </Row>
                            ),
                        },
                        {
                            id: 'restart',
                            title: 'Start the watch again',
                            description: 'Puts the clock back to 17:00 UTC on the first evening.',
                            control: (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        shownAt.set(null)
                                        clock.set(EPOCH)
                                    }}
                                >
                                    Start again
                                </Button>
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
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: [
                        {
                            id: 'night',
                            title: 'Night watch',
                            description:
                                'Darkroom in its dark scheme: red ink on near black, nothing blue-bright, so eyes stay used to the dark.',
                            keywords: ['darkroom', 'red', 'dark'],
                            control: (
                                <Toggle
                                    label="Night watch"
                                    checked={isNight(appearance)}
                                    onChange={(night) => setNight(appearance, night)}
                                />
                            ),
                        },
                        ...useThemeSettings({
                            value: appearance.settings,
                            onChange: appearance.setSettings,
                            themes,
                            corners: CORNERS,
                            system: true,
                        }),
                    ],
                },
            ],
        },
    ]

    return (
        <SettingsDialog
            open
            onOpenChange={(next) => {
                if (!next) onClose()
            }}
            groups={groups}
            active={active}
            onActiveChange={setActive}
            search={search}
            onSearchChange={setSearch}
            onReset={(chosen) => {
                const keys = chosen === undefined ? [] : (SECTION_KEYS[chosen] ?? [])
                setSettings(Object.fromEntries(keys.map((key) => [key, DEFAULT_SETTINGS[key]])) as Partial<Options>)
                if (chosen === 'appearance') appearance.setSettings({ ...DEFAULT_APPEARANCE })
            }}
        />
    )
}
