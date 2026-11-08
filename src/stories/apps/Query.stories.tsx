import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookMarked, Braces, Play, Settings as SettingsIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { CodeEditor, type CodeCompletion, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { JQ_BUILTINS } from '@winterop-com/sokkel-ui/code/jq'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Shell } from '@winterop-com/sokkel-ui/Shell'
import { TopBar, type Crumb } from '@winterop-com/sokkel-ui/TopBar'
import { useIsMobile } from '@winterop-com/sokkel-ui/hooks/use-mobile'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Kbd } from '@winterop-com/sokkel-ui/primitives/kbd'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@winterop-com/sokkel-ui/primitives/resizable'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { pictureOf } from '../fixtures/portraits'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * A query playground in the library's frame: the runs and jobs as JSON in one pane, a jq program in
 * the next with jq's built-ins completed and explained on hover, and what it gives in a third. Mod-Enter
 * runs the program; a compile error is underlined at its column with the message on hover. The
 * workspace's settings are YAML checked against their JSON Schema as they are typed.
 */
type View = 'playground' | 'error' | 'settings'

const INPUT = JSON.stringify(
    {
        project: 'harbor',
        jobs: [
            { code: 'nightly-export', schedule: '02:00', owner: 'ada' },
            { code: 'sync-inventory', schedule: 'hourly', owner: 'grace' },
            { code: 'rebuild-index', schedule: 'sunday 04:00', owner: 'linus' },
        ],
        runs: [
            { id: 4181, job: 'nightly-export', state: 'failed', failed_step: 'validate', owner: 'ada', rejected: 37 },
            { id: 4180, job: 'sync-inventory', state: 'succeeded', owner: 'grace', rejected: 0 },
            { id: 4179, job: 'rebuild-index', state: 'running', owner: 'linus' },
            { id: 4178, job: 'send-digest', state: 'cancelled', owner: 'margaret' },
            { id: 4177, job: 'import-orders', state: 'failed', failed_step: 'fetch', owner: 'ada', rejected: 0 },
            { id: 4176, job: 'nightly-export', state: 'skipped', owner: 'ada' },
        ],
    },
    null,
    2,
)

const PROGRAM = `# The failed runs, newest first, with the step they stopped on
.runs
| map(select(.state == "failed"))
| sort_by(.id) | reverse
| map({job, step: .failed_step, note: "rejected \\(.rejected) rows"})`

const OUTPUT = JSON.stringify(
    [
        { job: 'nightly-export', step: 'validate', note: 'rejected 37 rows' },
        { job: 'import-orders', step: 'fetch', note: 'rejected 0 rows' },
    ],
    null,
    2,
)

const BROKEN = `# The jobs each person owns, as entries
.jobs
| group_by(.owner)
| map({owner: .[0].owner, jobs: map(.code)})
| to_entires`

const ERROR: CodeMark = { line: 5, from: 3, to: 13, tone: 'error', message: 'to_entires/0 is not defined. Did you mean to_entries?' }

/** The fields of the input, offered after a dot. */
const FIELDS: CodeCompletion[] = [
    { label: 'runs', detail: 'array', docs: 'Every run of the project, newest first.', kind: 'property' },
    { label: 'jobs', detail: 'array', docs: 'The jobs of the project.', kind: 'property' },
    { label: 'project', detail: 'string', kind: 'property' },
    { label: 'id', detail: 'number', kind: 'property' },
    { label: 'job', detail: 'string', kind: 'property' },
    { label: 'state', detail: 'string', docs: 'succeeded, failed, running, queued, cancelled or skipped.', kind: 'property' },
    { label: 'failed_step', detail: 'string', docs: 'The step a failed run stopped on.', kind: 'property' },
    { label: 'owner', detail: 'string', kind: 'property' },
    { label: 'rejected', detail: 'number', docs: 'Rows the validate step refused.', kind: 'property' },
]

const BUILTINS = new Map(JQ_BUILTINS.map((builtin) => [builtin.label, builtin]))

/** A built-in's signature and what it does. */
function describe(word: string): ReactNode {
    const builtin = BUILTINS.get(word)
    if (builtin === undefined) return null
    return (
        <Stack gap="xs">
            <code className="font-mono">
                {builtin.label}
                {builtin.detail}
            </code>
            <span className="text-muted-foreground">{String(builtin.info)}</span>
        </Stack>
    )
}

/** A pane: its head with a title, a short note and its actions, and the editor filling the rest. */
function Pane({ title, meta, actions, children }: { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={meta} actions={actions} />
            <div className="min-h-0 flex-1">{children}</div>
        </Stack>
    )
}

