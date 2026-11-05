import { BookOpen, CalendarClock, Library, Play, Server, Webhook, Workflow } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '../../../components/PageHeader'
import { Rail, type RailGroup } from '../../../components/Rail'
import { Page, Shell } from '../../../components/Shell'
import { SidePanel } from '../../../components/SidePanel'
import { TopBar } from '../../../components/TopBar'
import { Button } from '../../../components/ui/button'
import { TooltipProvider } from '../../../components/ui/tooltip'
import { useIsMobile } from '../../../hooks/use-mobile'
import { TidevannMark } from '../../fixtures/TidevannMark'
import { NIGHTLY_DOC } from './documents'
import { EditorCanvas, EditorPalette, StepPanel } from './Editor'
import { usePipelineEditor } from './use-editor'

const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#' },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'pipelines', label: 'Pipelines', icon: Workflow, href: '#', active: true },
            { id: 'services', label: 'Services', icon: Server, href: '#' },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook, href: '#' },
        ],
    },
    {
        id: 'reference',
        title: 'Reference',
        entries: [
            { id: 'docs', label: 'Docs', icon: BookOpen, href: '#' },
            { id: 'examples', label: 'Examples', icon: Library, href: '#' },
        ],
    },
]

/**
 * The editor as an app ships it: the shell with the pipeline's page, Save and Run in its header,
 * the palette and the canvas with its toolbar, and the chosen step's settings in the side panel.
 * The rail starts collapsed, to give the canvas the room.
 * On a phone the pipeline is viewed rather than edited: no palette, and the canvas chooses only.
 */
export function EditorPage() {
    const editor = usePipelineEditor(NIGHTLY_DOC, { selection: ['validate'] })
    const [saved, setSaved] = useState(editor.doc)
    const [runs, setRuns] = useState(0)
    const [railCollapsed, setRailCollapsed] = useState(true)
    const mobile = useIsMobile()
    const dirty = editor.doc !== saved
    const blocked = editor.issueCount > 0
    return (
        <TooltipProvider>
            <Shell
                rail={
                    <Rail
                        mark={<TidevannMark />}
                        name="Tidevann"
                        groups={GROUPS}
                        collapsed={railCollapsed}
                        onCollapsedChange={setRailCollapsed}
                    />
                }
                top={
                    <TopBar
                        trail={[
                            { label: 'Tidevann', href: '#' },
                            { label: 'harbor', href: '#', code: true },
                            { label: 'Pipelines', href: '#' },
                            { label: 'nightly-export', code: true },
                        ]}
                    />
                }
                panel={
                    <SidePanel
                        width="20rem"
                        tabs={[{ id: 'step', label: editor.selected ?? 'Step', content: <StepPanel editor={editor} /> }]}
                    />
                }
            >
                <Page className="h-full min-h-0 pb-(--density-page-inset)">
                    <PageHeader
                        title="Nightly export"
                        code="nightly-export"
                        count={`${String(editor.doc.steps.length)} steps`}
                        actions={
                            <>
                                {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                                <Button size="sm" variant="outline" disabled={!dirty} onClick={() => setSaved(editor.doc)}>
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={blocked}
                                    title={blocked ? 'Fix the marked steps to run the pipeline' : undefined}
                                    onClick={() => {
                                        setRuns(runs + 1)
                                        editor.setNotice({
                                            tone: 'info',
                                            text: dirty
                                                ? `Run ${String(runs + 1)} queued with the unsaved changes, by ada.`
                                                : `Run ${String(runs + 1)} queued by ada.`,
                                        })
                                    }}
                                >
                                    <Play aria-hidden />
                                    Run
                                </Button>
                            </>
                        }
                    />
                    <div className="flex min-h-0 flex-1 gap-3 max-md:min-h-[60svh]">
                        {!mobile && <EditorPalette editor={editor} className="w-52 shrink-0" />}
                        <div className="flex min-h-0 min-w-0 flex-1">
                            <EditorCanvas editor={editor} readOnly={mobile} />
                        </div>
                    </div>
                </Page>
            </Shell>
        </TooltipProvider>
    )
}
