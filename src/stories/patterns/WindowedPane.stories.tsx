import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Code } from '@winterop-com/sokkel-ui/Code'
import { CodeEditor, useSharedDocument, useSharedText } from '@winterop-com/sokkel-ui/CodeEditor'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MermaidDiagram } from '@winterop-com/sokkel-ui/MermaidDiagram'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { WindowedPane } from '@winterop-com/sokkel-ui/WindowedPane'

/**
 * Any pane with an expand button that opens the same content near full screen: a window with a
 * margin all round, a title and a close button, closed by Escape too. The pane keeps its height in
 * place meanwhile, and the content comes back when the window closes.
 */
const meta: Meta = { title: 'Patterns/Windowed pane', parameters: { frame: 'column' } }
export default meta

const CONFIG = `job: import-orders
schedule: "0 2 * * *"
steps:
  fetch:
    uses: http.get
    with: { url: https://files.example.org/orders-2026-10.csv }
  transform:
    uses: rows.map
    with: { script: orders.jq }
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: fail }
  upload:
    uses: store.put
    with: { bucket: harbor-orders }
  notify:
    uses: chat.post
    with: { channel: "#harbor", on: [failed] }
`

const FLOW = `flowchart LR
  fetch[fetch] --> transform[transform]
  transform --> validate[validate]
  validate -->|valid| upload[upload]
  validate -->|invalid| notify[notify]
  upload --> notify`

/**
 * A pane of code in its place; the expand button shows at its top right corner while the pointer is
 * over it, or while it has focus. Opened from the keyboard, the window takes focus on its content
 * rather than its close button, so one Escape closes it.
 */
export const Closed: StoryObj = {
    render: () => (
        <WindowedPane title="import-orders.yaml">
            <Code title="import-orders.yaml" language="yaml" lineNumbers value={CONFIG} />
        </WindowedPane>
    ),
}

/** The same pane opened in the window, focused on its content; its place says where it went and keeps its height. */
export const Open: StoryObj = {
    render: () => (
        <WindowedPane title="import-orders.yaml" defaultOpen>
            <Code title="import-orders.yaml" language="yaml" lineNumbers value={CONFIG} />
        </WindowedPane>
    ),
}

/** A mermaid diagram's own expand button, beside its source toggle, opens it as large as the window allows. */
export const Diagram: StoryObj = {
    render: () => <MermaidDiagram code={FLOW} title="import-orders" defaultExpanded />,
}

function Pane({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={meta} />
            <Fill>{children}</Fill>
        </Stack>
    )
}

/** One document in two editors: the job beside a second view of it that opens into the window. */
function SharedEditors({ open = false }: { open?: boolean }) {
    const doc = useSharedDocument(CONFIG)
    const lines = useSharedText(doc).split('\n').length - 1
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <SplitPane
                first={
                    <Pane title="import-orders.yaml" meta={`${String(lines)} lines`}>
                        <CodeEditor doc={doc} label="Job" language="yaml" variant="pane" size="sm" />
                    </Pane>
                }
                second={
                    <Pane title="import-orders.yaml" meta="second view">
                        <WindowedPane title="import-orders.yaml" defaultOpen={open} className="h-full">
                            <CodeEditor doc={doc} label="Job, second view" language="yaml" variant="pane" size="sm" />
                        </WindowedPane>
                    </Pane>
                }
            />
        </Stack>
    )
}

/**
 * A job in a pane beside a second view of the same document (`useSharedDocument`): typing in either
 * shows in the other, Mod-z undoes the last edit made in either, and each keeps its own caret and
 * selection. The second view's expand button opens it in the window, where it goes on at the caret
 * it left.
 */
export const SharedDocument: StoryObj = { name: 'Shared document', parameters: { frame: false }, render: () => <SharedEditors /> }

/** The second view opened in the window over the page, the pane beside it still editing the same document. */
export const SharedDocumentOpen: StoryObj = {
    name: 'Shared document, open',
    parameters: { frame: false },
    render: () => <SharedEditors open />,
}
