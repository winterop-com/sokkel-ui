import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PanelSection } from '@winterop-com/sokkel-ui/SidePanel'
import { Box, CircleAlert, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { BlockPalette } from '@winterop-com/sokkel-ui-graph/BlockPalette'
import { BlockPicker } from '@winterop-com/sokkel-ui-graph/BlockPicker'
import { GraphOverlay, GraphNotice } from '@winterop-com/sokkel-ui-graph/GraphOverlay'
import { GraphToolbar, GraphToolbarButton } from '@winterop-com/sokkel-ui-graph/GraphToolbar'
import { PipelineGraph } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { Problem } from '@winterop-com/sokkel-ui/Problem'
import { SelectionBar } from '@winterop-com/sokkel-ui/SelectionBar'
import { SchemaForm, useSchemaForm } from '@winterop-com/sokkel-ui/schema/SchemaForm'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { blockOf, BLOCKS, GROUPS, type BlockSpec } from './blocks'
import { usePipelineEditor, type Notice, type Picker, type PipelineDoc, type PipelineEditorState } from './use-editor'
import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from '@winterop-com/sokkel-ui/primitives/popover'
import { Center, Fill, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** The canvas of the editor: the pipeline with its toolbar, the open picker, and the last notice. */
export function EditorCanvas({
    editor,
    readOnly = false,
    empty = 'Drag a block here, or click one in the palette, to start',
    toolbar,
}: {
    editor: PipelineEditorState
    /** Views and chooses only, as on a phone. */
    readOnly?: boolean
    empty?: string
    /** The app's own buttons in the toolbar. */
    toolbar?: ReactNode
}) {
    const count = editor.selection.length
    const [adding, setAdding] = useState(false)
    return (
        <PipelineGraph
            steps={editor.steps}
            positions={editor.doc.positions}
            selection={editor.selection}
            onSelectionChange={(codes) => {
                editor.setSelection(codes)
                editor.setPicker(null)
            }}
            editing={readOnly ? undefined : editor.editing}
            controls={false}
            words={{ label: 'nightly-export', empty }}
            emptyAction={
                readOnly ? undefined : (
                    <Popover open={adding} onOpenChange={setAdding}>
                        <PopoverTrigger render={<Button size="sm">Add step</Button>} />
                        <PopoverContent className="w-auto p-0">
                            <BlockPicker
                                blocks={BLOCKS}
                                groups={GROUPS}
                                title="Add a step"
                                onPick={(block) => {
                                    editor.addFromPalette(block as BlockSpec)
                                    setAdding(false)
                                }}
                                onClose={() => setAdding(false)}
                            />
                        </PopoverContent>
                    </Popover>
                )
            }
            toolbar={
                <GraphToolbar
                    onUndo={readOnly ? undefined : editor.history.undo}
                    onRedo={readOnly ? undefined : editor.history.redo}
                    canUndo={editor.history.canUndo}
                    canRedo={editor.history.canRedo}
                    onLayout={readOnly ? undefined : editor.layout}
                    issues={editor.steps.length === 0 ? undefined : editor.issueCount}
                    onIssues={editor.firstIssue}
                >
                    {!readOnly && count > 0 && (
                        <SelectionBar count={count} size="sm" words={{ selected: (chosen) => `${String(chosen)} chosen` }}>
                            <GraphToolbarButton
                                label={count === 1 ? 'Remove the chosen step' : `Remove the ${String(count)} chosen steps`}
                                onClick={() => editor.remove(editor.selection)}
                            >
                                <Trash2 aria-hidden />
                            </GraphToolbarButton>
                        </SelectionBar>
                    )}
                    {toolbar}
                </GraphToolbar>
            }
        >
            {!readOnly && editor.anchor !== null && editor.picker !== null && (
                <GraphOverlay
                    at={editor.anchor}
                    link={editor.picker.mode === 'drop' ? editor.picker.source : undefined}
                    onClose={() => editor.setPicker(null)}
                >
                    <BlockPicker
                        blocks={editor.offered}
                        groups={GROUPS}
                        title={editor.pickerTitle}
                        width="lg"
                        words={{ placeholder: 'Search by name, kind or keyword' }}
                        onPick={(block) => editor.pick(block as BlockSpec)}
                        onClose={() => editor.setPicker(null)}
                    />
                </GraphOverlay>
            )}
            {editor.notice !== null && (
                <GraphNotice tone={editor.notice.tone} onClose={() => editor.setNotice(null)}>
                    {editor.notice.text}
                </GraphNotice>
            )}
        </PipelineGraph>
    )
}

/** The palette of every block, adding to the editor's pipeline. */
export function EditorPalette({ editor, className }: { editor: PipelineEditorState; className?: string }) {
    return (
        <BlockPalette blocks={BLOCKS} groups={GROUPS} onPick={(block) => editor.addFromPalette(block as BlockSpec)} className={className} />
    )
}

/** A step's settings as a form drawn from its block's schema, handing every change up. */
function Settings({
    schema,
    value,
    onChange,
}: {
    schema: JsonSchema
    value: Record<string, unknown>
    onChange: (value: Record<string, unknown>) => void
}) {
    const form = useSchemaForm(schema, { initial: value, defaultSubmitted: true })
    const last = useRef(form.value)
    const report = useRef(onChange)
    useEffect(() => {
        report.current = onChange
    }, [onChange])
    useEffect(() => {
        if (form.value === last.current) return
        last.current = form.value
        report.current((form.value ?? {}) as Record<string, unknown>)
    }, [form.value])
    return <SchemaForm form={form} />
}

/** A step's code, taken when the field is left or Enter is pressed, and refused while it is taken or malformed. */
function CodeField({ editor, code }: { editor: PipelineEditorState; code: string }) {
    const [draft, setDraft] = useState(code)
    const problem = editor.codeProblem(code, draft)
    const id = `step-code-${code}`
    return (
        <TextField
            id={id}
            label="Code"
            help="The key other steps and the pipeline file name this step by."
            error={problem}
            mono
            value={draft}
            onChange={setDraft}
            onBlur={() => editor.rename(code, draft)}
            onEnter={() => editor.rename(code, draft)}
            onEscape={() => setDraft(code)}
        />
    )
}

/** The chosen step's settings: its block, its code and name, and the form its block's schema draws. */
export function StepPanel({ editor }: { editor: PipelineEditorState }) {
    const code = editor.selected
    const step = code === null ? undefined : editor.step(code)
    const block = blockOf(step?.kind)
    if (editor.selection.length > 1)
        return (
            <p className="p-4 text-sm text-muted-foreground">
                {editor.selection.length} steps are chosen. Drag one of them to move them together, or press Delete to remove them.
            </p>
        )
    if (code === null || step === undefined || block === undefined)
        return <p className="p-4 text-sm text-muted-foreground">Choose a step to edit its settings.</p>
    const Icon = block.icon ?? Box
    const inflow = (editor.issues.get(code) ?? []).find((issue) => issue.text === 'Nothing flows in')
    const key = `${code}:${String(editor.history.revision)}`
    return (
        <Stack gap="lg" className="p-4">
            <Row gap="sm" align="start">
                <Center as="span" className="size-8 shrink-0 rounded-control border border-border bg-background text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                </Center>
                <div className="min-w-0">
                    <p className="text-sm font-medium">{block.name ?? block.kind}</p>
                    <p className="font-mono text-xs text-muted-foreground">{block.kind}</p>
                    {block.description !== undefined && <p className="mt-1 text-xs text-muted-foreground">{block.description}</p>}
                </div>
            </Row>
            {inflow !== undefined && (
                <Problem title={inflow.text} detail={`${inflow.detail ?? ''} Drag from its output to this step's input.`.trim()} />
            )}
            <CodeField key={key} editor={editor} code={code} />
            <TextField
                id={`step-name-${code}`}
                label="Name"
                help="A title for people; the code stays the key."
                value={step.name ?? ''}
                placeholder={code}
                onChange={(value) => editor.setName(code, value)}
            />
            <Stack className="border-t border-border pt-4">
                <GroupLabel as="h3">Settings</GroupLabel>
                <Settings
                    key={key}
                    schema={block.schema}
                    value={step.settings}
                    onChange={(settings) => editor.setSettings(code, settings)}
                />
            </Stack>
        </Stack>
    )
}

/** Every step with a problem, each pressed to choose it. */
export function ProblemsPanel({ editor }: { editor: PipelineEditorState }) {
    const listed = editor.doc.steps.filter((step) => editor.issues.has(step.code))
    return (
        <PanelSection title="Problems">
            {listed.length === 0 && <p className="text-sm text-muted-foreground">Every step is ready to run.</p>}
            <Stack as="ul" gap="2xs">
                {listed.map((step) => (
                    <li key={step.code}>
                        <button
                            type="button"
                            onClick={() => editor.setSelection([step.code])}
                            className="w-full rounded-control px-2 py-1.5 text-left hover:bg-hover"
                            aria-current={editor.selected === step.code}
                        >
                            <Stack as="span" gap="3xs">
                                <span className="font-mono text-sm">{step.code}</span>
                                {(editor.issues.get(step.code) ?? []).map((issue) => (
                                    <Row as="span" key={issue.text} gap="xs" className="text-xs text-critical-ink">
                                        <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                                        {issue.text}
                                    </Row>
                                ))}
                            </Stack>
                        </button>
                    </li>
                ))}
            </Stack>
        </PanelSection>
    )
}

/** A story's page: a title, then the palette, the canvas and the side panel in a row, or stacked on a phone with the canvas first. */
function EditorStage({
    title,
    meta,
    palette,
    aside,
    children,
}: {
    title: string
    meta: string
    palette?: ReactNode
    aside?: ReactNode
    children: ReactNode
}) {
    return (
        <Stack className="h-svh bg-background p-4 text-foreground max-md:h-auto max-md:min-h-svh md:p-6">
            <PageHeader title={title} description={meta} />
            <Row gap="lg" align="stretch" stackBelow="md" className="min-h-0 flex-1">
                {palette}
                <Fill className="max-md:order-first max-md:h-[65svh] max-md:flex-none">{children}</Fill>
                {aside !== undefined && (
                    <Stack as="aside" gap="none" className="shrink-0 overflow-y-auto rounded-surface border border-border bg-card md:w-80">
                        {aside}
                    </Stack>
                )}
            </Row>
        </Stack>
    )
}

/**
 * The editor as one story shows it: the pipeline document under undo, with the palette and a side
 * panel as asked, opened in the state the story is about.
 */
export function PipelineEditorStory({
    initial,
    meta,
    palette = false,
    aside,
    selection,
    picker,
    notice,
    past,
}: {
    initial: PipelineDoc
    meta: string
    palette?: boolean
    aside?: 'step' | 'problems'
    selection?: string[]
    picker?: Picker
    notice?: Notice
    past?: PipelineDoc[]
}) {
    const editor = usePipelineEditor(initial, { selection, picker, notice, past })
    return (
        <EditorStage
            title="nightly-export"
            meta={meta}
            palette={palette ? <EditorPalette editor={editor} className="shrink-0 max-md:h-72 md:w-60" /> : undefined}
            aside={aside === 'step' ? <StepPanel editor={editor} /> : aside === 'problems' ? <ProblemsPanel editor={editor} /> : undefined}
        >
            <EditorCanvas editor={editor} />
        </EditorStage>
    )
}
