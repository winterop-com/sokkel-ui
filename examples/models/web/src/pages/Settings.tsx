import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { DEFAULT_APPEARANCE, THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SettingsDialog, type SettingsGroup } from '@winterop-com/sokkel-ui/SettingsDialog'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { themeSettings } from '@winterop-com/sokkel-ui/ThemePicker'
import { ArrowDownToLine, Boxes, Cpu, Database, FolderOpen, Palette } from 'lucide-react'
import { useEffect, useState } from 'react'

import { resetAll } from 'tidevann-shared/backend'
import type { Frame } from 'tidevann-shared/frame'
import { log } from '../data/backend'
import { diskOf, validRoot } from '../data/disk'
import { DEFAULT_PREFS, type Prefs } from '../data/model'
import { MACHINE_MEMORY } from '../engine/runner'
import { useApp } from '../state'
import { ModelSelect } from './ChatSettings'

/** The library's root: typed, checked as a folder path, and moved to once applied. */
function RootField({ root, onApply }: { root: string; onApply: (root: string) => void }) {
    const [text, setText] = useState(root)
    useEffect(() => setText(root), [root])
    const valid = validRoot(text)
    const changed = text.trim() !== root
    return (
        <Row gap="xs">
            <Input
                aria-label="Library root"
                aria-invalid={!valid}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && valid && changed) onApply(text.trim())
                    if (event.key === 'Escape') setText(root)
                }}
                className="w-64 max-w-full font-mono"
            />
            <Button size="sm" variant="outline" disabled={!valid || !changed} onClick={() => onApply(text.trim())}>
                Move
            </Button>
        </Row>
    )
}

/** A switch named for the setting it turns. */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
    return <Switch aria-label={label} checked={on} onCheckedChange={onChange} />
}

/** What each section holds, so Reset to defaults puts those back and leaves the rest. */
const HELD: Record<string, (keyof Omit<Prefs, 'id'>)[]> = {
    library: ['root', 'confirmDelete'],
    models: ['defaultModel'],
    downloads: ['parallel', 'bandwidth'],
    runner: ['memory', 'keepAlive', 'startRunner', 'autoLoad'],
}

