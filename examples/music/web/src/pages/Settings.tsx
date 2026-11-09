import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import type { AppearanceState } from '@winterop-com/sokkel-ui/hooks/use-appearance'
import { CORNERS, DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { MEDIA_RATES } from '@winterop-com/sokkel-ui/media/MediaControls'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { AudioLines, Library, PanelBottom, Palette, Play } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import { formatBytes } from '../catalog'
import {
    clearHistory,
    DEFAULT_SETTINGS,
    downloads,
    history,
    setSettings,
    stations,
    useRows,
    useSettings,
    type Settings as Options,
} from '../data'
import { removeAllDownloads } from '../downloads'
import { EFFECTS, LOOKS, RAMPS } from '../look'
import { CARRIED } from '../themes'

const OFFERED = new Set(CARRIED)
const APP_THEMES = THEMES.filter((theme) => OFFERED.has(theme.value))

/** What a section's Reset to defaults puts back. */
const SECTION_KEYS: Record<string, (keyof Options)[]> = {
    playback: ['crossfade', 'rate', 'volume', 'muted', 'resume'],
    bar: ['layout', 'barSize', 'barVisualizer'],
    visualizer: ['look', 'ramp', 'effect', 'delay', 'lyrics'],
}

const rateLabel = (rate: number) => `${String(rate)}x`

/** The player's settings as a dialog: playback, the bar, the visualizer, the library kept here, and the look. */
export function Settings({ appearance, open, onClose }: { appearance: AppearanceState; open: boolean; onClose: () => void }) {
    const options = useSettings()
    const kept = useRows(downloads)
    const played = useRows(history)
    const made = useRows(stations)
    const [active, setActive] = useState('playback')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const bytes = kept.reduce((sum, row) => sum + row.bytes, 0)
    // The bar draws one line up to about 96 pixels.
    const oneLine = options.barSize === null || options.barSize <= 96

    const groups: SettingsGroup[] = [
        {
            id: 'listening',
            title: 'Listening',
            sections: [
                {
                    id: 'playback',
                    label: 'Playback',
                    icon: Play,
                    settings: [
                        {
                            id: 'crossfade',
                            title: 'Crossfade',
                            description: 'Fade each song into the next over a few seconds, rather than playing them back to back.',
                            keywords: ['fade', 'gapless', 'transition'],
                            control: (
                                <Segmented
                                    label="Crossfade"
                                    value={String(options.crossfade)}
                                    onValueChange={(value) => setSettings({ crossfade: Number(value) })}
                                    options={[
                                        { value: '0', label: 'Off' },
                                        { value: '2', label: '2 s' },
                                        { value: '5', label: '5 s' },
                                        { value: '8', label: '8 s' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'rate',
                            title: 'Speed',
                            description: 'How fast songs play, the pitch kept. The player bar has the same menu.',
                            keywords: ['rate', 'tempo'],
                            control: (
                                <Segmented
                                    label="Speed"
                                    value={String(options.rate)}
                                    onValueChange={(value) => setSettings({ rate: Number(value) })}
                                    options={MEDIA_RATES.map((rate) => ({ value: String(rate), label: rateLabel(rate) }))}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'volume',
                            title: 'Volume',
                            control: (
                                <SliderField
                                    id="volume"
                                    label="Volume"
                                    inline
                                    value={Math.round(options.volume * 100)}
                                    onChange={(value) => setSettings({ volume: value / 100, muted: false })}
                                    max={100}
                                    unit="%"
                                    className="w-60"
                                />
                            ),
                        },
                        {
                            id: 'muted',
                            title: 'Mute',
                            description: 'Silences the player without losing the volume.',
                            control: (
                                <Switch aria-label="Mute" checked={options.muted} onCheckedChange={(muted) => setSettings({ muted })} />
                            ),
                        },
                        {
                            id: 'resume',
                            title: 'Pick up where I left off',
                            description: 'Open the player at the song and the place it was at when the page was left.',
                            keywords: ['restore', 'remember'],
                            control: (
                                <Switch
                                    aria-label="Pick up where I left off"
                                    checked={options.resume}
                                    onCheckedChange={(resume) => setSettings({ resume })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'bar',
                    label: 'Player bar',
                    icon: PanelBottom,
                    settings: [
                        {
                            id: 'layout',
                            title: 'Grown bar',
                            description:
                                'How the bar arranges itself once dragged taller from its top edge, and how the full screen follows it.',
                            keywords: ['layout', 'rows', 'panel', 'stage'],
                            control: (
                                <Segmented
                                    label="Grown bar"
                                    value={options.layout}
                                    onValueChange={(layout) => setSettings({ layout })}
                                    options={[
                                        { value: 'rows', label: 'Rows' },
                                        { value: 'panel', label: 'Panel' },
                                        { value: 'stage', label: 'Stage' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'height',
                            title: 'Height',
                            description: oneLine ? 'One line. Drag its top edge to grow it.' : `${String(options.barSize)} pixels tall.`,
                            control: (
                                <BarHeight
                                    onLine={() => setSettings({ barSize: null })}
                                    onGrown={() => setSettings({ barSize: 300 })}
                                    line={oneLine}
                                />
                            ),
                        },
                        {
                            id: 'bar-visualizer',
                            title: 'Visualizer behind the bar',
                            description: 'A faint picture of the sound behind the words, once the bar is grown.',
                            control: (
                                <Switch
                                    aria-label="Visualizer behind the bar"
                                    checked={options.barVisualizer}
                                    onCheckedChange={(barVisualizer) => setSettings({ barVisualizer })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'visualizer',
                    label: 'Visualizer',
                    icon: AudioLines,
                    settings: [
                        {
                            id: 'look',
                            title: 'Look',
                            description: 'The picture of the sound in the full screen, also picked there.',
                            keywords: ['spectrum', 'bars', 'ring', 'wave'],
                            control: (
                                <Segmented
                                    label="Look"
                                    value={options.look}
                                    onValueChange={(look) => setSettings({ look })}
                                    options={LOOKS.map((look) => ({ value: look.id, label: look.label }))}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'ramp',
                            title: 'Colors',
                            description: "The colors it runs through from quiet to loud, each taken from the theme's own.",
                            control: (
                                <Segmented
                                    label="Colors"
                                    value={options.ramp}
                                    onValueChange={(ramp) => setSettings({ ramp })}
                                    options={RAMPS}
                                />
                            ),
                            layout: 'below',
                        },
                        {
                            id: 'effect',
                            title: 'Effect',
                            description: 'A glow around what is lit, or trails behind it. Off while motion is reduced.',
                            control: (
                                <Segmented
                                    label="Effect"
                                    value={options.effect}
                                    onValueChange={(effect) => setSettings({ effect })}
                                    options={EFFECTS}
                                />
                            ),
                        },
                        {
                            id: 'delay',
                            title: 'Delay',
                            description: 'Holds the picture back for a speaker that plays late, such as a wireless one.',
                            keywords: ['bluetooth', 'latency', 'sync'],
                            control: (
                                <SliderField
                                    id="delay"
                                    label="Delay"
                                    inline
                                    value={options.delay}
                                    onChange={(delay) => setSettings({ delay })}
                                    max={500}
                                    step={10}
                                    unit="ms"
                                    className="w-60"
                                />
                            ),
                        },
                        {
                            id: 'lyrics',
                            title: 'Words in the full screen',
                            description: 'Open the full screen on the words of what plays, where it has them, rather than the picture.',
                            keywords: ['lyrics'],
                            control: (
                                <Switch
                                    aria-label="Words in the full screen"
                                    checked={options.lyrics}
                                    onCheckedChange={(lyrics) => setSettings({ lyrics })}
                                />
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'library',
            title: 'Library',
            sections: [
                {
                    id: 'library',
                    label: 'On this device',
                    icon: Library,
                    settings: [
                        {
                            id: 'downloads',
                            title: 'Downloads',
                            description:
                                kept.length === 0 ? 'Nothing is downloaded.' : `${String(kept.length)} albums, ${formatBytes(bytes)}.`,
                            control: (
                                <Button variant="outline" size="sm" disabled={kept.length === 0} onClick={removeAllDownloads}>
                                    Remove all
                                </Button>
                            ),
                        },
                        {
                            id: 'history',
                            title: 'Recently played',
                            description: `${String(played.length)} songs, listed beside the queue.`,
                            control: (
                                <Button variant="outline" size="sm" disabled={played.length === 0} onClick={clearHistory}>
                                    Clear
                                </Button>
                            ),
                        },
                        {
                            id: 'stations',
                            title: 'Your stations',
                            description: made.length === 0 ? 'None yet.' : `${String(made.length)} started from artists, albums and songs.`,
                            control: (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={made.length === 0}
                                    onClick={() =>
                                        stations.change(
                                            () => [],
                                            async (source) => {
                                                for (const row of made) await source.remove(row.id)
                                            },
                                        )
                                    }
                                >
                                    Remove all
                                </Button>
                            ),
                        },
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description:
                                'Puts the favorites, playlists, downloads, stations, history, queue and settings back as they were.',
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
            id: 'you',
            title: 'You',
            sections: [
                {
                    id: 'appearance',
                    label: 'Appearance',
                    icon: Palette,
                    settings: [
                        {
                            id: 'look',
                            title: 'Theme',
                            description: 'The theme, the scheme, the density and the corners. The full screen stays dark in every one.',
                            keywords: ['theme', 'dark', 'light', 'density'],
                            control: (
                                <ThemePicker
                                    value={appearance.settings}
                                    onChange={appearance.setSettings}
                                    themes={APP_THEMES}
                                    corners={CORNERS}
                                    system
                                />
                            ),
                            layout: 'below',
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
                    const keys = section === undefined ? [] : (SECTION_KEYS[section] ?? [])
                    setSettings(Object.fromEntries(keys.map((key) => [key, DEFAULT_SETTINGS[key]])) as Partial<Options>)
                    if (section === 'appearance') appearance.setSettings({ ...DEFAULT_APPEARANCE, scheme: appearance.settings.scheme })
                    toast.add({ title: 'Put back to the defaults', timeout: 2000 })
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                question="Reset the demo data?"
                detail="Every favorite, playlist, download, station, play, the queue and the settings go back to how the demo started."
                confirm={{ label: 'Reset', destructive: true, onConfirm: () => void resetAll().then(() => window.location.reload()) }}
            />
        </>
    )
}

/** The bar's height as a choice: one line, or grown. */
function BarHeight({ line, onLine, onGrown }: { line: boolean; onLine: () => void; onGrown: () => void }) {
    return (
        <Segmented
            label="Height"
            value={line ? 'line' : 'grown'}
            onValueChange={(value) => (value === 'line' ? onLine() : onGrown())}
            options={[
                { value: 'line', label: 'One line' },
                { value: 'grown', label: 'Grown' },
            ]}
        />
    )
}
