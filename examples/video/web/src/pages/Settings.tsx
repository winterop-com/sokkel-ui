import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import {
    CAPTION_BACKGROUNDS,
    CAPTION_COLORS,
    CAPTION_EDGES,
    CAPTION_SIZES,
    captionSettings,
    type CaptionBackground,
    type CaptionColor,
    type CaptionEdge,
} from '@winterop-com/sokkel-ui/media/captions'
import { formatRate, MEDIA_RATES } from '@winterop-com/sokkel-ui/media/MediaControls'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Captions, Database, HardDrive, History, Palette, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { go } from 'tidevann-shared/router'
import { forgetClips, keptClipsSize, RENDITIONS, useClipCache } from '../clips'
import { DEFAULT_PREFS, downloads, setPrefs, usePrefs, useRows, watched, type Prefs, type Quality } from '../data'
import { bytesOf, plural } from '../format'

const COLOR_NAMES: Record<CaptionColor, string> = {
    white: 'White',
    yellow: 'Yellow',
    green: 'Green',
    cyan: 'Cyan',
    magenta: 'Magenta',
}
const BACKGROUND_NAMES: Record<CaptionBackground, string> = {
    none: 'None',
    translucent: 'Translucent',
    solid: 'Solid',
}
const EDGE_NAMES: Record<CaptionEdge, string> = {
    outline: 'Outline',
    shadow: 'Drop shadow',
    none: 'None',
}

/** The preferences each section holds, which its Reset to defaults puts back. */
const HELD: Record<string, (keyof Omit<Prefs, 'id'>)[]> = {
    playback: ['autoplay', 'theater', 'rate', 'quality', 'stats'],
    captions: ['captions'],
    history: ['history'],
}

