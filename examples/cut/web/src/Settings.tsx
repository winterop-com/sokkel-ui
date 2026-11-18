import { DEFAULT_APPEARANCE, CORNERS, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { Database, Film, Palette, Play, Scissors } from 'lucide-react'
import { useState } from 'react'

import { settingsSection, type Frame } from 'tidevann-shared/frame'
import { prefs as prefsStore } from './collections'
import { DEFAULT_PREFS, EXPORT_SIZES, type ExportSize, type Prefs } from './model'

/** The person's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({ prefs, frame, onClose }: { prefs: Prefs; frame: Frame; onClose: () => void }) {
    const [active, setActive] = useState(() => settingsSection(frame.route) ?? 'playback')
    const [search, setSearch] = useState('')
    const { settings, setSettings } = frame.appearance
    const set = (patch: Partial<Prefs>) => void prefsStore.update(prefs.id, patch)

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'playback',
                    label: 'Playback',
                    icon: Play,
                    settings: [
                        {
                            id: 'loop',
                            title: 'Loop',
                            description: 'Play from the start again on reaching the end of the edit.',
                            control: <Switch aria-label="Loop" checked={prefs.loop} onCheckedChange={(loop) => set({ loop })} />,
                            layout: 'trailing',
                            keywords: ['repeat', 'again'],
                        },
                        {
                            id: 'light-preview',
                            title: 'Light preview',
                            description: 'Draw the preview at half its size, for a slower machine. The export is not changed.',
                            control: (
                                <Switch
                                    aria-label="Light preview"
                                    checked={prefs.lightPreview}
                                    onCheckedChange={(lightPreview) => set({ lightPreview })}
                                />
                            ),
                            layout: 'trailing',
                            keywords: ['quality', 'resolution', 'fast'],
                        },
                    ],
                },
                {
                    id: 'editing',
                    label: 'Editing',
                    icon: Scissors,
                    settings: [
                        {
                            id: 'snap',
                            title: 'Snap',
                            description: 'Clips snap to the edges of other clips and to the playhead while they are dragged.',
                            control: <Switch aria-label="Snap" checked={prefs.snap} onCheckedChange={(snap) => set({ snap })} />,
                            layout: 'trailing',
                            keywords: ['magnet', 'align'],
                        },
                        {
                            id: 'ripple',
                            title: 'Delete closes the gap',
                            description: 'Delete moves what follows on the track left into the gap, as Ripple delete does.',
                            control: (
                                <Switch
                                    aria-label="Delete closes the gap"
                                    checked={prefs.rippleByDefault}
                                    onCheckedChange={(rippleByDefault) => set({ rippleByDefault })}
                                />
                            ),
                            layout: 'trailing',
                            keywords: ['ripple', 'remove'],
                        },
                        {
                            id: 'title-length',
                            title: 'New title length',
                            description: 'How long a title added from the bin runs.',
                            control: (
                                <NumberField
                                    id="title-length"
                                    label="New title length"
                                    bare
                                    value={prefs.titleLength}
                                    min={1}
                                    max={30}
                                    step={0.5}
                                    suffix="s"
                                    onValueChange={(titleLength) => {
                                        if (titleLength !== null && titleLength >= 1 && titleLength <= 30) set({ titleLength })
                                    }}
                                />
                            ),
                            keywords: ['caption', 'text', 'duration'],
                        },
                    ],
                },
                {
                    id: 'export',
                    label: 'Export',
                    icon: Film,
                    settings: [
                        {
                            id: 'size',
                            title: 'Resolution',
                            description: 'The size an export is drawn and encoded at. A larger one takes longer.',
                            control: (
                                <Segmented<ExportSize>
                                    label="Resolution"
                                    value={prefs.exportSize}
                                    onValueChange={(exportSize) => set({ exportSize })}
                                    options={(Object.keys(EXPORT_SIZES) as ExportSize[]).map((size) => ({
                                        value: size,
                                        label: EXPORT_SIZES[size].label,
                                    }))}
                                />
                            ),
                            keywords: ['quality', '720p', '480p', '360p'],
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
                    reset: false,
                    label: 'Data',
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: 'Puts the projects, their edits and these preferences back as they first were.',
                            control: (
                                <Button variant="outline" size="sm" onClick={frame.askReset}>
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
                if (section === 'playback') set({ loop: DEFAULT_PREFS.loop, lightPreview: DEFAULT_PREFS.lightPreview })
                if (section === 'editing')
                    set({
                        snap: DEFAULT_PREFS.snap,
                        rippleByDefault: DEFAULT_PREFS.rippleByDefault,
                        titleLength: DEFAULT_PREFS.titleLength,
                    })
                if (section === 'export') set({ exportSize: DEFAULT_PREFS.exportSize })
                if (section === 'appearance') setSettings({ ...DEFAULT_APPEARANCE })
            }}
        />
    )
}
