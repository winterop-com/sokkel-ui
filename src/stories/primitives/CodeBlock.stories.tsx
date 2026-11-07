import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileTextIcon, TerminalIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockContent,
    CodeBlockCopyButton,
    CodeBlockFooter,
    CodeBlockHeader,
    CodeBlockLine,
    CodeBlockTitle,
} from '@winterop-com/sokkel-ui/primitives/code-block'
import { useHighlightedCode } from '@winterop-com/sokkel-ui/hooks/use-highlighted-code'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * Code on a bordered surface: a title, actions, numbered or wrapped lines, and lines marked
 * added, removed or highlighted. Highlighting comes from shiki and arrives once its grammar loads;
 * until then the lines show plain.
 */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const JOB = `code: import-orders
name: Import orders
schedule: "0 2 * * *"
steps:
  fetch:
    uses: http.get
    with:
      service: api
      path: /v1/orders/export?month=2026-10
  validate:
    uses: rows.check
    with:
      input: \${{ steps.fetch.output }}
      expression: .amount | type == "number"
      message: amount is not a number in orders-2026-10.csv
  upload:
    uses: bucket.put
    with:
      bucket: harbor-exports
`

const RUN = `$ jobs run import-orders
{"kind":"run.started","run":"01a1a5c2","at":"2026-11-04 14:02"}
{"kind":"step.failed","step":"validate","duration_ms":312}`

function Highlighted({
    code,
    language,
    mark,
}: {
    code: string
    language: string
    mark?: Record<number, 'added' | 'removed' | 'highlighted'>
}) {
    const lines = useHighlightedCode(code, language)
    return lines.map((line, at) => (
        <CodeBlockLine key={at} variant={mark?.[at + 1] ?? 'default'}>
            {line}
        </CodeBlockLine>
    ))
}

const meta: Meta = { title: 'Primitives/Code/CodeBlock', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Columns>
            <Stack gap="sm">
                <Caption>default</Caption>
                <CodeBlock>
                    <CodeBlockContent>{RUN}</CodeBlockContent>
                </CodeBlock>
            </Stack>
            <Stack gap="sm">
                <Caption>destructive</Caption>
                <CodeBlock variant="destructive">
                    <CodeBlockHeader>
                        <CodeBlockTitle>
                            <TriangleAlertIcon />
                            validate failed
                        </CodeBlockTitle>
                    </CodeBlockHeader>
                    <CodeBlockContent>{'.amount | type == "number" was false for 37 of 2,184 rows'}</CodeBlockContent>
                </CodeBlock>
            </Stack>
            <Stack gap="sm">
                <Caption>sm, with header and copy action</Caption>
                <CodeBlock size="sm">
                    <CodeBlockHeader>
                        <CodeBlockTitle>
                            <TerminalIcon />
                            Shell
                        </CodeBlockTitle>
                        <CodeBlockActions>
                            <CodeBlockCopyButton value={RUN} />
                        </CodeBlockActions>
                    </CodeBlockHeader>
                    <CodeBlockContent>{RUN}</CodeBlockContent>
                </CodeBlock>
            </Stack>
            <Stack gap="sm">
                <Caption>line numbers, footer</Caption>
                <CodeBlock>
                    <CodeBlockContent lineNumbers startLine={11}>
                        {'  validate:\n    uses: rows.check\n    with:\n      expression: .amount | type == "number"'}
                    </CodeBlockContent>
                    <CodeBlockFooter className="text-xs">YAML, lines 11 to 14</CodeBlockFooter>
                </CodeBlock>
            </Stack>
            <Stack gap="sm">
                <Caption>wrap</Caption>
                <CodeBlock>
                    <CodeBlockContent wrap>
                        {
                            'GET https://api.example.org/v1/orders/export?project=larkspur&month=2026-10&format=csv answered 200 with 2,184 rows, 37 invalid'
                        }
                    </CodeBlockContent>
                </CodeBlock>
            </Stack>
            <Stack gap="sm">
                <Caption>no wrap, scrolls sideways</Caption>
                <CodeBlock>
                    <CodeBlockContent>
                        {
                            'GET https://api.example.org/v1/orders/export?project=larkspur&month=2026-10&format=csv answered 200 with 2,184 rows, 37 invalid'
                        }
                    </CodeBlockContent>
                </CodeBlock>
            </Stack>
            <Stack gap="sm" className="md:col-span-2">
                <Caption>line variants: added, removed, highlighted</Caption>
                <CodeBlock>
                    <CodeBlockContent lineNumbers startLine={14}>
                        <CodeBlockLine>{'      input: ${{ steps.fetch.output }}'}</CodeBlockLine>
                        <CodeBlockLine variant="removed">{'      expression: .amount | type == "number"'}</CodeBlockLine>
                        <CodeBlockLine variant="added">{'      expression: .amount | tonumber? != null'}</CodeBlockLine>
                        <CodeBlockLine variant="highlighted">{'      message: amount is not a number in orders-2026-10.csv'}</CodeBlockLine>
                    </CodeBlockContent>
                </CodeBlock>
            </Stack>
        </Columns>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Columns>
            <Stack gap="sm">
                <Caption>empty</Caption>
                <CodeBlock>
                    <CodeBlockHeader>
                        <CodeBlockTitle>stdout</CodeBlockTitle>
                    </CodeBlockHeader>
                    <CodeBlockContent>{''}</CodeBlockContent>
                </CodeBlock>
            </Stack>
            <Stack gap="sm">
                <Caption>a language the highlighter does not know shows plain</Caption>
                <CodeBlock>
                    <CodeBlockContent>
                        <Highlighted code={'[validate]\nrules = "orders"\non_invalid = "fail"'} language="toml" />
                    </CodeBlockContent>
                </CodeBlock>
            </Stack>
        </Columns>
    ),
}

export const FailingStep: StoryObj = {
    render: () => (
        <div>
            <CodeBlock>
                <CodeBlockHeader>
                    <CodeBlockTitle>
                        <FileTextIcon />
                        jobs/import-orders.yaml
                    </CodeBlockTitle>
                    <CodeBlockActions>
                        <CodeBlockCopyButton value={JOB} />
                    </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent lineNumbers>
                    <Highlighted code={JOB} language="yaml" mark={{ 14: 'highlighted' }} />
                </CodeBlockContent>
                <CodeBlockFooter className="text-xs">The validate step stopped run 01a1a5c2 on line 14.</CodeBlockFooter>
            </CodeBlock>
        </div>
    ),
}
