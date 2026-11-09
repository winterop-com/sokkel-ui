import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { EditPreview, type EditPreviewView } from '@winterop-com/sokkel-ui/EditPreview'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'

/**
 * An editor beside its live preview: side by side where the box is wide, one at a time behind an
 * Edit and Preview switch where it is narrow. Each story fills the canvas; the viewport toolbar
 * shows the switch at a phone's width.
 */
const meta: Meta = { title: 'Patterns/Edit preview', parameters: { layout: 'fullscreen' } }
export default meta

const PAGE = `# Send digest

Every Monday at 09:00 the **send-digest** job mails each project's owner a summary of the week.

## What it holds

- The runs of the week, by state: succeeded, failed, cancelled and skipped.
- The slowest step of each job, and how its time moved since last week.
- Who is on call next.

> [!TIP]
> A project with no runs that week gets no mail.
`

function Editor({ pane }: { pane?: 'preview' }) {
    const [value, setValue] = useState(PAGE)
    return (
        <Stack className="h-dvh p-6">
            <EditPreview
                defaultPane={pane}
                edit={<CodeEditor value={value} onChange={setValue} wrap label="The page as markdown" />}
                preview={<Markdown content={value} scale="document" />}
                words={{ edit: 'Markdown' }}
                className="flex-1"
            />
        </Stack>
    )
}

const VIEWS = [
    { value: 'edit', label: 'Edit' },
    { value: 'both', label: 'Both' },
    { value: 'preview', label: 'Preview' },
] as const

/** A note's body under its header, the panes edge to edge and the view chosen in the header. */
function NotePane() {
    const [value, setValue] = useState(PAGE)
    const [view, setView] = useState<EditPreviewView>('both')
    return (
        <Stack gap="none" className="h-dvh">
            <PaneHeader
                title="Send digest"
                actions={<Segmented size="sm" label="Show" value={view} options={VIEWS} onValueChange={setView} />}
            />
            <EditPreview
                variant="pane"
                id="story-note"
                view={view}
                edit={<CodeEditor variant="pane" language="markdown" value={value} onChange={setValue} wrap label="The note as markdown" />}
                preview={<Markdown content={value} scale="document" />}
                className="flex-1"
            />
        </Stack>
    )
}

/** Markdown and the page it makes, side by side when wide; the preview follows every keystroke. */
export const Markdown_: StoryObj = { name: 'Markdown', render: () => <Editor /> }

/** Starting on the preview, as it shows on a narrow screen once the switch is turned. */
export const PreviewFirst: StoryObj = { name: 'Preview first', render: () => <Editor pane="preview" /> }

/**
 * Filling a note's pane: the two edge to edge, the rule between them dragged and the share kept
 * across reloads, and the header's switch showing the editor, both or the preview alone, the hidden
 * one kept as it was. Narrow, the editor stands over the preview.
 */
export const InAPane: StoryObj = { name: 'In a pane', render: () => <NotePane /> }
