import { Callout } from '@winterop-com/sokkel-ui/Callout'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { CORNERS, DEFAULT_APPEARANCE, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { desktopShell } from '@winterop-com/sokkel-ui/lib/desktop'
import { Link } from '@winterop-com/sokkel-ui/Link'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useThemeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { BellRing, Database, Palette, Radar } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import { settingsSection, type Frame } from 'tidevann-shared/frame'
import { prefs as prefsStore } from './collections'
import { DEFAULT_PREFS, HOMES, INTERVALS, type Prefs, type SourceKind } from './model'
import { canReadMachine, forgetKnownAll, type WatchState } from './watch'

/** The preferences each section holds, so Reset to defaults puts back those and leaves the rest. */
const HELD: Record<string, (keyof Omit<Prefs, 'id'>)[]> = {
    watch: ['live', 'home', 'colorBy', 'groupBy', 'span'],
    alerts: ['alertCountry', 'alertProcess', 'alertSpike', 'spikeIn', 'spikeOut'],
    data: ['source', 'interval'],
}

/** A choice from a short list, named for the setting it sets. */
function Choose<T extends string>({
    label,
    value,
    items,
    onChange,
}: {
    label: string
    value: T
    items: readonly { value: T; label: string }[]
    onChange: (value: T) => void
}) {
    return (
        <Select items={items} value={value} onValueChange={(next) => onChange(String(next) as T)}>
            <SelectTrigger aria-label={label} widest={items.map((item) => item.label)}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

/** What the lookup in use is, said for the Data section. */
function lookupText(state: WatchState): { title: string; detail: string } {
    const geo = state.geo
    if (geo?.kind === 'geolite' && geo.status !== undefined) {
        const reader = geo.via === 'desktop' ? 'the desktop shell' : 'the server this page came from'
        return {
            title: `GeoLite2 City, built ${geo.status.built ?? 'on an unknown date'}`,
            detail: `${geo.status.file} is read by ${reader}. The simulated machine draws public addresses and GeoLite2 places them.`,
        }
    }
    const why =
        geo?.status?.problem !== undefined
            ? `The GeoLite2 file could not be read: ${geo.status.problem}`
            : geo?.status !== undefined
              ? 'No GeoLite2 file was found. Run make geolite in examples/network to download it.'
              : 'GeoLite2 is read only by the dev and preview servers and the Electron shell, and none is serving this page.'
    return {
        title: 'Built-in lookup',
        detail: `${why} The simulated machine reaches documentation addresses (203.0.113.0/24, 198.51.100.0/24, 192.0.2.0/24, 2001:db8::/32), each placed in a plain city.`,
    }
}

/** The person's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({ prefs, state, frame, onClose }: { prefs: Prefs; state: WatchState; frame: Frame; onClose: () => void }) {
    const [active, setActive] = useState(() => settingsSection(frame.route) ?? 'watch')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [forgetting, setForgetting] = useState(false)
    const { settings, setSettings } = frame.appearance
    const set = (patch: Partial<Prefs>) => void prefsStore.update(prefs.id, patch)
    const machine = canReadMachine()
    const shell = desktopShell()
    const lookup = lookupText(state)
    const limit = (key: 'spikeIn' | 'spikeOut', label: string) => (
        <NumberField
            id={`limit-${key}`}
            label={label}
            bare
            value={prefs[key]}
            min={0.1}
            max={1000}
            step={0.5}
            suffix="MB/s"
            disabled={!prefs.alertSpike}
            onValueChange={(value) => {
                if (value !== null && value >= 0.1 && value <= 1000) set({ [key]: value })
            }}
        />
    )

    const sourceNote =
        shell === 'tauri'
            ? 'This Tauri shell shows the simulated machine only; the Electron shell can read this machine.'
            : machine
              ? 'This machine is read with lsof (or netstat where there is no lsof) in the shell, which lists sockets but counts no bytes, so rates read as unavailable.'
              : 'Reading this machine needs the Electron shell; in a browser the simulated machine is all there is.'

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'watch',
                    label: 'Watch',
                    icon: Radar,
                    settings: [
                        {
                            id: 'live',
                            title: 'Follow live',
                            description: 'Read the source as it changes. Off, every page holds still where it is.',
                            control: <Switch aria-label="Follow live" checked={prefs.live} onCheckedChange={(live) => set({ live })} />,
                            layout: 'trailing',
                            keywords: ['pause', 'stream'],
                        },
                        {
                            id: 'home',
                            title: 'Home',
                            description: 'Where this machine stands on the map, and where every link starts.',
                            control: (
                                <Choose
                                    label="Home"
                                    value={prefs.home}
                                    items={HOMES.map((home) => ({ value: home.value, label: home.label }))}
                                    onChange={(home) => set({ home })}
                                />
                            ),
                            keywords: ['city', 'location', 'map'],
                        },
                        {
                            id: 'color-by',
                            title: 'Color the map by',
                            description:
                                "A host and its link take the state of the host's connections, or the process that moves the most with it.",
                            control: (
                                <Segmented<Prefs['colorBy']>
                                    label="Color the map by"
                                    value={prefs.colorBy}
                                    onValueChange={(colorBy) => set({ colorBy })}
                                    options={[
                                        { value: 'state', label: 'State' },
                                        { value: 'process', label: 'Process' },
                                    ]}
                                />
                            ),
                            keywords: ['tone', 'legend'],
                        },
                    ],
                },
                {
                    id: 'alerts',
                    label: 'Alerts',
                    icon: BellRing,
                    settings: [
                        {
                            id: 'alert-country',
                            title: 'New country',
                            description: 'Raise an alert the first time a connection reaches a country.',
                            control: (
                                <Switch
                                    aria-label="New country"
                                    checked={prefs.alertCountry}
                                    onCheckedChange={(alertCountry) => set({ alertCountry })}
                                />
                            ),
                            layout: 'trailing',
                        },
                        {
                            id: 'alert-process',
                            title: 'New process',
                            description: 'Raise an alert the first time a process talks out.',
                            control: (
                                <Switch
                                    aria-label="New process"
                                    checked={prefs.alertProcess}
                                    onCheckedChange={(alertProcess) => set({ alertProcess })}
                                />
                            ),
                            layout: 'trailing',
                        },
                        {
                            id: 'alert-spike',
                            title: 'Rate spike',
                            description:
                                'Raise an alert when one process moves bytes faster than a limit, at most once in two minutes each way.',
                            note: state.metered ? undefined : 'This machine is read without byte counts, so no spike can be seen.',
                            control: (
                                <Switch
                                    aria-label="Rate spike"
                                    checked={prefs.alertSpike}
                                    onCheckedChange={(alertSpike) => set({ alertSpike })}
                                />
                            ),
                            layout: 'trailing',
                            keywords: ['threshold', 'bandwidth'],
                        },
                        {
                            id: 'spike-in',
                            title: 'Receiving limit',
                            description: 'A process receiving faster than this, over ten seconds, raises a spike.',
                            control: limit('spikeIn', 'Receiving limit'),
                            keywords: ['threshold', 'download'],
                        },
                        {
                            id: 'spike-out',
                            title: 'Sending limit',
                            description: 'A process sending faster than this, over ten seconds, raises a spike.',
                            control: limit('spikeOut', 'Sending limit'),
                            keywords: ['threshold', 'upload'],
                        },
                        {
                            id: 'forget',
                            title: 'Forget what is known',
                            description:
                                'The processes and countries seen so far are forgotten, so each raises an alert again the next time.',
                            control: (
                                <Button variant="outline" size="sm" onClick={() => setForgetting(true)}>
                                    Forget
                                </Button>
                            ),
                            layout: 'trailing',
                        },
                    ],
                },
                {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: useThemeSettings({
                        value: settings,
                        onChange: setSettings,
                        themes: frame.themes,
                        corners: CORNERS,
                        typefaces: TYPEFACES,
                        system: true,
                    }),
                },
            ],
        },
        {
            id: 'demo',
            title: 'This demo',
            sections: [
                {
                    id: 'data',
                    label: 'Data',
                    icon: Database,
                    settings: [
                        {
                            id: 'source',
                            title: 'Source',
                            description: 'The simulated machine, or the connections of the machine this app runs on.',
                            note: sourceNote,
                            control: (
                                <Segmented<SourceKind>
                                    label="Source"
                                    value={prefs.source === 'machine' && machine ? 'machine' : 'simulated'}
                                    disabled={!machine}
                                    onValueChange={(source) => set({ source })}
                                    options={[
                                        { value: 'simulated', label: 'Simulated' },
                                        { value: 'machine', label: 'This machine' },
                                    ]}
                                />
                            ),
                            keywords: ['lsof', 'netstat', 'real', 'simulation'],
                        },
                        ...(machine
                            ? [
                                  {
                                      id: 'interval',
                                      title: 'Reading',
                                      description: 'How often this machine is read while it is the source.',
                                      control: (
                                          <Segmented<string>
                                              label="Reading"
                                              value={String(prefs.interval)}
                                              disabled={prefs.source !== 'machine'}
                                              onValueChange={(interval) => set({ interval: Number(interval) })}
                                              options={INTERVALS.map((each) => ({ value: String(each.value), label: each.label }))}
                                          />
                                      ),
                                      keywords: ['interval', 'poll'],
                                  },
                              ]
                            : []),
                        {
                            id: 'lookup',
                            title: 'Locations',
                            description: lookup.title,
                            note: lookup.detail,
                            control:
                                state.geo?.kind === 'geolite' ? (
                                    <StatusChip status="succeeded" label="GeoLite2" />
                                ) : (
                                    <StatusChip status="skipped" label="Built-in" />
                                ),
                            layout: 'trailing',
                            keywords: ['geolite', 'geolocation', 'maxmind', 'mmdb'],
                        },
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: 'Puts the alerts, what is known and these preferences back as they first were.',
                            control: (
                                <Button variant="outline" size="sm" onClick={() => setResetting(true)}>
                                    Reset
                                </Button>
                            ),
                            layout: 'trailing',
                        },
                    ],
                    foot: (
                        <Callout tone="neutral" title="About the locations">
                            Every location is approximate, to the city at best, and a host in the cloud shows where its data center is
                            rather than who runs it. This product includes GeoLite2 data created by MaxMind, available from{' '}
                            <Link href="https://www.maxmind.com" target="_blank" rel="noreferrer">
                                https://www.maxmind.com
                            </Link>
                            .
                        </Callout>
                    ),
                },
            ],
        },
    ]

    return (
        <>
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
                onReset={(section) => {
                    if (section === 'appearance') setSettings({ ...DEFAULT_APPEARANCE })
                    const held = section === undefined ? undefined : HELD[section]
                    if (held !== undefined) set(Object.fromEntries(held.map((key) => [key, DEFAULT_PREFS[key]])))
                }}
            />
            <ConfirmDialog
                open={forgetting}
                onOpenChange={setForgetting}
                question="Forget what is known?"
                detail="Every process and country seen so far raises an alert again the next time it is seen."
                confirm={{
                    label: 'Forget',
                    destructive: true,
                    onConfirm: () => {
                        setForgetting(false)
                        void forgetKnownAll()
                    },
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                question="Reset the demo data?"
                detail="The alerts, what is known and the preferences go back to how the demo started. This cannot be undone."
                confirm={{
                    label: 'Reset',
                    destructive: true,
                    onConfirm: () => {
                        setResetting(false)
                        void resetAll().then(() => {
                            window.location.hash = '/'
                            window.location.reload()
                        })
                    },
                }}
            />
        </>
    )
}
