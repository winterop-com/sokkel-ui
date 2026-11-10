import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { CodeEditor, type CodeProblem } from '@winterop-com/sokkel-ui/CodeEditor'
import { JSON_SCHEMA_2020_12 } from '@winterop-com/sokkel-ui/json-schema'
import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import type { JsonSchema } from '@winterop-com/sokkel-ui/schema/read'
import { EditorApp } from './frame'

const ORDER_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Order",
  "description": "An order as import-orders reads it.",
  "type": "object",
  "required": ["order_id", "total"],
  "additionalProperties": false,
  "properties": {
    "order_id": { "type": "string", "pattern": "^ord-[0-9]+$" },
    "project": { "enum": ["harbor", "juniper", "larkspur"] },
    "total": { "type": "number", "minimum": 0 },
    "lines": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["sku", "quantity"],
        "properties": {
          "sku": { "type": "string" },
          "quantity": { "type": "integer", "minimum": 1 }
        }
      }
    }
  }
}`

const ORDER = `{
  "order_id": "ord-1042",
  "project": "harbor",
  "total": -3,
  "lines": [
    { "sku": "tide-01", "quantity": 0 },
    { "sku": "tide-07", "quantity": 2 }
  ]
}`

const errorsIn = (problems: readonly CodeProblem[]) => problems.filter((problem) => problem.tone === 'error').length

/** How many problems a pane's document has, as a chip in its head. */
function Verdict({ problems }: { problems: readonly CodeProblem[] }) {
    if (problems.length === 0) return <Chip tone="good">valid</Chip>
    return <Chip tone="critical">{`${String(problems.length)} ${problems.length === 1 ? 'problem' : 'problems'}`}</Chip>
}

function SchemaEditor() {
    const [schemaText, setSchemaText] = useState(ORDER_SCHEMA)
    const [valueText, setValueText] = useState(ORDER)
    const [draft, setDraft] = useState<unknown>(undefined)
    const [schemaProblems, setSchemaProblems] = useState<readonly CodeProblem[]>([])
    const [valueProblems, setValueProblems] = useState<readonly CodeProblem[]>([])
    // The value is checked against the schema as last written without an error, so a half-typed keyword does not drop the checks.
    const [checked, setChecked] = useState<JsonSchema | undefined>(undefined)
    useEffect(() => {
        if (errorsIn(schemaProblems) === 0 && typeof draft === 'object' && draft !== null && !Array.isArray(draft))
            setChecked(draft as JsonSchema)
    }, [draft, schemaProblems])

    return (
        <EditorApp
            place="schemas"
            trail={[
                { label: 'Schemas', href: '#' },
                { label: 'order', code: true },
            ]}
        >
            <SplitPane
                defaultShare={0.55}
                minShare={0.3}
                maxShare={0.75}
                narrowBelow={720}
                first={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader title="order.schema.json" meta={<Verdict problems={schemaProblems} />} />
                        <Fill>
                            <CodeEditor
                                label="Schema"
                                language="json"
                                variant="pane"
                                size="sm"
                                value={schemaText}
                                onChange={setSchemaText}
                                schema={JSON_SCHEMA_2020_12}
                                onDocument={setDraft}
                                onProblems={setSchemaProblems}
                                folding
                                bracketColors
                                indentGuides
                            />
                        </Fill>
                    </Stack>
                }
                second={
                    <Stack gap="none" className="h-full min-h-0">
                        <PaneHeader
                            title="Try a value"
                            description="Checked against the schema as either changes."
                            meta={checked === undefined ? undefined : <Verdict problems={valueProblems} />}
                        />
                        <Fill>
                            <CodeEditor
                                label="Value"
                                language="json"
                                variant="pane"
                                size="sm"
                                value={valueText}
                                onChange={setValueText}
                                schema={checked}
                                onProblems={setValueProblems}
                                bracketColors
                            />
                        </Fill>
                    </Stack>
                }
            />
        </EditorApp>
    )
}

const meta: Meta = { title: 'Editors/Schema' }
export default meta

/**
 * A JSON Schema edited against the 2020-12 meta-schema (`JSON_SCHEMA_2020_12`): its keywords complete
 * at the top, inside each property and inside `items`, a keyword's value is checked, and its head says
 * whether it is valid. Beside it a value is tried against the schema being written, checked again as
 * either changes; the schema as last written without an error stays in force while a keyword is
 * half typed.
 */
export const Schema: StoryObj = { render: () => <SchemaEditor /> }
