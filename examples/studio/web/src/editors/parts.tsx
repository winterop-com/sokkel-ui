/** The parts every editor page draws with: a pane with its head, the editor's pane that pops out into a window, and a run's log. */

import { CodeEditor, type CodeMark } from '@winterop-com/sokkel-ui/CodeEditor'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { WindowedPane, WindowedPaneButton } from '@winterop-com/sokkel-ui/WindowedPane'
import type { ReactNode } from 'react'

import type { Run } from '../model'
import { useStudio } from '../state'

/** A pane: its head with a title, a short note and its actions, and its content filling the rest. */
export function Pane({ title, meta, actions, children }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={meta} actions={actions} />
            <div className="min-h-0 flex-1">{children}</div>
        </Stack>
    )
}

/**
 * The editor's pane, which opens into a window over the page: the same document goes on in the
 * window at the caret it left, while the rest of the page follows each edit.
 */
export function EditorPane({
    id,
    name,
    popped,
    onPoppedChange,
    actions,
    children,
}: {
    id: string
    name: string
    popped: boolean
    onPoppedChange: (popped: boolean) => void
    actions?: ReactNode
    children: ReactNode
}) {
    const { dirty } = useStudio()
    return (
        <WindowedPane
            title={name}
            button="none"
            open={popped}
            onOpenChange={onPoppedChange}
            className="h-full"
            words={{ expand: 'Pop out' }}
        >
            <Pane
                title={name}
                meta={dirty.has(id) ? 'Unsaved changes' : 'Saved'}
                actions={
                    <>
                        {actions}
                        <WindowedPaneButton />
                    </>
                }
            >
                {children}
            </Pane>
        </WindowedPane>
    )
}

/** Seconds from the run's start, as the log's lines lead with: +1.204s. */
const offset = (ms: number) => `+${(ms / 1000).toFixed(3)}s`.padStart(9)

/** A run's log as text, a line each, with the step that wrote it. */
export function logText(run: Run): string {
    const width = Math.max(4, ...run.steps.map((step) => step.id.length))
    return run.log.map((line) => `${offset(line.at)}  ${(line.step ?? 'run').padEnd(width)}  ${line.text}`).join('\n')
}

/** The log's marks: every line of the step that failed washed, its errors saying why on hover, and warnings. */
export function logMarks(run: Run): CodeMark[] {
    return run.log.flatMap((line, index): CodeMark[] => {
        const at = index + 1
        if (line.level === 'error') return [{ line: at, tone: 'error', message: run.failed?.reason ?? line.text }]
        if (run.failed !== undefined && line.step === run.failed.step) return [{ line: at, tone: 'error' }]
        if (line.level === 'warn') return [{ line: at, tone: 'warning' }]
        return []
    })
}

/** A run's log, read-only, with the failing step marked. */
export function RunLog({ run }: { run: Run }) {
    const { prefs } = useStudio()
    return (
        <CodeEditor
            key={run.id}
            label={`Log of run ${String(run.number)}`}
            variant="pane"
            size="sm"
            value={logText(run)}
            marks={logMarks(run)}
            readOnly
            wrap={prefs.wrap}
            lineNumbers={prefs.lineNumbers}
            search
        />
    )
}
