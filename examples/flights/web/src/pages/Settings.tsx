import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { useThemeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import type { AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { CORNERS, DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Map as MapIcon, Palette, Radio, RotateCcw, Ruler } from 'lucide-react'
import { useState } from 'react'

import { ADSB_LOL, LIVE_UNAVAILABLE, liveAvailable, ODBL } from '../live'
import { DEFAULT_SETTINGS, setSettings, type Settings as Options } from '../settings'
import { CARRIED } from '../themes'

const OFFERED = new Set(CARRIED)
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

/** What a section's Reset to defaults puts back. */
const SECTION_KEYS: Record<string, (keyof Options)[]> = {
    source: ['source', 'interval', 'running'],
    map: ['colorBy', 'trail', 'labels'],
    units: ['units', 'coordinates', 'zone'],
}

/** The words adsb.lol's data is shown under, with links to it and to its license. */
function Attribution() {
    return (
        <>
            Aircraft data from{' '}
            <TextLink href={ADSB_LOL} external variant="inline">
                adsb.lol
            </TextLink>
            , under the{' '}
            <TextLink href={ODBL} external variant="inline">
                Open Database License
            </TextLink>
            .
        </>
    )
}

/** The watch's settings as a dialog: where the aircraft come from, how the map paints them, the units, and the look. */
export function Settings({
    options,
    remaining,
    appearance,
    section,
    open,
    onClose,
    onReset,
}: {
    options: Options
    /** How many requests the live feed's limit has left today, as its last answer said. */
    remaining: number | undefined
    appearance: AppearanceState
    /** The section shown first, as the account menu's Appearance names; Source when none. */
    section?: string
    open: boolean
    onClose: () => void
    /** Asks whether to put the demo back as it started. */
    onReset: () => void
}) {
    const [active, setActive] = useState(section ?? 'source')
    const [search, setSearch] = useState('')
    const canLive = liveAvailable()
    const live = options.source === 'live'

    const groups: SettingsGroup[] = [
        {
            id: 'watch',
            title: 'Watch',
            sections: [
                {
                    id: 'source',
                    label: 'Source',
                    icon: Radio,
                    settings: [
                        {
                            id: 'source',
                            title: 'Aircraft from',
                            description: live
                                ? 'The aircraft in the map’s area, read from adsb.lol’s public API.'
                                : 'The simulation: Tidevann flights between the cities of the region, the same every day. Live reads the aircraft in the map’s area from adsb.lol’s public API.',
                            note: canLive ? live ? <Attribution /> : undefined : LIVE_UNAVAILABLE,
                            keywords: ['live', 'simulated', 'feed', 'adsb', 'api'],
                            control: (
                                <Segmented
                                    label="Aircraft from"
                                    value={options.source}
                                    onValueChange={(source: Options['source']) => setSettings({ source })}
                                    options={[
                                        { value: 'simulated', label: 'Simulated' },
                                        {
                                            value: 'live',
                                            label: 'Live',
                                            disabled: !canLive,
                                            hint: canLive ? undefined : 'Needs the Electron app',
                                        },
                                    ]}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'interval',
                            title: 'Read live every',
                            description:
                                remaining === undefined
                                    ? 'How often the live feed is read. The API keeps each user to a few hundred reads a day.'
                                    : `How often the live feed is read. The API keeps each user to a few hundred reads a day; ${String(remaining)} are left today.`,
                            control: (
                                <Segmented
                                    label="Read live every"
                                    value={String(options.interval)}
                                    onValueChange={(next) => setSettings({ interval: Number(next) as Options['interval'] })}
                                    options={[
                                        { value: '15', label: '15 s', disabled: !canLive },
                                        { value: '30', label: '30 s', disabled: !canLive },
                                        { value: '60', label: '1 min', disabled: !canLive },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'running',
                            title: 'Keep reading',
                            description: 'Off holds every aircraft where it is until it is turned on again.',
                            keywords: ['pause', 'resume'],
                            control: (
                                <Switch
                                    aria-label="Keep reading"
                                    checked={options.running}
                                    onCheckedChange={(running) => setSettings({ running })}
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
                            id: 'color',
                            title: 'Color aircraft by',
                            description: 'Their altitude band, or whose they are: Tidevann’s own, others, or no callsign.',
                            control: (
                                <Segmented
                                    label="Color aircraft by"
                                    value={options.colorBy}
                                    onValueChange={(colorBy: Options['colorBy']) => setSettings({ colorBy })}
                                    options={[
                                        { value: 'altitude', label: 'Altitude' },
                                        { value: 'affiliation', label: 'Affiliation' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'trail',
                            title: 'Trails',
                            description: 'How far back each aircraft’s trail reaches.',
                            control: (
                                <Segmented
                                    label="Trails"
                                    value={String(options.trail)}
                                    onValueChange={(next) => setSettings({ trail: Number(next) as Options['trail'] })}
                                    options={[
                                        { value: '0', label: 'Off' },
                                        { value: '2', label: '2 min' },
                                        { value: '5', label: '5 min' },
                                        { value: '10', label: '10 min' },
                                    ]}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'labels',
                            title: 'Callsigns on the map',
                            description: 'Writes each aircraft’s callsign beside it where there is room.',
                            control: (
                                <Switch
                                    aria-label="Callsigns on the map"
                                    checked={options.labels}
                                    onCheckedChange={(labels) => setSettings({ labels })}
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
                    id: 'units',
                    label: 'Units',
                    icon: Ruler,
                    settings: [
                        {
                            id: 'units',
                            title: 'Units',
                            description: 'Altitudes, speeds and distances, the ruler and the scale included.',
                            control: (
                                <Segmented
                                    label="Units"
                                    value={options.units}
                                    onValueChange={(units: Options['units']) => setSettings({ units })}
                                    options={[
                                        { value: 'aviation', label: 'ft, kn, NM' },
                                        { value: 'metric', label: 'm, km/h, km' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'coordinates',
                            title: 'Coordinates',
                            description: 'How positions are written.',
                            control: (
                                <Segmented
                                    label="Coordinates"
                                    value={options.coordinates}
                                    onValueChange={(coordinates: Options['coordinates']) => setSettings({ coordinates })}
                                    options={[
                                        { value: 'decimal', label: 'Decimal' },
                                        { value: 'dms', label: 'Degrees, minutes' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'zone',
                            title: 'Times in',
                            description: 'The zone the foot strip and the history write times in.',
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
