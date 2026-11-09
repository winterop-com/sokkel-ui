import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { CORNERS, DEFAULT_APPEARANCE, THEMES, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { Bell, Database, LayoutDashboard, Palette } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { DEFAULT_PREFERENCES, type Preferences, preferences } from './data'
import { SelectInput } from './inputs'
import { INTERVALS, PRESETS, type Zone } from './query'

const KEEPS = [
    { value: String(3600), label: 'An hour' },
    { value: String(24 * 3600), label: 'A day' },
    { value: String(7 * 24 * 3600), label: 'A week' },
]

/** The app's preferences as a dialog: dashboards, alerts, the look and the demo's data. */
export function SettingsPage({ prefs, frame, open, onClose }: { prefs: Preferences; frame: Frame; open: boolean; onClose: () => void }) {
    const [active, setActive] = useState('dashboards')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const { settings, setSettings } = frame.appearance
    const set = (patch: Partial<Preferences>) => void preferences.update(prefs.id, patch)

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'dashboards',
                    label: 'Dashboards',
                    icon: LayoutDashboard,
                    settings: [
                        {
                            id: 'range',
                            title: 'Range',
                            description: 'What a dashboard covers when its link names no range.',
                            control: (
                                <SelectInput
                                    id="setting-range"
                                    label="Range"
                                    value={prefs.range}
                                    onChange={(range) => set({ range })}
                                    options={PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
                                />
                            ),
                            keywords: ['time', 'default'],
                        },
                        {
                            id: 'refresh',
                            title: 'Auto refresh',
                            description: 'How often a dashboard reads the source again when its link says nothing.',
                            control: (
                                <Segmented
                                    label="Auto refresh"
                                    value={String(prefs.refresh)}
                                    onValueChange={(value) => set({ refresh: Number(value) })}
                                    options={INTERVALS.map((seconds) => ({
                                        value: String(seconds),
                                        label: seconds === 0 ? 'Off' : `${String(seconds)}s`,
                                    }))}
                                />
                            ),
                            keywords: ['live', 'interval'],
                        },
                        {
                            id: 'zone',
                            title: 'Time zone',
                            description: 'Where the times on the axes, the logs and the alerts are read.',
                            control: (
                                <Segmented<Zone>
                                    label="Time zone"
                                    value={prefs.zone}
                                    onValueChange={(zone) => set({ zone })}
                                    options={[
                                        { value: 'local', label: 'This browser' },
                                        { value: 'utc', label: 'UTC' },
                                    ]}
                                />
                            ),
                            keywords: ['utc', 'clock'],
                        },
                    ],
                },
                {
                    id: 'alerts',
                    label: 'Alerts',
                    icon: Bell,
                    settings: [
                        {
                            id: 'evaluate',
                            title: 'Evaluate rules',
                            description: 'Read every rule against the source each second. Off, nothing fires and what fires now resolves.',
                            control: (
                                <Switch
                                    aria-label="Evaluate rules"
                                    checked={prefs.evaluate}
                                    onCheckedChange={(evaluate) => set({ evaluate })}
                                />
                            ),
                            layout: 'trailing',
                        },
                        {
                            id: 'notify',
                            title: 'Say when a rule fires',
                            description: 'A note in the corner when a rule fires and when it resolves.',
                            control: (
                                <Switch
                                    aria-label="Say when a rule fires"
                                    checked={prefs.notify}
                                    onCheckedChange={(notify) => set({ notify })}
                                />
                            ),
                            layout: 'trailing',
                            keywords: ['toast', 'notification'],
                        },
                        {
                            id: 'keep',
                            title: 'Keep fired alerts',
                            description: 'Resolved alerts older than this leave the list.',
                            control: (
                                <Segmented
                                    label="Keep fired alerts"
                                    value={String(prefs.keep)}
                                    onValueChange={(value) => set({ keep: Number(value) })}
                                    options={KEEPS}
                                />
                            ),
                            keywords: ['history'],
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
                            title: 'Look',
                            description: 'The theme, light or dark, the density, the corners and the typeface.',
                            control: (
                                <ThemePicker
                                    value={settings}
                                    onChange={setSettings}
                                    themes={THEMES}
                                    corners={CORNERS}
                                    typefaces={TYPEFACES}
                                    system
                                />
                            ),
                            layout: 'below',
                            keywords: ['theme', 'dark', 'light', 'density'],
                        },
                    ],
                },
            ],
        },
        {
            id: 'workspace',
            title: 'This demo',
            sections: [
                {
                    id: 'data',
                    reset: false,
                    label: 'Data',
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: 'Puts the dashboards, the rules, what fired and these preferences back as they first were.',
                            control: (
                                <Button variant="outline" size="sm" onClick={() => setResetting(true)}>
                                    Reset
                                </Button>
                            ),
                            layout: 'trailing',
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
                footer="Kept in this browser as they are changed"
                onReset={(section) => {
                    if (section === 'dashboards')
                        set({ range: DEFAULT_PREFERENCES.range, refresh: DEFAULT_PREFERENCES.refresh, zone: DEFAULT_PREFERENCES.zone })
                    if (section === 'alerts')
                        set({ evaluate: DEFAULT_PREFERENCES.evaluate, notify: DEFAULT_PREFERENCES.notify, keep: DEFAULT_PREFERENCES.keep })
                    if (section === 'appearance') setSettings({ ...DEFAULT_APPEARANCE, scheme: settings.scheme })
                    toast.success('Back to the defaults')
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                question="Reset the demo data?"
                detail="Every dashboard, rule and fired alert goes back to how the demo started. This cannot be undone."
                confirm={{
                    label: 'Reset',
                    destructive: true,
                    onConfirm: () => {
                        setResetting(false)
                        void resetAll().then(() => window.location.reload())
                    },
                }}
            />
        </>
    )
}
