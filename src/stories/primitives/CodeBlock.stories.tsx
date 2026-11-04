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
} from '../../components/ui/code-block'
import { useHighlightedCode } from '../../hooks/use-highlighted-code'

/**
 * Code on a bordered surface: a title, actions, numbered or wrapped lines, and lines marked
 * added, removed or highlighted. Highlighting comes from shiki and arrives once its grammar loads;
 * until then the lines show plain.
 */
function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const PIPELINE = `code: weather-gate
name: Weather gate
trigger: every-hour
steps:
  fetch:
    block: http.get
    with:
      connection: met-no
      path: /weatherapi/locationforecast/2.0/compact
  gate:
    block: jq.assert
    with:
      input: \${{ steps.fetch.output }}
      expression: .properties.timeseries | length > 0
      message: no forecast rows for station SN18700
  store:
    block: dhis2.data-values
    with:
      connection: dhis2-play
`

const RUN = `$ dg run weather-gate
{"kind":"run.started","run":"01a1a5c2","at":"2026-11-04 14:02"}
{"kind":"step.failed","step":"gate","duration_ms":312}`

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

const meta: Meta = { title: 'Primitives/Code/CodeBlock' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>default</Caption>
                    <CodeBlock>
                        <CodeBlockContent>{RUN}</CodeBlockContent>
                    </CodeBlock>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>destructive</Caption>
                    <CodeBlock variant="destructive">
                        <CodeBlockHeader>
                            <CodeBlockTitle>
                                <TriangleAlertIcon />
                                gate failed
                            </CodeBlockTitle>
                        </CodeBlockHeader>
                        <CodeBlockContent>.properties.timeseries | length &gt; 0 evaluated to false</CodeBlockContent>
                    </CodeBlock>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
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
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>line numbers, footer</Caption>
                    <CodeBlock>
                        <CodeBlockContent lineNumbers startLine={11}>
                            {'  gate:\n    block: jq.assert\n    with:\n      expression: .properties.timeseries | length > 0'}
                        </CodeBlockContent>
                        <CodeBlockFooter className="text-xs">YAML, lines 11 to 14</CodeBlockFooter>
                    </CodeBlock>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>wrap</Caption>
                    <CodeBlock>
                        <CodeBlockContent wrap>
                            {
                                'GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.94&lon=10.72&altitude=94 answered 200 with 0 timeseries rows'
                            }
                        </CodeBlockContent>
                    </CodeBlock>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>no wrap, scrolls sideways</Caption>
                    <CodeBlock>
                        <CodeBlockContent>
                            {
                                'GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.94&lon=10.72&altitude=94 answered 200 with 0 timeseries rows'
                            }
                        </CodeBlockContent>
                    </CodeBlock>
                </div>
                <div className="flex min-w-0 flex-col gap-2 md:col-span-2">
                    <Caption>line variants: added, removed, highlighted</Caption>
                    <CodeBlock>
                        <CodeBlockContent lineNumbers startLine={14}>
                            <CodeBlockLine>{'      input: ${{ steps.fetch.output }}'}</CodeBlockLine>
                            <CodeBlockLine variant="removed">{'      expression: .properties.timeseries | length > 0'}</CodeBlockLine>
                            <CodeBlockLine variant="added">{'      expression: .rows | length > 0'}</CodeBlockLine>
                            <CodeBlockLine variant="highlighted">{'      message: no forecast rows for station SN18700'}</CodeBlockLine>
                        </CodeBlockContent>
                    </CodeBlock>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>empty</Caption>
                    <CodeBlock>
                        <CodeBlockHeader>
                            <CodeBlockTitle>stdout</CodeBlockTitle>
                        </CodeBlockHeader>
                        <CodeBlockContent>{''}</CodeBlockContent>
                    </CodeBlock>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <Caption>a language the highlighter does not know shows plain</Caption>
                    <CodeBlock>
                        <CodeBlockContent>
                            <Highlighted code={'[gate]\nexpression = ".properties.timeseries | length > 0"'} language="toml" />
                        </CodeBlockContent>
                    </CodeBlock>
                </div>
            </div>
        </Ground>
    ),
}

export const FailingStep: StoryObj = {
    render: () => (
        <Ground>
            <div className="max-w-2xl">
                <CodeBlock>
                    <CodeBlockHeader>
                        <CodeBlockTitle>
                            <FileTextIcon />
                            pipelines/weather-gate.yaml
                        </CodeBlockTitle>
                        <CodeBlockActions>
                            <CodeBlockCopyButton value={PIPELINE} />
                        </CodeBlockActions>
                    </CodeBlockHeader>
                    <CodeBlockContent lineNumbers>
                        <Highlighted code={PIPELINE} language="yaml" mark={{ 14: 'highlighted' }} />
                    </CodeBlockContent>
                    <CodeBlockFooter className="text-xs">The gate step stopped run 01a1a5c2 on line 14.</CodeBlockFooter>
                </CodeBlock>
            </div>
        </Ground>
    ),
}
