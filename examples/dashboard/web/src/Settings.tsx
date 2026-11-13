import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { CORNERS, DEFAULT_APPEARANCE, THEMES, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { Database, LayoutDashboard, Palette, Radio } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { prefs as prefsStore } from './collections'
import { DEFAULT_PREFS, PACES, type Pace, type Prefs } from './model'
import { CARRIED } from './themes'

/** The person's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({ prefs, frame, onClose }: { prefs: Prefs; frame: Frame; onClose: () => void }) {
    const [active, setActive] = useState('live')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const { settings, setSettings } = frame.appearance
    const set = (patch: Partial<Prefs>) => void prefsStore.update(prefs.id, patch)

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'live',
                    label: 'Live data',
                    icon: Radio,
                    settings: [
                        {
                            id: 'live',
                            title: 'Follow live',
                            description: 'Read the source on every tick. Off, every widget holds still where it is.',
                            control: <Switch aria-label="Follow live" checked={prefs.live} onCheckedChange={(live) => set({ live })} />,
                            layout: 'trailing',
                            keywords: ['pause', 'stream'],
                        },
                        {
                            id: 'pace',
                            title: 'Reading',
                            description: 'How often the source is read while following live.',
                            control: (
                                <Segmented<Pace>
                                    label="Reading"
                                    value={prefs.pace}
                                    onValueChange={(pace) => set({ pace })}
                                    options={(Object.keys(PACES) as Pace[]).map((pace) => ({ value: pace, label: PACES[pace].label }))}
                                />
                            ),
                            keywords: ['interval', 'refresh', 'tick'],
                        },
                        {
                            id: 'clock',
                            title: 'Clock',
                            description: 'How the times on the charts, the runs and the schedules are written.',
                            control: (
                                <Segmented<Prefs['clock']>
                                    label="Clock"
                                    value={prefs.clock}
                                    onValueChange={(clock) => set({ clock })}
                                    options={[
                                        { value: '24h', label: '24-hour' },
                                        { value: '12h', label: '12-hour' },
                                    ]}
                                />
                            ),
                            keywords: ['time', 'am', 'pm'],
                        },
                    ],
                },
                {
                    id: 'editing',
                    label: 'Editing',
                    icon: LayoutDashboard,
                    settings: [
                        {
                            id: 'confirm-cancel',
                            title: 'Ask before throwing edits away',
                            description: 'Cancel asks first when a dashboard has edits that are not kept yet.',
                            control: (
                                <Switch
                                    aria-label="Ask before throwing edits away"
                                    checked={prefs.confirmCancel}
                                    onCheckedChange={(confirmCancel) => set({ confirmCancel })}
                                />
                            ),
                            layout: 'trailing',
                            keywords: ['cancel', 'confirm', 'edit'],
                        },
                    ],
                },
                {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: themeSettings({
                        value: settings,
                        onChange: setSettings,
                        themes: THEMES.filter((theme) => CARRIED.includes(theme.value)),
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
                    reset: false,
                    label: 'Data',
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description:
                                'Puts the dashboards, their widgets, the to-do lists and these preferences back as they first were.',
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
                    if (section === 'live') set({ live: DEFAULT_PREFS.live, pace: DEFAULT_PREFS.pace, clock: DEFAULT_PREFS.clock })
                    if (section === 'editing') set({ confirmCancel: DEFAULT_PREFS.confirmCancel })
                    if (section === 'appearance') setSettings({ ...DEFAULT_APPEARANCE })
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                question="Reset the demo data?"
                detail="Every dashboard, widget and to-do goes back to how the demo started. This cannot be undone."
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