function Workbench({ broken }: { broken: boolean }) {
    const mobile = useIsMobile()
    const [input, setInput] = useState(INPUT)
    const [program, setProgram] = useState(broken ? BROKEN : PROGRAM)
    const [ran, setRan] = useState(broken ? BROKEN : PROGRAM)
    const failed = ran === BROKEN
    return (
        <ResizablePanelGroup orientation={mobile ? 'vertical' : 'horizontal'} className="min-h-0 flex-1">
            <ResizablePanel defaultSize="42%" minSize="20%">
                <Pane title="Input" meta="1.1 kB">
                    <CodeEditor
                        label="Input"
                        language="json"
                        variant="pane"
                        size="sm"
                        value={input}
                        onChange={setInput}
                        folding
                        bracketColors
                        indentGuides
                    />
                </Pane>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel minSize="30%">
                <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel defaultSize="45%" minSize="20%">
                        <Pane
                            title="Program"
                            meta={
                                <span>
                                    <Kbd>Cmd/Ctrl+Enter</Kbd> runs
                                </span>
                            }
                            actions={
                                <Button size="sm" onClick={() => setRan(program)}>
                                    <Play aria-hidden />
                                    Run
                                </Button>
                            }
                        >
                            <CodeEditor
                                label="Program"
                                language="jq"
                                variant="pane"
                                size="sm"
                                value={program}
                                onChange={setProgram}
                                completions={FIELDS}
                                hover={describe}
                                onRun={setRan}
                                marks={failed && program === BROKEN ? [ERROR] : []}
                                bracketColors
                            />
                        </Pane>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel minSize="20%">
                        <Pane title="Output" meta={failed ? 'Compile error' : '2 outputs, 1.8 ms'}>
                            {failed ? (
                                <Banner tone="critical">
                                    Compile error at line 5, column 3: to_entires/0 is not defined. Check the spelling and the number of
                                    arguments.
                                </Banner>
                            ) : (
                                <CodeEditor
                                    label="Output"
                                    language="json"
                                    variant="pane"
                                    size="sm"
                                    value={OUTPUT}
                                    readOnly
                                    bracketColors
                                    indentGuides
                                />
                            )}
                        </Pane>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}

const SETTINGS_SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['project', 'indent'],
    additionalProperties: false,
    properties: {
        project: { enum: ['harbor', 'juniper', 'larkspur'], description: 'The project whose runs the playground reads.' },
        indent: { type: 'integer', minimum: 0, maximum: 8, description: 'Spaces per level in the output.' },
        sort_keys: { type: 'boolean', description: "Sorts each object's keys in the output." },
        raw_output: { type: 'boolean', description: 'Writes strings without their quotes.' },
        run_on_edit: { type: 'boolean', description: 'Runs the program after each edit, not only on Cmd/Ctrl+Enter.' },
        saved: {
            type: 'array',
            description: 'Queries kept in the rail.',
            items: {
                type: 'object',
                required: ['name', 'program'],
                additionalProperties: false,
                properties: {
                    name: { type: 'string', pattern: '^[a-z][a-z-]*$', description: 'Lowercase with dashes.' },
                    program: { type: 'string', description: 'The jq program.' },
                    shared: { type: 'boolean', description: 'Whether the team sees it.' },
                },
            },
        },
    },
}

const SETTINGS = `project: harbor
indent: two
sort_keys: true
run_on_edit: yes
saved:
  - name: failed-runs
    program: .runs | map(select(.state == "failed"))
    shared: true
  - name: Owners
    program: .jobs | group_by(.owner)
  - name: running
    program: .runs[] | select(.state == "running")
    pinned: true
`

function SettingsPane() {
    const [settings, setSettings] = useState(SETTINGS)
    return (
        <Pane title="Settings" meta="workspace.yaml, checked against its schema">
            <CodeEditor
                label="Settings"
                language="yaml"
                variant="pane"
                value={settings}
                onChange={setSettings}
                schema={SETTINGS_SCHEMA}
                folding
                indentGuides
            />
        </Pane>
    )
}

function groups(view: View): RailGroup[] {
    return [
        {
            id: 'query',
            entries: [
                { id: 'playground', label: 'Playground', icon: Braces, href: '#', active: view !== 'settings' },
                { id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#', active: view === 'settings' },
            ],
        },
        {
            id: 'saved',
            title: 'Saved',
            entries: [
                {
                    id: 'queries',
                    label: 'Queries',
                    icon: BookMarked,
                    href: '#',
                    entries: [
                        { id: 'failed-runs', label: 'failed-runs', href: '#', active: view === 'playground' },
                        { id: 'owners', label: 'owners', href: '#', active: view === 'error' },
                        { id: 'running', label: 'running', href: '#' },
                    ],
                },
            ],
        },
    ]
}

const TRAILS: Record<View, Crumb[]> = {
    playground: [
        { label: 'Queries', href: '#' },
        { label: 'failed-runs', code: true },
    ],
    error: [
        { label: 'Queries', href: '#' },
        { label: 'owners', code: true },
    ],
    settings: [{ label: 'Settings' }],
}

function QueryApp({ view }: { view: View }) {
    const [collapsed, setCollapsed] = useState(false)
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={groups(view)}
                        defaultOpen={['queries']}
                        collapsed={collapsed}
                        onCollapsedChange={setCollapsed}
                        foot={
                            <AccountMenu
                                name="ada"
                                image={pictureOf('ada')}
                                where="tidevann.example.org"
                                collapsed={collapsed}
                                onSettings={() => undefined}
                            />
                        }
                    />
                }
                top={<TopBar trail={TRAILS[view]} onSearch={() => undefined} />}
            >
                <Stack gap="none" className="h-full min-h-0">
                    {view === 'settings' ? <SettingsPane /> : <Workbench broken={view === 'error'} />}
                </Stack>
            </Shell>
        </TooltipProvider>
    )
}

const meta: Meta = { title: 'Apps/Query' }
export default meta

/** The input, a jq program with its completions and hover docs, and its output, in panes that resize. */
export const Playground: StoryObj = { render: () => <QueryApp view="playground" /> }

/** A program jq refuses: the unknown name underlined at its column, its message on hover, and the error in place of the output. */
export const Failed: StoryObj = { name: 'Error', render: () => <QueryApp view="error" /> }

/** The workspace's settings as YAML, each value the schema refuses underlined with why on hover. */
export const Settings: StoryObj = { render: () => <QueryApp view="settings" /> }
