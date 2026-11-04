import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleCheck, Clock, Repeat } from 'lucide-react'

import { Badge } from '../../components/ui/badge'

const meta: Meta = { title: 'Primitives/Display/Badge' }
export default meta

/** Every prop of a badge, to try live. */
export const Playground: StoryObj<{ label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' }> = {
    parameters: { controls: { disable: false } },
    args: { label: 'nightly', variant: 'secondary' },
    argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] } },
    render: (args) => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <Badge variant={args.variant}>{args.label}</Badge>
        </div>
    ),
}

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            {children}
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}

const VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                {VARIANTS.map((variant) => (
                    <Labeled key={variant} label={variant}>
                        <Badge variant={variant}>csv</Badge>
                    </Labeled>
                ))}
            </div>
            <div className="flex flex-wrap gap-6">
                <Labeled label="icon start">
                    <Badge variant="secondary">
                        <Repeat data-icon="inline-start" />
                        nightly
                    </Badge>
                </Labeled>
                <Labeled label="icon end">
                    <Badge variant="outline">
                        pinned
                        <Clock data-icon="inline-end" />
                    </Badge>
                </Labeled>
                <Labeled label="as a link">
                    <Badge render={<a href="#" />}>larkspur</Badge>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="invalid">
                    <Badge variant="outline" aria-invalid>
                        unknown-format
                    </Badge>
                </Labeled>
                <Labeled label="long text">
                    <Badge variant="secondary">a-very-long-project-code-for-a-test</Badge>
                </Labeled>
            </div>
        </Ground>
    ),
}

const TONE: Record<string, string> = {
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
    running: 'bg-status-running/15 text-status-running-ink',
    queued: 'bg-status-queued/15 text-status-queued-ink',
    cancelled: 'bg-status-cancelled/15 text-status-cancelled-ink',
}

export const JobTags: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">nightly-export</span>
                    <Badge className={TONE.succeeded}>
                        <CircleCheck data-icon="inline-start" />
                        succeeded
                    </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">larkspur</Badge>
                    <Badge variant="outline">csv</Badge>
                    <Badge variant="secondary">
                        <Repeat data-icon="inline-start" />
                        every night at 02:00
                    </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {Object.keys(TONE).map((state) => (
                        <Badge key={state} className={TONE[state]}>
                            {state}
                        </Badge>
                    ))}
                </div>
            </div>
        </Ground>
    ),
}
