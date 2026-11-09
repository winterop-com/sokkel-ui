import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { CORNERS, DEFAULT_APPEARANCE, THEMES, TYPEFACES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { type SettingsGroup, SettingsView } from '@winterop-com/sokkel-ui/SettingsView'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { ChartColumn, Database, Hash, Palette } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { go } from 'tidevann-shared/router'

import { preferences } from '../backend'
import { AGGREGATES, counted, type Dataset, DEFAULT_PREFERENCES, type NumberStyle, type Preferences } from '../model'
import { paletteOptions, SelectInput } from '../inputs'
import { formatter } from '../shape'

const NUMBER_STYLES: readonly { value: NumberStyle; label: string }[] = [
    { value: 'grouped', label: 'Grouped' },
    { value: 'compact', label: 'Compact' },
    { value: 'plain', label: 'Plain' },
]

const DECIMALS: readonly { value: Preferences['decimals']; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
]

/** The visualizer's preferences as a page: chart colors, how figures are written, new charts, the look and the demo's data. */
export function SettingsPage({ prefs, frame, datasets }: { prefs: Preferences; frame: Frame; datasets: readonly Dataset[] }) {
    const [active, setActive] = useState('charts')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const { settings, setSettings } = frame.appearance
    const set = (patch: Partial<Preferences>) => void preferences.update(prefs.id, patch)
    const sample = formatter(prefs)
    const imported = datasets.filter((one) => one.source !== 'seed').length

    const groups: SettingsGroup[] = [
        {
            id: 'preferences',
            title: 'Preferences',
            sections: [
                {
                    id: 'charts',
                    label: 'Charts',
                    icon: ChartColumn,
                    settings: [
                        {
                            id: 'palette',
                            title: 'Colors',
                            description:
                                'The palette every chart takes unless it picks its own: series, slices, a heatmap’s and a map’s shades.',
                            control: (
                                <SelectInput
                                    id="setting-palette"
                                    label="Colors"
                                    value={prefs.palette}
                                    options={paletteOptions(undefined)}
                                    onChange={(palette) => set({ palette })}
                                />
                            ),
                            keywords: ['palette', 'series', 'swatches'],
                        },
                        {
                            id: 'aggregate',
                            title: 'Combine figures by',
                            description: 'How a new chart combines the rows that fall in one place, until it is changed.',
                            control: (
                                <Segmented
                                    label="Combine figures by"
                                    value={prefs.aggregate}
                                    onValueChange={(aggregate) => set({ aggregate })}
                                    options={AGGREGATES}
                                />
                            ),
                            keywords: ['sum', 'mean', 'average', 'aggregate'],
                        },
                        {
                            id: 'suggestions',
                            title: 'Suggest views',
                            description: 'Show views that suit the columns picked under the builder’s preview.',
                            control: (
                                <Switch
                                    aria-label="Suggest views"
                                    checked={prefs.suggestions}
                                    onCheckedChange={(suggestions) => set({ suggestions })}
                                />
                            ),
                            layout: 'trailing',
                            keywords: ['recommend', 'builder'],
                        },
                    ],
                },
                {
                    id: 'numbers',
                    label: 'Numbers',
                    icon: Hash,
                    settings: [
                        {
                            id: 'style',
                            title: 'Number format',
                            description: `How figures are written in charts, tables and tiles: 1234567.891 is written ${sample(1234567.891)}.`,
                            control: (
                                <Segmented
                                    label="Number format"
                                    value={prefs.numbers}
                                    onValueChange={(numbers) => set({ numbers })}
                                    options={NUMBER_STYLES}
                                />
                            ),
                            keywords: ['thousands', 'compact', 'format'],
                        },
                        {
                            id: 'decimals',
                            title: 'Decimals',
                            description: 'How many decimals every figure keeps; Auto keeps up to two, and drops trailing zeros.',
                            control: (
                                <Segmented
                                    label="Decimals"
                                    value={prefs.decimals}
                                    onValueChange={(decimals) => set({ decimals })}
                                    options={DECIMALS}
                                />
                            ),
                            keywords: ['precision', 'rounding'],
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
                    label: 'Data',
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description: `Puts the datasets, charts, boards and these preferences back as they first were${imported > 0 ? `; the ${counted(imported, 'dataset')} imported here go` : ''}.`,
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
            <SettingsView
                groups={groups}
                active={active}
                onActiveChange={setActive}
                search={search}
                onSearchChange={setSearch}
                footer="Kept in this browser as they are changed"
                onReset={(section) => {
                    if (section === 'charts')
                        set({
                            palette: DEFAULT_PREFERENCES.palette,
                            aggregate: DEFAULT_PREFERENCES.aggregate,
                            suggestions: DEFAULT_PREFERENCES.suggestions,
                        })
                    if (section === 'numbers') set({ numbers: DEFAULT_PREFERENCES.numbers, decimals: DEFAULT_PREFERENCES.decimals })
                    if (section === 'appearance') setSettings({ ...DEFAULT_APPEARANCE, scheme: settings.scheme })
                    toast.success('Back to the defaults')
                }}
                onDone={() => go('/datasets')}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={setResetting}
                question="Reset the demo data?"
                detail="Every dataset, chart and board goes back to how the demo started, and what was imported goes. This cannot be undone."
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
