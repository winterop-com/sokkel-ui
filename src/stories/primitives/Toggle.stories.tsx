import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bold, Pin, WrapText } from 'lucide-react'
import type { ReactNode } from 'react'

import { Toggle } from '../../components/ui/toggle'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Actions/Toggle' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-4">
                {(['default', 'outline'] as const).map((variant) =>
                    (['sm', 'default', 'lg'] as const).map((size) => (
                        <Labeled key={`${variant}-${size}`} label={`${variant} ${size}`}>
                            <Toggle variant={variant} size={size} aria-label="Bold">
                                <Bold />
                            </Toggle>
                        </Labeled>
                    )),
                )}
            </div>
            <div className="flex flex-wrap items-end gap-4">
                <Labeled label="off">
                    <Toggle variant="outline">
                        <WrapText data-icon="inline-start" />
                        Wrap lines
                    </Toggle>
                </Labeled>
                <Labeled label="on">
                    <Toggle variant="outline" defaultPressed>
                        <WrapText data-icon="inline-start" />
                        Wrap lines
                    </Toggle>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-4">
                <Labeled label="disabled">
                    <Toggle variant="outline" disabled>
                        Wrap lines
                    </Toggle>
                </Labeled>
                <Labeled label="disabled on">
                    <Toggle variant="outline" disabled defaultPressed>
                        Wrap lines
                    </Toggle>
                </Labeled>
                <Labeled label="invalid">
                    <Toggle variant="outline" aria-invalid>
                        Wrap lines
                    </Toggle>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const LogToolbar: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col overflow-hidden rounded-lg border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                    <p className="text-sm font-medium">Log for run 01a1a5c2</p>
                    <div className="flex flex-wrap gap-1">
                        <Toggle size="sm" defaultPressed>
                            <WrapText data-icon="inline-start" />
                            Wrap
                        </Toggle>
                        <Toggle size="sm">
                            <Pin data-icon="inline-start" />
                            Follow
                        </Toggle>
                    </div>
                </div>
                <pre className="overflow-x-auto p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                    {`2026-11-04 14:02:11 fetch    started
2026-11-04 14:02:11 fetch    GET https://play.dhis2.org/api/dataValueSets
2026-11-04 14:02:11 fetch    failed after 0.3s: connection refused`}
                </pre>
            </div>
        </Ground>
    ),
}
