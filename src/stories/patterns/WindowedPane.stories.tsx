import type { Meta, StoryObj } from '@storybook/react-vite'

import { Code } from '@winterop-com/sokkel-ui/Code'
import { MermaidDiagram } from '@winterop-com/sokkel-ui/MermaidDiagram'
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

/** A pane of code in its place; the expand button shows at its top right corner while the pointer is over it. */
export const Closed: StoryObj = {
    render: () => (
        <WindowedPane title="import-orders.yaml">
            <Code title="import-orders.yaml" language="yaml" lineNumbers value={CONFIG} />
        </WindowedPane>
    ),
}

/** The same pane opened in the window; its place says where it went and keeps its height. */
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
