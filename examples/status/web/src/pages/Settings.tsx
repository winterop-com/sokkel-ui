import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import type { AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { CORNERS, DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Bell, CloudLightning, Globe, Mail, MonitorCog, Palette, Siren, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'
import { notices } from '../notices'
import { SERVICE_IDS, type ServiceId, SITES, type Subscriber, subscribers } from '../data'
import { calmDown, trigger, useLive } from '../live'
import { useRows } from '../rows'
import { DEFAULT_SETTINGS, setSettings, type Settings as Options, type Weather } from '../settings'
import { CARRIED } from '../themes'

const OFFERED = new Set(CARRIED)
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

const SUBSCRIBER_COLUMNS: DataColumn<Subscriber>[] = [
    {
        id: 'email',
        header: 'Email',
        width: 'minmax(12rem,1fr)',
        cell: (one) => one.email,
        sortValue: (one) => one.email,
    },
    {
        id: 'services',
        header: 'Hears about',
        width: 'minmax(8rem,0.8fr)',
        cell: (one) => (one.services.length === 0 ? 'every service' : <TagChips tags={one.services} />),
        stack: 'secondary',
    },
    {
        id: 'at',
        header: 'Since',
        width: '8rem',
        cell: (one) => <RelativeTime date={one.at} />,
        sortValue: (one) => one.at,
        stack: 'secondary',
    },
]

/** A choice from a list, for a setting's row. */
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

const SERVICE_ITEMS = SERVICE_IDS.map((id) => ({ value: id, label: id }))
const SITE_ITEMS = SITES.map((site) => ({ value: site.id, label: site.city }))

/** What a section's Reset to defaults puts back. */
const SECTION_KEYS: Record<string, (keyof Options)[]> = {
    board: ['live', 'interval', 'clock'],
    notices: ['notify'],
    incidents: ['autoIncidents', 'responder'],
    simulation: ['weather'],
    page: ['pageTitle', 'showUptime', 'historyDays'],
}

/** The board's settings as a dialog: how it updates and tells, the simulation, the status page, its subscribers and the look. */
export function Settings({
    options,
    appearance,
    open,
    onClose,
}: {
    options: Options
    appearance: AppearanceState
    open: boolean
    onClose: () => void
}) {
    const rows = useRows()
    const state = useLive()
    const [active, setActive] = useState('board')
    const [search, setSearch] = useState('')
    const [target, setTarget] = useState<ServiceId>('api')
    const [site, setSite] = useState('singapore')
    const [resetting, setResetting] = useState(false)
    const going = state.scenarios.length

    const groups: SettingsGroup[] = [
        {
            id: 'board',
            title: 'Board',
            sections: [
                {
                    id: 'board',
                    label: 'Readings',
                    icon: MonitorCog,
                    settings: [
                        {
                            id: 'live',
                            title: 'Live readings',
                            description: 'Take a reading of every service and site on a timer. Off holds the board still.',
                            keywords: ['pause', 'resume'],
                            control: (
                                <Switch
                                    aria-label="Live readings"
                                    checked={options.live}
                                    onCheckedChange={(live) => setSettings({ live })}
                                />
                            ),
                        },
                        {
                            id: 'interval',
                            title: 'A reading every',
                            description: 'How often the tiles, charts, map and states update.',
                            keywords: ['refresh', 'interval'],
                            control: (
                                <Segmented
                                    label="A reading every"
                                    value={String(options.interval)}
                                    onValueChange={(next) =>
                                        setSettings({
                                            interval: Number(next) as Options['interval'],
                                        })
                                    }
                                    options={[
                                        { value: '1000', label: '1 s' },
                                        { value: '2000', label: '2 s' },
                                        { value: '5000', label: '5 s' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'clock',
                            title: 'Clock',
                            description: 'How times of day are written.',
                            control: (
                                <Segmented
                                    label="Clock"
                                    value={String(options.clock)}
                                    onValueChange={(next) => setSettings({ clock: Number(next) as 12 | 24 })}
                                    options={[
                                        { value: '24', label: '24-hour' },
                                        { value: '12', label: '12-hour' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'notices',
                    label: 'Notices',
                    icon: Bell,
                    settings: [
                        {
                            id: 'notify',
                            title: 'Tell me when',
                            description:
                                'A notice in the corner when a service or a site changes state, and when an incident opens or is resolved.',
                            keywords: ['toast', 'notification'],
                            control: (
                                <Segmented
                                    label="Tell me when"
                                    value={options.notify}
                                    onValueChange={(notify) => setSettings({ notify })}
                                    options={[
                                        { value: 'all', label: 'Anything changes' },
                                        { value: 'outages', label: 'Outages' },
                                        { value: 'off', label: 'Never' },
                                    ]}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'test',
                            title: 'A test notice',
                            description: 'Shows what a notice looks like.',
                            control: (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        notices.add({
                                            title: 'A test notice',
                                            description: 'Notices show here.',
                                            type: 'info',
                                            timeout: 4000,
                                        })
                                    }
                                >
                                    Show one
                                </Button>
                            ),
                        },
                    ],
                },
                {
                    id: 'incidents',
                    label: 'Incidents',
                    icon: Siren,
                    settings: [
                        {
                            id: 'auto',
                            title: 'Open incidents by themselves',
                            description:
                                'When a service or a site goes wrong and no open incident covers it, open one, given to whoever is on call.',
                            control: (
                                <Switch
                                    aria-label="Open incidents by themselves"
                                    checked={options.autoIncidents}
                                    onCheckedChange={(autoIncidents) => setSettings({ autoIncidents })}
                                />
                            ),
                        },
                        {
                            id: 'responder',
                            title: 'On-call responder',
                            description:
                                'Moves an incident the board opened through identified, monitoring and resolved as the service recovers, until a person posts.',
                            control: (
                                <Switch
                                    aria-label="On-call responder"
                                    checked={options.responder}
                                    onCheckedChange={(responder) => setSettings({ responder })}
                                />
                            ),
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
                    id: 'simulation',
                    label: 'Simulation',
                    icon: CloudLightning,
                    settings: [
                        {
                            id: 'weather',
                            title: 'How often things go wrong',
                            description: `${String(going)} ${going === 1 ? 'thing is' : 'things are'} going wrong now.`,
                            control: (
                                <Segmented
                                    label="How often things go wrong"
                                    value={options.weather}
                                    onValueChange={(weather: Weather) => setSettings({ weather })}
                                    options={[
                                        { value: 'calm', label: 'Rarely' },
                                        { value: 'normal', label: 'Now and then' },
                                        { value: 'stormy', label: 'Often' },
                                    ]}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'service',
                            title: 'Trouble on a service',
                            description: 'An error spike or a slow drift, now, on the service chosen.',
                            control: (
                                <Row gap="xs" wrap>
                                    <Choose label="Service" value={target} items={SERVICE_ITEMS} onChange={setTarget} />
                                    <Button variant="outline" size="sm" onClick={() => trigger('spike', target)}>
                                        Error spike
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => trigger('drift', target)}>
                                        Slow drift
                                    </Button>
                                </Row>
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'site',
                            title: 'Trouble in a region',
                            description: 'A site falls behind for a while, then recovers.',
                            control: (
                                <Row gap="xs" wrap>
                                    <Choose label="Site" value={site} items={SITE_ITEMS} onChange={setSite} />
                                    <Button variant="outline" size="sm" onClick={() => trigger('region', site)}>
                                        Start
                                    </Button>
                                </Row>
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'calm',
                            title: 'Calm everything down',
                            description: 'Ends whatever is going wrong now.',
                            control: (
                                <Button variant="outline" size="sm" onClick={calmDown} disabled={going === 0}>
                                    Calm down
                                </Button>
                            ),
                        },
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: 'Puts the incidents, maintenance, deploys, rotation and subscribers back as they were.',
                            control: (
                                <Button variant="outline" size="sm" onClick={() => setResetting(true)}>
                                    Reset
                                </Button>
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'public',
            title: 'Status page',
            sections: [
                {
                    id: 'page',
                    label: 'Status page',
                    icon: Globe,
                    settings: [
                        {
                            id: 'title',
                            title: 'Title',
                            description: 'What the status page is called at its top.',
                            control: (
                                <Input
                                    aria-label="Title"
                                    value={options.pageTitle}
                                    onChange={(event) => setSettings({ pageTitle: event.target.value })}
                                    className="max-w-80"
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'uptime',
                            title: 'Show the last 90 days',
                            description: 'A bar a day under each service.',
                            control: (
                                <Switch
                                    aria-label="Show the last 90 days"
                                    checked={options.showUptime}
                                    onCheckedChange={(showUptime) => setSettings({ showUptime })}
                                />
                            ),
                        },
                        {
                            id: 'history',
                            title: 'Past incidents',
                            description: 'How many days back the page lists what happened.',
                            control: (
                                <Segmented
                                    label="Past incidents"
                                    value={String(options.historyDays)}
                                    onValueChange={(next) => setSettings({ historyDays: Number(next) as 7 | 14 })}
                                    options={[
                                        { value: '7', label: '7 days' },
                                        { value: '14', label: '14 days' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'open',
                            title: 'Open the status page',
                            description: 'What customers see.',
                            control: (
                                <Button variant="outline" size="sm" onClick={() => go('/public')}>
                                    Open
                                </Button>
                            ),
                        },
                    ],
                },
                {
                    id: 'subscribers',
                    label: 'Subscribers',
                    reset: false,
                    icon: Mail,
                    heading: `Subscribers (${String(rows.subscribers?.length ?? 0)})`,
                    settings: [
                        {
                            id: 'list',
                            title: 'Who hears of incidents',
                            description: 'People subscribe on the status page; remove one here.',
                            keywords: ['email', 'unsubscribe'],
                            control: (
                                <DataTable
                                    variant="list"
                                    minWidth="auto"
                                    columns={SUBSCRIBER_COLUMNS}
                                    rows={rows.subscribers ?? []}
                                    rowKey={(one) => one.id}
                                    rowActions={(one) => [
                                        {
                                            id: 'remove',
                                            label: 'Remove',
                                            icon: <Trash2 />,
                                            destructive: true,
                                            onSelect: () => void subscribers.remove(one.id),
                                        },
                                    ]}
                                    empty="Nobody has subscribed yet."
                                />
                            ),
                            layout: 'below',
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
                        ...themeSettings({
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
    ]

    return (
        <>
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
                onReset={(section) => {
                    const keys = section === undefined ? [] : (SECTION_KEYS[section] ?? [])
                    setSettings(Object.fromEntries(keys.map((key) => [key, DEFAULT_SETTINGS[key]])) as Partial<Options>)
                    if (section === 'appearance') appearance.setSettings({ ...DEFAULT_APPEARANCE })
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                question="Reset the demo data?"
                detail="Every incident, window, deploy, shift, handover and subscriber goes back to how the demo started."
                confirm={{
                    label: 'Reset',
                    destructive: true,
                    onConfirm: () => void resetAll().then(() => window.location.reload()),
                }}
            />
        </>
    )
}