/** A switch named for the setting it turns. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
    return <Switch aria-label={label} checked={on} onCheckedChange={onChange} />
}

/** The viewer's settings: playback, captions, history, the look, and what the browser keeps; each kept as it is changed. */
export function Settings({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const prefs = usePrefs()
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('playback')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)
    const made = useClipCache()
    const [kept, setKept] = useState<{ count: number; bytes: number } | undefined>(undefined)
    const history = useRows(watched)
    const offline = useRows(downloads)
    const captions = captionSettings(prefs.captions)
    const setCaptions = (patch: Partial<typeof captions>) => setPrefs({ captions: { ...prefs.captions, ...patch } })

    useEffect(() => {
        void keptClipsSize().then(setKept)
    }, [made.count])

    const groups: SettingsGroup[] = [
        {
            id: 'player',
            title: 'Player',
            sections: [
                {
                    id: 'playback',
                    label: 'Playback',
                    icon: Play,
                    settings: [
                        {
                            id: 'autoplay',
                            title: 'Autoplay',
                            description: 'When a video ends, Up next counts down and plays the next one. Off, it waits for Play now.',
                            keywords: ['next', 'up next', 'countdown'],
                            control: <Toggle label="Autoplay" on={prefs.autoplay} onChange={(autoplay) => setPrefs({ autoplay })} />,
                        },
                        {
                            id: 'theater',
                            title: 'Theater mode',
                            description: 'The player as wide as the page, with what plays next under it.',
                            keywords: ['wide', 'cinema'],
                            control: <Toggle label="Theater mode" on={prefs.theater} onChange={(theater) => setPrefs({ theater })} />,
                        },
                        {
                            id: 'speed',
                            title: 'Speed',
                            description: 'The speed every video starts at. Picking one in the player keeps it here too.',
                            keywords: ['rate', 'faster', 'slower'],
                            control: (
                                <NativeSelect
                                    aria-label="Speed"
                                    value={String(prefs.rate)}
                                    onChange={(event) => setPrefs({ rate: Number(event.target.value) })}
                                >
                                    {MEDIA_RATES.map((rate) => (
                                        <NativeSelectOption key={rate} value={String(rate)}>
                                            {rate === 1 ? 'Normal' : formatRate(rate)}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            ),
                        },
                        {
                            id: 'quality',
                            title: 'Quality',
                            description:
                                'Auto plays 480p where the player is wide and 360p on a phone; a higher quality takes longer to make the first time.',
                            keywords: ['resolution', 'rendition', '720p', '480p'],
                            layout: 'below',
                            control: (
                                <Segmented
                                    label="Quality"
                                    value={prefs.quality}
                                    onValueChange={(quality: Quality) => setPrefs({ quality })}
                                    options={[
                                        { value: 'auto' as Quality, label: 'Auto' },
                                        ...RENDITIONS.map((one) => ({
                                            value: one.id as Quality,
                                            label: one.label,
                                        })),
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'stats',
                            title: 'Stats over the picture',
                            description:
                                'The picture size, bitrate, link speed, buffer and dropped frames while a video plays. The I key turns them on and off.',
                            keywords: ['nerd', 'bitrate', 'debug'],
                            control: <Toggle label="Stats over the picture" on={prefs.stats} onChange={(stats) => setPrefs({ stats })} />,
                        },
                    ],
                },
                {
                    id: 'captions',
                    label: 'Captions',
                    icon: Captions,
                    settings: [
                        {
                            id: 'captions-on',
                            title: 'Show captions',
                            description:
                                'Captions on every video that has them. The C key and the captions menu in the player set the same.',
                            keywords: ['subtitles'],
                            control: (
                                <Toggle
                                    label="Show captions"
                                    on={captions.track !== null}
                                    onChange={(on) => setCaptions({ track: on ? 'en' : null })}
                                />
                            ),
                        },
                        {
                            id: 'caption-size',
                            title: 'Size',
                            layout: 'below',
                            control: (
                                <Segmented
                                    label="Caption size"
                                    value={String(captions.size)}
                                    onValueChange={(size) => setCaptions({ size: Number(size) })}
                                    options={CAPTION_SIZES.map((size) => ({
                                        value: String(size),
                                        label: `${String(Math.round(size * 100))}%`,
                                    }))}
                                />
                            ),
                        },
                        {
                            id: 'caption-color',
                            title: 'Color',
                            control: (
                                <NativeSelect
                                    aria-label="Caption color"
                                    value={captions.color}
                                    onChange={(event) => setCaptions({ color: event.target.value as CaptionColor })}
                                >
                                    {CAPTION_COLORS.map((color) => (
                                        <NativeSelectOption key={color} value={color}>
                                            {COLOR_NAMES[color]}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            ),
                        },
                        {
                            id: 'caption-background',
                            title: 'Background',
                            layout: 'below',
                            control: (
                                <Segmented
                                    label="Caption background"
                                    value={captions.background}
                                    onValueChange={(background: CaptionBackground) => setCaptions({ background })}
                                    options={CAPTION_BACKGROUNDS.map((background) => ({
                                        value: background,
                                        label: BACKGROUND_NAMES[background],
                                    }))}
                                />
                            ),
                        },
                        {
                            id: 'caption-edge',
                            title: 'Edge',
                            layout: 'below',
                            control: (
                                <Segmented
                                    label="Caption edge"
                                    value={captions.edge}
                                    onValueChange={(edge: CaptionEdge) => setCaptions({ edge })}
                                    options={CAPTION_EDGES.map((edge) => ({
                                        value: edge,
                                        label: EDGE_NAMES[edge],
                                    }))}
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
                    id: 'history',
                    label: 'History',
                    icon: History,
                    settings: [
                        {
                            id: 'keep-history',
                            title: 'Keep watch history',
                            description: 'Remembers what you watch and where you stopped, so a video picks up there.',
                            keywords: ['resume', 'pause history'],
                            control: <Toggle label="Keep watch history" on={prefs.history} onChange={(on) => setPrefs({ history: on })} />,
                        },
                        {
                            id: 'clear-history',
                            title: 'Clear watch history',
                            description: `${plural(history.rows.length, 'video')} in your history now.`,
                            control: (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={history.rows.length === 0}
                                    onClick={() => go('/history/clear')}
                                >
                                    Clear
                                </Button>
                            ),
                        },
                    ],
                },
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
            ],
        },
        {
            id: 'device',
            title: 'This device',
            sections: [
                {
                    id: 'storage',
                    label: 'Storage',
                    reset: false,
                    icon: HardDrive,
                    settings: [
                        {
                            id: 'clips',
                            title: 'Made videos',
                            description:
                                'Every video is made in this browser the first time it plays, then kept so it plays at once the next time. Clearing makes each again when next watched; downloads stay.',
                            note:
                                kept === undefined
                                    ? `${plural(made.count, 'video')} made on this visit, ${bytesOf(made.bytes)}`
                                    : `${plural(made.count, 'video')} made on this visit, ${plural(kept.count, 'video')} kept in all, ${bytesOf(kept.bytes)}`,
                            keywords: ['cache', 'space', 'clips'],
                            control: (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        void forgetClips()
                                            .then(() => keptClipsSize().then(setKept))
                                            .then(() => toast.add({ title: 'Made videos cleared' }))
                                    }
                                >
                                    Clear
                                </Button>
                            ),
                        },
                        {
                            id: 'downloads',
                            title: 'Downloads',
                            description: `${plural(offline.rows.length, 'video')}, ${bytesOf(offline.rows.reduce((sum, one) => sum + one.bytes, 0))}, kept to watch without the site.`,
                            control: (
                                <Button size="sm" variant="outline" onClick={() => go('/downloads')}>
                                    Open
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
                            description:
                                'Puts back the channels followed, the history, playlists, likes, comments and these settings as the demo started, and lets the downloads go.',
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
                    if (keys.length > 0) setPrefs(Object.fromEntries(keys.map((key) => [key, DEFAULT_PREFS[key]])))
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
                        void forgetClips({ downloads: true })
                            .then(resetAll)
                            .then(() => window.location.reload())
                    },
                }}
            />
        </>
    )
}
