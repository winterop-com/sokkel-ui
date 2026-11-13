import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { CalendarDays, Database, Palette, PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { DEFAULT_PREFS, TEMPLATE, type FontSize, type View } from '../model'
import { useVault } from '../state'

/** A switch named for the setting it turns. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
    return <Switch aria-label={label} checked={on} onCheckedChange={onChange} />
}

/** The daily template, typed here and kept a moment after typing stops. */
function TemplateEditor() {
    const { prefs, setPrefs } = useVault()
    const [text, setText] = useState(prefs.template)
    const timer = useRef<number | undefined>(undefined)
    const keep = useRef(setPrefs)
    keep.current = setPrefs
    // Put back from elsewhere (Reset to defaults), the template follows.
    useEffect(() => {
        if (timer.current === undefined) setText(prefs.template)
    }, [prefs.template])
    useEffect(() => () => window.clearTimeout(timer.current), [])
    return (
        <CodeEditor
            label="Daily note template"
            language="markdown"
            value={text}
            onChange={(next) => {
                setText(next)
                window.clearTimeout(timer.current)
                timer.current = window.setTimeout(() => {
                    timer.current = undefined
                    void keep.current({ template: next })
                }, 500)
            }}
            wrap
            lineNumbers={false}
            className="h-48 w-full"
        />
    )
}

/** The reader's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function SettingsPage({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const { prefs, setPrefs, vault } = useVault()
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('editor')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)

    const groups: SettingsGroup[] = [
        {
            id: 'notes',
            title: 'Notes',
            sections: [
                {
                    id: 'editor',
                    label: 'Editor',
                    icon: PenLine,
                    settings: [
                        {
                            id: 'font-size',
                            title: 'Text size',
                            description: "The editor's text, from the size of help text to a step over the body.",
                            keywords: ['font', 'zoom'],
                            control: (
                                <Segmented<FontSize>
                                    size="sm"
                                    label="Text size"
                                    value={prefs.fontSize}
                                    onValueChange={(fontSize) => void setPrefs({ fontSize })}
                                    options={[
                                        { value: 'sm', label: 'Small' },
                                        { value: 'md', label: 'Medium' },
                                        { value: 'lg', label: 'Large' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'wrap',
                            title: 'Wrap long lines',
                            description: 'Long lines fold at the edge rather than scroll sideways.',
                            control: <Toggle label="Wrap long lines" on={prefs.wrap} onChange={(wrap) => void setPrefs({ wrap })} />,
                        },
                        {
                            id: 'line-numbers',
                            title: 'Line numbers',
                            description: 'A number before each line of the editor.',
                            control: (
                                <Toggle
                                    label="Line numbers"
                                    on={prefs.lineNumbers}
                                    onChange={(lineNumbers) => void setPrefs({ lineNumbers })}
                                />
                            ),
                        },
                        {
                            id: 'default-view',
                            title: 'Open notes in',
                            description: 'What a note shows when it is opened: the editor, both side by side, or the page to read.',
                            keywords: ['preview', 'reading', 'split'],
                            control: (
                                <Segmented<View>
                                    size="sm"
                                    label="Open notes in"
                                    value={prefs.defaultView}
                                    onValueChange={(defaultView) => void setPrefs({ defaultView })}
                                    options={[
                                        { value: 'edit', label: 'Edit' },
                                        { value: 'both', label: 'Both' },
                                        { value: 'preview', label: 'Read' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'daily',
                    label: 'Daily notes',
                    icon: CalendarDays,
                    settings: [
                        {
                            id: 'daily-folder',
                            title: 'Folder',
                            description: "Where a new day's note goes.",
                            control: (
                                <NativeSelect
                                    aria-label="Folder for daily notes"
                                    size="sm"
                                    value={prefs.dailyFolder ?? ''}
                                    onChange={(event) =>
                                        void setPrefs({
                                            dailyFolder: event.target.value === '' ? null : event.target.value,
                                        })
                                    }
                                >
                                    <NativeSelectOption value="">Top of the vault</NativeSelectOption>
                                    {[...vault.folders]
                                        .sort((a, b) => vault.path(a.id).localeCompare(vault.path(b.id)))
                                        .map((folder) => (
                                            <NativeSelectOption key={folder.id} value={folder.id}>
                                                {vault.path(folder.id)}
                                            </NativeSelectOption>
                                        ))}
                                </NativeSelect>
                            ),
                        },
                        {
                            id: 'template',
                            title: 'Template',
                            description: "What a new day's note starts with. {{date}} becomes the day, {{long}} the day written out.",
                            layout: 'below',
                            control: <TemplateEditor />,
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
                    id: 'vault',
                    reset: false,
                    label: 'Vault',
                    icon: Database,
                    settings: [
                        {
                            id: 'tabs',
                            title: 'Close every tab',
                            description: `${String(prefs.tabs.length)} notes are open as tabs.`,
                            control: (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={prefs.tabs.length === 0}
                                    onClick={() => void setPrefs({ tabs: [], active: null })}
                                >
                                    Close all
                                </Button>
                            ),
                        },
                        {
                            id: 'recent',
                            title: 'Forget the recent notes',
                            description: `${String(prefs.recent.length)} notes are listed as recent.`,
                            control: (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={prefs.recent.length === 0}
                                    onClick={() => void setPrefs({ recent: [] })}
                                >
                                    Forget
                                </Button>
                            ),
                        },
                        {
                            id: 'reset',
                            title: 'Reset the demo data',
                            description: `Puts back the vault as it started, ${String(vault.notes.length)} notes now, and loads the page again.`,
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
                onReset={(section) => {
                    if (section === 'appearance') setLook({ ...DEFAULT_APPEARANCE })
                    if (section === 'editor')
                        void setPrefs({
                            fontSize: DEFAULT_PREFS.fontSize,
                            wrap: DEFAULT_PREFS.wrap,
                            lineNumbers: DEFAULT_PREFS.lineNumbers,
                            defaultView: DEFAULT_PREFS.defaultView,
                        })
                    if (section === 'daily')
                        void setPrefs({
                            dailyFolder: DEFAULT_PREFS.dailyFolder,
                            template: TEMPLATE,
                        })
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={(next) => !busy && setResetting(next)}
                question="Reset the demo data?"
                detail="Notes, folders and settings made since are gone, and the page loads again."
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
