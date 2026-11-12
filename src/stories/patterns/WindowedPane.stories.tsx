import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Code } from '@winterop-com/sokkel-ui/Code'
import { CodeEditor, useControlledDocument, useSharedDocument, useSharedText } from '@winterop-com/sokkel-ui/CodeEditor'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MermaidDiagram } from '@winterop-com/sokkel-ui/MermaidDiagram'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { WindowedPane, WindowedPaneButton } from '@winterop-com/sokkel-ui/WindowedPane'

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

const REGIONS = ['europe', 'asia', 'africa', 'oceania', 'north-america', 'south-america']

/** A long pipeline: nightly-export fetching, checking and uploading one export per region. */
const PIPELINE = `job: nightly-export
project: larkspur
schedule: "0 3 * * *"
steps:
${REGIONS.map(
    (region) => `  - id: fetch-${region}
    kind: fetch
    with:
      url: https://exports.example.org/${region}/orders.csv
  - id: transform-${region}
    kind: transform
    needs: [fetch-${region}]
    with:
      script: '.rows | map(select(.state != "cancelled"))'
  - id: validate-${region}
    kind: validate
    needs: [transform-${region}]
    with:
      rules: orders
      on_invalid: fail
  - id: upload-${region}
    kind: upload
    needs: [validate-${region}]
    with:
      bucket: larkspur-${region}
`,
).join('')}  - id: notify
    kind: notify
    needs: [${REGIONS.map((region) => `upload-${region}`).join(', ')}]
    with:
      channel: "#larkspur"
      on: [failed, cancelled]
`

/** The step kinds a pipeline is written with, as a reference beside the editor in the window. */
function StepReference() {
    return (
        <Section variant="flat" title="Step kinds" description="What each step of a pipeline does, and the settings it reads.">
            <DescriptionList
                layout="stacked"
                items={[
                    { term: 'fetch', value: 'Reads a file from a URL into rows. Reads url.' },
                    { term: 'transform', value: 'Runs a jq script over the rows. Reads script.' },
                    { term: 'validate', value: 'Checks the rows against named rules. Reads rules, and on_invalid: fail or warn.' },
                    { term: 'upload', value: 'Writes the rows to a bucket. Reads bucket.' },
                    { term: 'notify', value: 'Posts to a channel when the run ends in one of the states given. Reads channel and on.' },
                ]}
            />
        </Section>
    )
}

/** An editor over a document of its own, so a story's pane can be typed in. */
function Editor({ text, label }: { text: string; label: string }) {
    const doc = useSharedDocument(text)
    return <CodeEditor doc={doc} label={label} language="yaml" variant="pane" size="sm" />
}

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

/**
 * A step's output in a pane whose expand button sits beside the code's copy button, in a head row of
 * its own over the code (`button="none"` on the pane, the button in the code's `actions`, `header`
 * set), so neither covers the first lines.
 */
export const InCodeActions: StoryObj = {
    name: 'In code actions',
    render: () => (
        <WindowedPane title="fetch output" button="none">
            <Code language="yaml" value={CONFIG} header actions={<WindowedPaneButton />} />
        </WindowedPane>
    ),
}

/**
 * The pane set inset on the page with a hairline edge (`frame="inset"`), as `Surface`'s inset tone
 * draws it, around an editor drawn edge to edge.
 */
export const Inset: StoryObj = {
    render: () => (
        <WindowedPane title="import-orders.yaml" frame="inset">
            <Editor label="Job" text={CONFIG} />
        </WindowedPane>
    ),
}

/**
 * A long pipeline in a pane the page scrolls past: `button="sticky"` holds the expand button at the
 * top of the pane's visible part, so it stays in reach all the way down.
 */
export const StickyButton: StoryObj = {
    name: 'Sticky button',
    render: () => (
        <WindowedPane title="nightly-export.yaml" frame="inset" button="sticky">
            <Editor label="Pipeline" text={PIPELINE} />
        </WindowedPane>
    ),
}

/** A job held by a value the page keeps, its editor in a section whose head carries the expand button. */
function SectionHeadPane() {
    const [saved, setSaved] = useState(CONFIG)
    const [value, setValue] = useState(CONFIG)
    const doc = useControlledDocument(value, setValue)
    return (
        <WindowedPane title="import-orders.yaml" button="none">
            <Section
                title="import-orders.yaml"
                meta={value === saved ? 'Saved' : 'Unsaved changes'}
                flush
                actions={
                    <>
                        <Button size="sm" variant="ghost" disabled={value === saved} onClick={() => setValue(saved)}>
                            Revert
                        </Button>
                        <Button size="sm" disabled={value === saved} onClick={() => setSaved(value)}>
                            Save
                        </Button>
                        <WindowedPaneButton size="icon-sm" />
                    </>
                }
            >
                <CodeEditor doc={doc} label="Job" language="yaml" variant="pane" size="sm" />
            </Section>
        </WindowedPane>
    )
}

/**
 * The expand button set in a `Section` head (`button="none"`), at `size="icon-sm"` so it stands as
 * tall as the head's other tools. The editor's document follows a value the page holds
 * (`useControlledDocument`): Revert puts the saved text back in it, and each edit reports the text once.
 */
export const SectionHead: StoryObj = { name: 'Section head', render: () => <SectionHeadPane /> }

/**
 * The pipeline opened in the window with the step kinds beside it (`aside`), drawn in the window
 * only; the edge between them resizes, and in a narrow window the reference goes under the editor.
 */
export const Aside: StoryObj = {
    render: () => (
        <WindowedPane title="nightly-export.yaml" frame="inset" defaultOpen aside={<StepReference />}>
            <Editor label="Pipeline" text={PIPELINE} />
        </WindowedPane>
    ),
}

/** A mermaid diagram's own expand button, beside its source toggle, opens it as large as the window allows. */
export const Diagram: StoryObj = {
    render: () => <MermaidDiagram code={FLOW} title="import-orders" defaultExpanded />,
}

function Pane({ title, meta, actions, children }: { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={meta} actions={actions} />
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

/**
 * The content as a function of where it is drawn: the pane with its head and the expand button, the
 * window with the editor alone and the step kinds beside it. Both editors share one document.
 */
function KeptPane() {
    const doc = useSharedDocument(PIPELINE)
    const lines = useSharedText(doc).split('\n').length - 1
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <WindowedPane title="nightly-export.yaml" keepPane defaultOpen button="none" aside={<StepReference />} className="h-full">
                {(where) =>
                    where === 'pane' ? (
                        <Pane title="nightly-export.yaml" meta={`${String(lines)} lines`} actions={<WindowedPaneButton />}>
                            <CodeEditor doc={doc} label="Pipeline" language="yaml" variant="pane" size="sm" />
                        </Pane>
                    ) : (
                        <CodeEditor doc={doc} label="Pipeline, in the window" language="yaml" variant="pane" size="sm" />
                    )
                }
            </WindowedPane>
        </Stack>
    )
}

/**
 * The pipeline's pane stays in place under its open window (`keepPane`) rather than moving into it:
 * the window draws its own editor over the same shared document, with the step kinds beside it, so
 * an edit in the window shows in the pane at once and the pane is as it was when the window closes.
 */
export const KeptPaneOpen: StoryObj = { name: 'Kept pane', parameters: { frame: false }, render: () => <KeptPane /> }
