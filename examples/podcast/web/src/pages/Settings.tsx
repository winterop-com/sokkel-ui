import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Database, Download, Palette, PlayCircle } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { DEFAULT_PREFS } from '../backend'
import { RATES } from '../Player'
import { usePodcasts } from '../state'

const SKIPS = [10, 15, 30] as const

/** A switch named for the setting it turns. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
    return <Switch aria-label={label} checked={on} onCheckedChange={onChange} />
}

/** The listener's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function SettingsPage({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const state = usePodcasts()
    const { prefs, setPrefs } = state
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('playback')
    const [search, setSearch] = useState('')
    const [asking, setAsking] = useState<'stats' | 'reset' | null>(null)
    const [busy, setBusy] = useState(false)

    const groups: SettingsGroup[] = [
        {
            id: 'listening',
            title: 'Listening',
            sections: [
                {
                    id: 'playback',
                    label: 'Playback',
                    icon: PlayCircle,
                    settings: [
                        {
                            id: 'speed',
                            title: 'Default speed',
                            description: 'The speed a new episode starts at. The player changes it for the episode playing.',
                            keywords: ['rate', 'faster', 'slower'],
                            control: (
                                <Segmented<string>
                                    size="sm"
                                    label="Default speed"
                                    value={String(prefs.speed)}
                                    onValueChange={(value) => setPrefs({ speed: Number(value) })}
                                    options={RATES.map((rate) => ({
                                        value: String(rate),
                                        label: `${String(rate)}x`,
                                    }))}
                                />
                            ),
                        },
                        {
                            id: 'skip',
                            title: 'Skip back and forward',
                            description: 'How far the skip buttons, the arrow keys and the lock screen move.',
                            keywords: ['seconds', 'jump'],
                            control: (
                                <Segmented<string>
                                    size="sm"
                                    label="Skip back and forward"
                                    value={String(prefs.skip)}
                                    onValueChange={(value) => setPrefs({ skip: Number(value) })}
                                    options={SKIPS.map((seconds) => ({
                                        value: String(seconds),
                                        label: `${String(seconds)} s`,
                                    }))}
                                />
                            ),
                        },
                        {
                            id: 'continue',
                            title: 'Continue with the queue',
                            description: 'When an episode ends, the next in the queue plays.',
                            keywords: ['autoplay', 'next'],
                            control: (
                                <Toggle
                                    label="Continue with the queue"
                                    on={prefs.continueQueue}
                                    onChange={(continueQueue) => setPrefs({ continueQueue })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'episodes',
                    label: 'New episodes',
                    icon: Download,
                    settings: [
                        {
                            id: 'inbox',
                            title: 'Put new episodes in New',
                            description: 'Episodes of the shows you follow wait in New until you play or archive them.',
                            keywords: ['inbox'],
                            control: <Toggle label="Put new episodes in New" on={prefs.inbox} onChange={(inbox) => setPrefs({ inbox })} />,
                        },
                        {
                            id: 'auto-download',
                            title: 'Download new episodes',
                            description: 'New episodes of the shows you follow download as they come out.',
                            keywords: ['offline', 'automatic'],
                            control: (
                                <Toggle
                                    label="Download new episodes"
                                    on={prefs.autoDownload}
                                    onChange={(autoDownload) => setPrefs({ autoDownload })}
                                />
                            ),
                        },
                        {
                            id: 'archive-played',
                            title: 'Archive once played',
                            description: 'An episode leaves New when it has played to the end or is marked played.',
                            keywords: ['inbox', 'played'],
                            control: (
                                <Toggle
                                    label="Archive once played"
                                    on={prefs.archivePlayed}
                                    onChange={(archivePlayed) => setPrefs({ archivePlayed })}
                                />
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'app',
            title: 'App',
            sections: [
                {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: [
                        ...themeSettings({
                            value: look,
                            onChange: setLook,
                            themes: THEMES,
                            system: true,
                        }),
                    ],
                },
                {
                    id: 'data',
                    reset: false,
                    label: 'Data',
                    icon: Database,
                    settings: [
                        {
                            id: 'stats',
                            title: 'Clear the stats',
                            description: 'Forgets the time listened and the episodes finished.',
                            keywords: ['history', 'listened'],
                            control: (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={state.listens.length === 0}
                                    onClick={() => setAsking('stats')}
                                >
                                    Clear
                                </Button>
                            ),
                        },
                        {
                            id: 'reset',
                            title: 'Reset the demo data',
                            description: 'Puts back the shows, episodes, queue and settings as they started, and loads the page again.',
                            keywords: ['seed', 'start over'],
                            control: (
                                <Button size="sm" variant="outline" onClick={() => setAsking('reset')}>
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
                    if (section === 'playback')
                        setPrefs({
                            speed: DEFAULT_PREFS.speed,
                            skip: DEFAULT_PREFS.skip,
                            continueQueue: DEFAULT_PREFS.continueQueue,
                        })
                    if (section === 'episodes')
                        setPrefs({
                            inbox: DEFAULT_PREFS.inbox,
                            autoDownload: DEFAULT_PREFS.autoDownload,
                            archivePlayed: DEFAULT_PREFS.archivePlayed,
                        })
                }}
            />
            <ConfirmDialog
                open={asking === 'stats'}
                onOpenChange={(open) => !open && setAsking(null)}
                question="Clear the stats?"
                detail="The time listened and the episodes finished are forgotten. Where you are in each episode is kept."
                confirm={{
                    label: 'Clear',
                    destructive: true,
                    busy,
                    busyLabel: 'Clearing',
                    onConfirm: () => {
                        setBusy(true)
                        void state.clearStats().then(() => {
                            setBusy(false)
                            setAsking(null)
                            toast.add({ title: 'Stats cleared' })
                        })
                    },
                }}
            />
            <ConfirmDialog
                open={asking === 'reset'}
                onOpenChange={(open) => !busy && !open && setAsking(null)}
                question="Reset the demo data?"
                detail="Shows followed, places in episodes, the queue, downloads, stats and settings go back to how they started, and the page loads again."
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
