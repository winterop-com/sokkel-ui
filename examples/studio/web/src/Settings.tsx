import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { ThemePicker } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { Database, Palette, SquareCode } from 'lucide-react'
import { useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { counted, DEFAULT_PREFS, type Prefs, type TextSize } from './model'
import { useStudio } from './state'

/** The themes the studio carries, whose styles `app.css` imports. */
export const CARRIED = ['tidevann', 'steel', 'terminal', 'paper']

type Flag = 'wrap' | 'lineNumbers' | 'folding' | 'indentGuides' | 'bracketColors'

/** A switch named for the editor setting it turns. */
function Toggle({ flag, label }: { flag: Flag; label: string }) {
    const { prefs, setPrefs } = useStudio()
    return <Switch aria-label={label} checked={prefs[flag]} onCheckedChange={(on) => void setPrefs({ [flag]: on } as Partial<Prefs>)} />
}

/** The reader's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function Settings({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const { prefs, setPrefs, files, runs, dirty, close } = useStudio()
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('editor')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)

    const flag = (id: Flag, title: string, description: string, keywords: string[] = []) => ({
        id,
        title,
        description,
        keywords,
        control: <Toggle flag={id} label={title} />,
    })

    const groups: SettingsGroup[] = [
        {
            id: 'studio',
            title: 'Studio',
            sections: [
                {
                    id: 'editor',
                    label: 'Editor',
                    icon: SquareCode,
                    settings: [
                        {
                            id: 'size',
                            title: 'Text size',
                            description: "The editor's text, from the size of help text to a step over the body.",
                            keywords: ['font', 'zoom'],
                            control: (
                                <Segmented<TextSize>
                                    size="sm"
                                    label="Text size"
                                    value={prefs.size}
                                    onValueChange={(size) => void setPrefs({ size })}
                                    options={[
                                        { value: 'sm', label: 'Small' },
                                        { value: 'md', label: 'Medium' },
                                        { value: 'lg', label: 'Large' },
                                    ]}
                                />
                            ),
                        },
                        flag('wrap', 'Wrap long lines', 'Long lines fold at the edge rather than scroll sideways.'),
                        flag('lineNumbers', 'Line numbers', 'A number before each line, in the editors and the logs.', ['gutter']),
                        flag('folding', 'Folding', 'Arrows in the gutter fold a block of YAML or JSON away.', ['collapse']),
                        flag('indentGuides', 'Indent guides', 'A faint rule at each step of indent.'),
                        flag('bracketColors', 'Bracket colors', 'Brackets colored by depth, so a pair reads at a glance.'),
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
                        {
                            id: 'look',
                            title: 'Theme',
                            description: 'The theme, light or dark, and the density.',
                            layout: 'below',
                            keywords: ['dark', 'light', 'scheme', 'density', 'compact'],
                            control: (
                                <ThemePicker
                                    value={look}
                                    onChange={setLook}
                                    themes={THEMES.filter((theme) => CARRIED.includes(theme.value))}
                                    system
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'workspace',
                    label: 'Workspace',
                    icon: Database,
                    settings: [
                        {
                            id: 'tabs',
                            title: 'Close every tab',
                            description:
                                dirty.size > 0
                                    ? `${counted(prefs.tabs.length, 'tab')} open; those with changes not saved ask first.`
                                    : `${counted(prefs.tabs.length, 'tab')} open.`,
                            control: (
                                <Button size="sm" variant="outline" disabled={prefs.tabs.length === 0} onClick={() => close(prefs.tabs)}>
                                    Close all
                                </Button>
                            ),
                        },
                        {
                            id: 'reset',
                            title: 'Reset the demo data',
                            description: `Puts back the workspace as it started (${counted(files.length, 'file')} and ${counted(runs.length, 'run')} now) and loads the page again.`,
                            keywords: ['seed', 'start over'],
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
                    void setPrefs({
                        wrap: DEFAULT_PREFS.wrap,
                        lineNumbers: DEFAULT_PREFS.lineNumbers,
                        size: DEFAULT_PREFS.size,
                        folding: DEFAULT_PREFS.folding,
                        indentGuides: DEFAULT_PREFS.indentGuides,
                        bracketColors: DEFAULT_PREFS.bracketColors,
                    })
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={(next) => !busy && setResetting(next)}
                question="Reset the demo data?"
                detail="Files, runs and settings made since are gone, changes not saved too, and the page loads again."
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
