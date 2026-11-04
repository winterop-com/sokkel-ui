import type { Meta, StoryObj } from '@storybook/react-vite'
import { Loader2, MoreHorizontal, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../../components/ui/button'

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

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
const SIZES = ['xs', 'sm', 'default', 'lg'] as const
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const

const meta: Meta = { title: 'Primitives/Actions/Button' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-3">
                {VARIANTS.map((variant) => (
                    <Labeled key={variant} label={variant}>
                        <Button variant={variant}>Run now</Button>
                    </Labeled>
                ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
                {SIZES.map((size) => (
                    <Labeled key={size} label={size}>
                        <Button size={size}>Run now</Button>
                    </Labeled>
                ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
                {ICON_SIZES.map((size) => (
                    <Labeled key={size} label={size}>
                        <Button size={size} variant="outline" aria-label="More actions">
                            <MoreHorizontal />
                        </Button>
                    </Labeled>
                ))}
            </div>
            <div className="flex flex-wrap gap-3">
                <Labeled label="icon inline-start">
                    <Button>
                        <Play data-icon="inline-start" />
                        Run now
                    </Button>
                </Labeled>
                <Labeled label="icon inline-end">
                    <Button variant="outline">
                        New pipeline
                        <Plus data-icon="inline-end" />
                    </Button>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-3">
                <Labeled label="disabled">
                    <Button disabled>Run now</Button>
                </Labeled>
                <Labeled label="disabled outline">
                    <Button variant="outline" disabled>
                        Retry
                    </Button>
                </Labeled>
                <Labeled label="invalid">
                    <Button variant="outline" aria-invalid>
                        Apply
                    </Button>
                </Labeled>
                <Labeled label="loading">
                    <Button disabled>
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                        Starting run
                    </Button>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const RunActions: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Weather gate</p>
                        <p className="font-mono text-xs text-muted-foreground">weather-gate</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm">
                            <RotateCcw data-icon="inline-start" />
                            Retry failed
                        </Button>
                        <Button variant="outline" size="sm">
                            Edit
                        </Button>
                        <Button size="sm">
                            <Play data-icon="inline-start" />
                            Run now
                        </Button>
                        <Button variant="destructive" size="icon-sm" aria-label="Delete pipeline">
                            <Trash2 />
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Last run failed at 2026-11-04 14:02 after 0.3s. The fetch step could not reach dhis2-play.
                </p>
            </div>
        </Ground>
    ),
}
