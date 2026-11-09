import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Bell, Database, Palette, Radio, Settings2 } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { LIVE_LIMIT } from '../backend'
import { DEFAULT_PREFS, RATES, type Currency, type Pace, type Prefs } from '../model'
import { useLoaded } from '../state'
import { PRESETS } from '../view'

/** What Reset to defaults puts back; the feed's read mark stays. */
const HELD: (keyof Omit<Prefs, 'id' | 'feedSeen'>)[] = ['pace', 'currency', 'range', 'compare', 'bigOrder', 'notifyChurn', 'workspace']

/** A switch named for the setting it turns. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
    return <Switch aria-label={label} checked={on} onCheckedChange={onChange} />
}

/** The person's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const { prefs, setPrefs, world } = useLoaded()
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('general')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'general',
                    label: 'General',
                    icon: Settings2,
                    settings: [
                        {
                            id: 'workspace',
                            title: 'Workspace name',
                            description: 'What the rail and the overview call the business.',
                            control: (
                                <InlineEdit
                                    label="Workspace name"
                                    value={prefs.workspace}
                                    validate={(value) => (value.trim() === '' ? 'A workspace needs a name.' : null)}
                                    onSave={(workspace) => setPrefs({ workspace: workspace.trim() }).then(() => undefined)}
                                />
                            ),
                        },
                        {
                            id: 'currency',
                            title: 'Currency',
                            description: 'Every figure of money in this currency, at a fixed rate from US dollars.',
                            keywords: ['money', 'dollar', 'euro', 'krone'],
                            control: (
                                <Segmented
                                    label="Currency"
                                    value={prefs.currency}
                                    onValueChange={(currency: Currency) => void setPrefs({ currency })}
                                    options={(Object.keys(RATES) as Currency[]).map((value) => ({ value, label: value }))}
                                />
                            ),
                        },
                        {
                            id: 'range',
                            title: 'Opening range',
                            description: 'The range a page opens on when its address names none.',
                            control: (
                                <NativeSelect
                                    aria-label="Opening range"
                                    value={prefs.range}
                                    onChange={(event) => void setPrefs({ range: event.target.value })}
                                >
                                    {PRESETS.map((preset) => (
                                        <NativeSelectOption key={preset.id} value={preset.id}>
                                            {preset.label}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            ),
                        },
                        {
                            id: 'compare',
                            title: 'Compare with the period before',
                            description: 'Changes on the tiles and dashed lines for the period before, unless the address says otherwise.',
                            control: (
                                <Toggle
                                    label="Compare with the period before"
                                    on={prefs.compare}
                                    onChange={(compare) => void setPrefs({ compare })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'live',
                    label: 'Live data',
                    icon: Radio,
                    settings: [
                        {
                            id: 'pace',
                            title: 'Live stream',
                            description: 'How often a sign-up, an upgrade, an order or a team leaving arrives while the app is open.',
                            note: `${world.liveCount.toLocaleString('en-US')} of ${LIVE_LIMIT.toLocaleString('en-US')} live changes held; at the limit the stream stops until the demo data are reset.`,
                            keywords: ['stream', 'pause', 'speed', 'events'],
                            layout: 'below',
                            control: (
                                <Segmented
                                    label="Live stream"
                                    value={prefs.pace}
                                    onValueChange={(pace: Pace) => void setPrefs({ pace })}
                                    options={[
                                        { value: 'fast', label: 'Every second or two' },
                                        { value: 'slow', label: 'Every few seconds' },
                                        { value: 'off', label: 'Paused' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'notifications',
                    label: 'Notifications',
                    icon: Bell,
                    settings: [
                        {
                            id: 'big-orders',
                            title: 'Tell me about big orders',
                            description: 'A note in the corner for each upgrade or order that bills at least this much at once.',
                            control: (
                                <Segmented
                                    label="Tell me about big orders"
                                    value={String(prefs.bigOrder)}
                                    onValueChange={(value) => void setPrefs({ bigOrder: Number(value) })}
                                    options={[
                                        { value: '0', label: 'Never' },
                                        { value: '100', label: '$100' },
                                        { value: '500', label: '$500' },
                                        { value: '1000', label: '$1,000' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'churn',
                            title: 'Tell me when a paying team leaves',
                            description: 'A note in the corner naming the team and what it paid.',
                            keywords: ['churn', 'cancel', 'lost'],
                            control: (
                                <Toggle
                                    label="Tell me when a paying team leaves"
                                    on={prefs.notifyChurn}
                                    onChange={(notifyChurn) => void setPrefs({ notifyChurn })}
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
                        {
                            id: 'look',
                            title: 'Theme',
                            description: 'The theme, the scheme and the density, kept in this browser.',
                            layout: 'below',
                            keywords: ['dark', 'light', 'scheme', 'density', 'compact'],
                            control: <ThemePicker value={look} onChange={setLook} themes={THEMES} system />,
                        },
                    ],
                },
            ],
        },
        {
            id: 'workspace',
            title: 'Workspace',
            sections: [
                {
                    id: 'demo',
                    label: 'Demo data',
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description:
                                'Takes away every live change, saved view, funnel, report and goal made since, and these settings, as the demo started.',
                            control: (
                                <Button size="sm" variant="outline" onClick={() => setResetting(true)}>
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
                footer="Saved as each is changed"
                resetScope="all"
                onReset={() => {
                    setLook({ ...DEFAULT_APPEARANCE })
                    void setPrefs(Object.fromEntries(HELD.map((key) => [key, DEFAULT_PREFS[key]])))
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={(next) => !busy && setResetting(next)}
                question="Reset the demo data?"
                detail="Everything changed since the demo started is gone, and the page loads again."
                confirm={{
                    label: 'Reset',
                    destructive: true,
                    busy,
                    busyLabel: 'Resetting',
                    onConfirm: () => {
                        setBusy(true)
                        void resetAll().then(() => window.location.reload())
                    },
                }}
            />
        </>
    )
}
