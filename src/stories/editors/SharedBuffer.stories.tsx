import type { Meta, StoryObj } from '@storybook/react-vite'

import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { CodeEditor, useSharedDocument, useSharedText } from '@winterop-com/sokkel-ui/CodeEditor'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { WindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { EditorApp } from './frame'

const JOB = `job: import-orders
project: harbor
schedule: "30 1 * * *"
steps:
  - id: fetch
    kind: fetch
    with:
      url: https://files.example.org/orders-2026-11.csv
  - id: transform
    kind: transform
    needs: [fetch]
    with:
      script: orders.jq
  - id: validate
    kind: validate
    needs: [transform]
    with:
      rules: orders
      on_invalid: warn
  - id: upload
    kind: upload
    needs: [validate]
    with:
      bucket: harbor-orders
  - id: notify
    kind: notify
    needs: [upload]
    with:
      channel: "#harbor"
      on: [failed, cancelled]
`

const JOB_SCHEMA: JsonSchema = {
    type: 'object',
    required: ['job', 'steps'],
    properties: {
        job: { type: 'string', description: 'The job code.' },
        project: { enum: ['harbor', 'juniper', 'larkspur'], description: 'The project the job runs in.' },
        schedule: { type: 'string', description: 'When the job runs, as a cron line.' },
        steps: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'kind'],
                properties: {
                    id: { type: 'string', description: 'The step code.' },
                    kind: { enum: ['fetch', 'transform', 'validate', 'upload', 'notify'], description: 'What the step does.' },
                    needs: { type: 'array', items: { type: 'string' }, description: 'The steps that run before it.' },
                    with: { type: 'object', description: "The step's settings." },
                },
            },
        },
    },
}

function SharedBuffer({ open = false }: { open?: boolean }) {
    const doc = useSharedDocument(JOB)
    const text = useSharedText(doc)
    const lines = text.split('\n').length - 1
    const changed = text !== JOB
    return (
        <EditorApp
            place="shared"
            trail={[
                { label: 'Side by side', href: '#' },
                { label: 'import-orders', code: true },
            ]}
        >
            <SplitPane
                defaultShare={0.5}
                narrowBelow={720}
                first={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader
                            title="import-orders.yaml"
                            meta={changed ? <Chip tone="warning">edited</Chip> : `${String(lines)} lines`}
                            actions={
                                // An edit made outside the editors, as a form or a graph makes one: undone in either view.
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!text.includes('on_invalid: warn')}
                                    onClick={() => doc.replace(text.replace('on_invalid: warn', 'on_invalid: fail'))}
                                >
                                    Fail on invalid rows
                                </Button>
                            }
                        />
                        <Fill>
                            <CodeEditor doc={doc} label="Job" language="yaml" variant="pane" size="sm" schema={JOB_SCHEMA} folding />
                        </Fill>
                    </Stack>
                }
                second={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader title="import-orders.yaml" meta="second view" />
                        <Fill>
                            <WindowedPane title="import-orders.yaml" defaultOpen={open} className="h-full">
                                <CodeEditor
                                    doc={doc}
                                    label="Job, second view"
                                    language="yaml"
                                    variant="pane"
                                    size="sm"
                                    schema={JOB_SCHEMA}
                                    folding
                                />
                            </WindowedPane>
                        </Fill>
                    </Stack>
                }
            />
        </EditorApp>
    )
}

const meta: Meta = { title: 'Editors/Shared buffer' }
export default meta

/**
 * One job in two editors over a shared document (`useSharedDocument`), as two views of one file: an
 * edit in either shows in the other and both check it against the job schema, one undo history serves
 * both, and each keeps its own caret, selection and folds. The second view opens near full screen from
 * its expand button and goes on at the caret it left. The button over the first view changes the text
 * from outside the editors with `replace`, as a form or a graph would, and either view undoes it.
 */
export const Shared: StoryObj = { name: 'Shared buffer', render: () => <SharedBuffer /> }

/** The second view opened in its window over the app, the pane under it still editing the same document. */
export const WindowOpen: StoryObj = { name: 'Window open', render: () => <SharedBuffer open /> }
