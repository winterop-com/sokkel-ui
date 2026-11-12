import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Bell, CalendarClock, Database, Palette, ScrollText, Settings2, UserRound } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { DEFAULT_PREFS, type Prefs } from '../model'
import { useConsole } from '../state'

/** The preferences each section holds, which its Reset to defaults puts back. */
const HELD: Record<string, (keyof Omit<Prefs, 'id' | 'user'>)[]> = {
    general: ['openRuns', 'times', 'confirmCancel'],
    notifications: ['notifyFailures', 'notifyMine'],
    logs: ['followLog', 'wrapLog'],
    scheduler: ['scheduler'],
}

/** A switch named for the setting it turns. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
    return <Switch aria-label={label} checked={on} onCheckedChange={onChange} />
}

/** The person's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const { prefs, setPrefs, me } = useConsole()
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
                            id: 'open-runs',
                            title: 'Open a run',
                            description: 'Pressing a run in a list shows it beside the list, or on a page of its own.',
                            control: (
                                <Segmented
                                    label="Open a run"
                                    value={prefs.openRuns}
                                    onValueChange={(openRuns) => void setPrefs({ openRuns })}
                                    options={[
                                        { value: 'panel', label: 'Beside' },
                                        { value: 'page', label: 'On a page' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'times',
                            title: 'Times',
                            description: 'When runs started: how long ago, or the time on the UTC clock.',
                            control: (
                                <Segmented
                                    label="Times"
                                    value={prefs.times}
                                    onValueChange={(times) => void setPrefs({ times })}
                                    options={[
                                        { value: 'relative', label: 'How long ago' },
                                        { value: 'clock', label: 'Clock' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'confirm-cancel',
                            title: 'Confirm before cancelling a run',
                            description: 'Ask once more before a run going is stopped.',
                            control: (
                                <Toggle
                                    label="Confirm before cancelling a run"
                                    on={prefs.confirmCancel}
                                    onChange={(confirmCancel) => void setPrefs({ confirmCancel })}
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
                            id: 'notify-failures',
                            title: 'Tell me when any run fails',
                            description: 'A note in the corner names the job and what its step said.',
                            control: (
                                <Toggle
                                    label="Tell me when any run fails"
                                    on={prefs.notifyFailures}
                                    onChange={(notifyFailures) => void setPrefs({ notifyFailures })}
                                />
                            ),
                        },
                        {
                            id: 'notify-mine',
                            title: 'Tell me when my runs finish',
                            description: 'A note when a run you started succeeds or fails.',
                            control: (
                                <Toggle
                                    label="Tell me when my runs finish"
                                    on={prefs.notifyMine}
                                    onChange={(notifyMine) => void setPrefs({ notifyMine })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'logs',
                    label: 'Logs',
                    icon: ScrollText,
                    settings: [
                        {
                            id: 'follow-log',
                            title: 'Follow new lines',
                            description: "A run's log keeps its newest line in view until you scroll up.",
                            control: (
                                <Toggle
                                    label="Follow new lines"
                                    on={prefs.followLog}
                                    onChange={(followLog) => void setPrefs({ followLog })}
                                />
                            ),
                        },
                        {
                            id: 'wrap-log',
                            title: 'Wrap long lines',
                            description: 'Long lines wrap onto more lines rather than scroll sideways.',
                            control: (
                                <Toggle label="Wrap long lines" on={prefs.wrapLog} onChange={(wrapLog) => void setPrefs({ wrapLog })} />
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
                            description: 'The theme, the scheme and the density.',
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
                    id: 'scheduler',
                    label: 'Scheduler',
                    icon: CalendarClock,
                    settings: [
                        {
                            id: 'scheduler',
                            title: 'Start runs on their schedules',
                            description: 'Off, no schedule starts a run; runs started by hand still go.',
                            control: (
                                <Toggle
                                    label="Start runs on their schedules"
                                    on={prefs.scheduler}
                                    onChange={(scheduler) => void setPrefs({ scheduler })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'account',
                    label: 'Account',
                    reset: false,
                    icon: UserRound,
                    settings: [
                        {
                            id: 'sign-out',
                            title: `Signed in as ${me}`,
                            description: 'On tidevann.example.org. Signing out goes back to the sign-in page.',
                            control: (
                                <Button size="sm" variant="outline" onClick={() => void setPrefs({ user: null })}>
                                    Sign out
                                </Button>
                            ),
                        },
                    ],
                },
                {
                    id: 'demo',
                    label: 'Demo data',
                    reset: false,
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: 'Puts back the jobs, two days of runs, the views and these settings, as the demo started.',
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
                onReset={(section) => {
                    if (section === 'appearance') setLook({ ...DEFAULT_APPEARANCE })
                    const keys = section === undefined ? [] : (HELD[section] ?? [])
                    if (keys.length > 0) void setPrefs(Object.fromEntries(keys.map((key) => [key, DEFAULT_PREFS[key]])))
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={(next) => !busy && setResetting(next)}
                question="Reset the demo data?"
                detail="Runs, jobs and views made since are gone, and the page loads again."
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