/** The app's settings, kept by the backend as each is changed; the look is kept in this browser. */
export function SettingsPage({ frame, open, onClose }: { frame: Frame; open: boolean; onClose: () => void }) {
    const { prefs, setPrefs, models } = useApp()
    const { settings: look, setSettings: setLook } = frame.appearance
    const [active, setActive] = useState('library')
    const [search, setSearch] = useState('')
    const [resetting, setResetting] = useState(false)
    const [busy, setBusy] = useState(false)
    const save = (patch: Partial<Omit<Prefs, 'id'>>) =>
        void setPrefs(patch).catch((error: unknown) =>
            toast.add({
                type: 'error',
                title: 'Could not save',
                description: String(error),
            }),
        )

    const groups: SettingsGroup[] = [
        {
            id: 'app',
            title: 'Models',
            sections: [
                {
                    id: 'library',
                    label: 'Library',
                    icon: FolderOpen,
                    settings: [
                        {
                            id: 'root',
                            title: 'Library root',
                            description: `Where the models are kept, on ${diskOf(prefs.root).name}. Moving it moves every model with it.`,
                            keywords: ['folder', 'path', 'disk', 'storage'],
                            layout: 'below',
                            control: (
                                <RootField
                                    root={prefs.root}
                                    onApply={(root) => {
                                        save({ root })
                                        log('info', 'library', `library moved to ${root} on ${diskOf(root).name}`)
                                        toast.add({
                                            type: 'success',
                                            title: 'Library moved',
                                            description: `${String(models.length)} models are now under ${root}`,
                                        })
                                    }}
                                />
                            ),
                        },
                        {
                            id: 'confirm-delete',
                            title: 'Ask before deleting a model',
                            description: 'Say what goes with it, and how much room it frees, before its files are removed.',
                            control: (
                                <Toggle
                                    label="Ask before deleting a model"
                                    on={prefs.confirmDelete}
                                    onChange={(confirmDelete) => save({ confirmDelete })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'models',
                    label: 'Chat',
                    icon: Boxes,
                    settings: [
                        {
                            id: 'default-model',
                            title: 'Default model',
                            description: 'What a new chat starts with, from the palette, the rail or N.',
                            keywords: ['model', 'new chat'],
                            control: (
                                <ModelSelect
                                    label="Default model"
                                    value={prefs.defaultModel}
                                    onChange={(defaultModel) => save({ defaultModel })}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'downloads',
                    label: 'Downloads',
                    icon: ArrowDownToLine,
                    settings: [
                        {
                            id: 'parallel',
                            title: 'Pulls at a time',
                            description: 'The rest wait their turn, in the order they were asked for.',
                            control: (
                                <Segmented
                                    label="Pulls at a time"
                                    value={String(prefs.parallel)}
                                    onValueChange={(value) => save({ parallel: Number(value) })}
                                    options={['1', '2', '3', '4'].map((value) => ({
                                        value,
                                        label: value,
                                    }))}
                                />
                            ),
                        },
                        {
                            id: 'bandwidth',
                            title: 'Bandwidth limit',
                            description: 'Shared by every pull under way, so the network stays usable.',
                            keywords: ['speed', 'network'],
                            control: (
                                <Segmented
                                    label="Bandwidth limit"
                                    value={String(prefs.bandwidth)}
                                    onValueChange={(value) => save({ bandwidth: Number(value) })}
                                    options={[
                                        { value: '0', label: 'None' },
                                        { value: '25', label: '25 MB/s' },
                                        { value: '50', label: '50 MB/s' },
                                        { value: '100', label: '100 MB/s' },
                                    ]}
                                />
                            ),
                        },
                    ],
                },
                {
                    id: 'runner',
                    label: 'Runner',
                    icon: Cpu,
                    settings: [
                        {
                            id: 'memory',
                            title: 'Memory for models',
                            description: `How much of this machine's ${String(MACHINE_MEMORY / 1e9)} GB the runner may fill. It unloads the model used longest ago to make room.`,
                            keywords: ['ram', 'limit'],
                            layout: 'below',
                            control: (
                                <SliderField
                                    id="memory"
                                    label="Memory for models"
                                    value={prefs.memory}
                                    onChange={(memory) => save({ memory })}
                                    min={4}
                                    max={32}
                                    step={1}
                                    unit="GB"
                                />
                            ),
                        },
                        {
                            id: 'keep-alive',
                            title: 'Keep idle models loaded',
                            description: 'A model nobody has asked for this long is unloaded, freeing its memory.',
                            keywords: ['keep-alive', 'unload', 'idle'],
                            control: (
                                <Segmented
                                    label="Keep idle models loaded"
                                    value={String(prefs.keepAlive)}
                                    onValueChange={(value) => save({ keepAlive: Number(value) })}
                                    options={[
                                        { value: '5', label: '5 min' },
                                        { value: '10', label: '10 min' },
                                        { value: '30', label: '30 min' },
                                        { value: '0', label: 'Always' },
                                    ]}
                                />
                            ),
                        },
                        {
                            id: 'start-runner',
                            title: 'Start the runner with the app',
                            description: 'Off, it waits for Start in the top bar or on the Runner page.',
                            control: (
                                <Toggle
                                    label="Start the runner with the app"
                                    on={prefs.startRunner}
                                    onChange={(startRunner) => save({ startRunner })}
                                />
                            ),
                        },
                        {
                            id: 'auto-load',
                            title: 'Load a model when a chat needs it',
                            description: 'Off, a chat with a model not loaded says so, and it is loaded by hand.',
                            keywords: ['on demand'],
                            control: (
                                <Toggle
                                    label="Load a model when a chat needs it"
                                    on={prefs.autoLoad}
                                    onChange={(autoLoad) => save({ autoLoad })}
                                />
                            ),
                        },
                    ],
                },
            ],
        },
        {
            id: 'workspace',
            title: 'This app',
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
                    id: 'demo',
                    label: 'Demo data',
                    reset: false,
                    icon: Database,
                    settings: [
                        {
                            id: 'reset',
                            title: 'Reset demo data',
                            description:
                                'Puts back the fifteen models, the conversations, the runner and these settings, and forgets every pull.',
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
                    if (section === 'appearance') {
                        setLook({ ...DEFAULT_APPEARANCE })
                        return
                    }
                    const keys = section === undefined ? [] : (HELD[section] ?? [])
                    if (keys.length > 0) save(Object.fromEntries(keys.map((key) => [key, DEFAULT_PREFS[key]])))
                }}
            />
            <ConfirmDialog
                open={resetting}
                onOpenChange={(next) => !busy && setResetting(next)}
                question="Reset the demo data?"
                detail="Models pulled, conversations and comparisons made since are gone, and the page loads again."
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
