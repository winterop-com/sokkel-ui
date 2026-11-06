import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bold, Pin, WrapText } from 'lucide-react'

import { Toggle } from '../../components/ui/toggle'
import { Row } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Actions/Toggle', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <>
            <Row gap="lg" align="end" wrap>
                {(['default', 'outline'] as const).map((variant) =>
                    (['sm', 'default', 'lg'] as const).map((size) => (
                        <Specimen key={`${variant}-${size}`} label={`${variant} ${size}`}>
                            <Toggle variant={variant} size={size} aria-label="Bold">
                                <Bold />
                            </Toggle>
                        </Specimen>
                    )),
                )}
            </Row>
            <Row gap="lg" align="end" wrap>
                <Specimen label="off">
                    <Toggle variant="outline">
                        <WrapText data-icon="inline-start" />
                        Wrap lines
                    </Toggle>
                </Specimen>
                <Specimen label="on">
                    <Toggle variant="outline" defaultPressed>
                        <WrapText data-icon="inline-start" />
                        Wrap lines
                    </Toggle>
                </Specimen>
            </Row>
        </>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="lg" align="stretch" wrap>
            <Specimen label="disabled">
                <Toggle variant="outline" disabled>
                    Wrap lines
                </Toggle>
            </Specimen>
            <Specimen label="disabled on">
                <Toggle variant="outline" disabled defaultPressed>
                    Wrap lines
                </Toggle>
            </Specimen>
            <Specimen label="invalid">
                <Toggle variant="outline" aria-invalid>
                    Wrap lines
                </Toggle>
            </Specimen>
        </Row>
    ),
}

export const LogToolbar: StoryObj = {
    render: () => (
        <div className="flex flex-col overflow-hidden rounded-lg border border-border">
            <Row justify="between" wrap className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium">Log for run 01a1a5c2</p>
                <Row gap="2xs" align="stretch" wrap>
                    <Toggle size="sm" defaultPressed>
                        <WrapText data-icon="inline-start" />
                        Wrap
                    </Toggle>
                    <Toggle size="sm">
                        <Pin data-icon="inline-start" />
                        Follow
                    </Toggle>
                </Row>
            </Row>
            <pre className="overflow-x-auto p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                {`2026-11-04 14:02:11 fetch    started
2026-11-04 14:02:11 fetch    GET https://api.example.org/v1/orders?month=2026-10
2026-11-04 14:02:11 fetch    failed after 0.3s: connection refused`}
            </pre>
        </div>
    ),
}
