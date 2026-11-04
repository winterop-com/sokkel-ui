import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CopyButton } from '../../components/CopyButton'
import { Segmented, type SegmentedVariant } from '../../components/Segmented'
import { TooltipProvider } from '../../components/ui/tooltip'

/** The small controls a settings row or a code line carries: a segmented choice and a copy button. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <div className="flex max-w-5xl flex-col gap-6">{children}</div>
            </div>
        </TooltipProvider>
    )
}

function Row({
    label,
    hint,
    fill,
    stacked = false,
    children,
}: {
    label: string
    hint?: string
    fill: boolean
    stacked?: boolean
    children: React.ReactNode
}) {
    if (stacked) {
        return (
            <div className="flex w-full max-w-80 flex-col gap-1.5">
                <span className="flex flex-col">
                    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                    {hint !== undefined && <span className="font-mono text-xs text-faint">{hint}</span>}
                </span>
                {children}
            </div>
        )
    }
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                {hint !== undefined && <span className="font-mono text-xs text-faint">{hint}</span>}
            </div>
            {fill ? <div className="w-full sm:w-56">{children}</div> : children}
        </div>
    )
}

function Settings({ fill, variant, stacked = false }: { fill: boolean; variant: SegmentedVariant; stacked?: boolean }) {
    const [scheme, setScheme] = useState<'system' | 'light' | 'dark'>('system')
    const [clock, setClock] = useState<'utc' | 'local'>('utc')
    const [density, setDensity] = useState<'regular' | 'compact'>('regular')
    return (
        <div className="flex flex-col gap-4">
            <Row stacked={stacked} fill={fill} label="Appearance">
                <Segmented
                    fill={fill}
                    variant={variant}
                    label="Appearance"
                    value={scheme}
                    onChoose={setScheme}
                    options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                    ]}
                />
            </Row>
            <Row stacked={stacked} fill={fill} label="Schedule clock" hint="schedule.timezone">
                <Segmented
                    fill={fill}
                    variant={variant}
                    label="Schedule clock"
                    value={clock}
                    onChoose={setClock}
                    options={[
                        { value: 'utc', label: 'UTC' },
                        { value: 'local', label: 'Server time' },
                    ]}
                />
            </Row>
            <Row stacked={stacked} fill={fill} label="Density" hint="disabled">
                <Segmented
                    fill={fill}
                    variant={variant}
                    label="Density"
                    value={density}
                    onChoose={setDensity}
                    disabled
                    options={[
                        { value: 'regular', label: 'Regular' },
                        { value: 'compact', label: 'Compact' },
                    ]}
                />
            </Row>
        </div>
    )
}

const VARIANTS: { variant: SegmentedVariant; name: string; from: string }[] = [
    {
        variant: 'track',
        name: 'Track and thumb (default)',
        from: 'as the Tabs primitive, Apple, Radix Themes, GitHub Primer and Vercel draw it',
    },
    { variant: 'tint', name: 'Tint', from: 'no frame, the chosen option on an accent tint' },
    { variant: 'outline', name: 'Outline, neutral', from: 'a bordered group with dividers, as the shadcn toggle group' },
    { variant: 'solid', name: 'Solid accent', from: 'the chosen option filled with the accent' },
]

function SegmentedOptions() {
    return (
        <Ground>
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
                {VARIANTS.map((entry, index) => (
                    <section key={entry.variant} className="flex flex-col gap-3">
                        <div>
                            <h3 className="text-sm font-medium">
                                {String.fromCharCode(65 + index)}. {entry.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">{entry.from}</p>
                        </div>
                        <Settings fill={false} variant={entry.variant} />
                    </section>
                ))}
            </div>
        </Ground>
    )
}

function SegmentedStacked() {
    return (
        <Ground>
            <p className="text-xs text-muted-foreground">Labels above, each control the column's width, up to 320px.</p>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {VARIANTS.map((entry, index) => (
                    <section key={entry.variant} className="flex flex-col gap-3">
                        <h3 className="text-sm font-medium">
                            {String.fromCharCode(65 + index)}. {entry.name}
                        </h3>
                        <Settings fill stacked variant={entry.variant} />
                    </section>
                ))}
            </div>
        </Ground>
    )
}

function SegmentedSettings({ fill }: { fill: boolean }) {
    return (
        <Ground>
            <Settings fill={fill} variant="track" />
        </Ground>
    )
}

function SegmentedInForm() {
    const [on, setOn] = useState<'success' | 'failure' | 'always'>('failure')
    return (
        <Ground>
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Notify on</span>
                <Segmented
                    size="md"
                    label="Notify on"
                    value={on}
                    onChoose={setOn}
                    options={[
                        { value: 'success', label: 'Success' },
                        { value: 'failure', label: 'Failure' },
                        { value: 'always', label: 'Every run' },
                    ]}
                />
            </div>
        </Ground>
    )
}

function CopyLines() {
    const lines = [
        { label: 'Run', value: 'run_01JCF8Q2T7W4M3' },
        { label: 'Webhook', value: 'https://example.org/hooks/nightly-export' },
        { label: 'Trace', value: '4bf92f3577b34da6a3ce929d0e0e4736' },
    ]
    return (
        <Ground>
            <div className="overflow-hidden rounded-surface border border-border-strong bg-card">
                {lines.map((line) => (
                    <div key={line.label} className="flex items-center gap-3 border-b border-border px-3 py-1.5 last:border-b-0">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">{line.label}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-sm">{line.value}</span>
                        <CopyButton value={line.value} />
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-3">
                <CopyButton value="xs" size="icon-xs" />
                <CopyButton value="sm" size="icon-sm" />
                <CopyButton value="md" size="icon" />
            </div>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Controls' }
export default meta

export const SegmentedVariants: StoryObj = { name: 'Segmented, options', render: () => <SegmentedOptions /> }
export const SegmentedStackedLayout: StoryObj = { name: 'Segmented, stacked', render: () => <SegmentedStacked /> }
export const SegmentedAligned: StoryObj = { name: 'Segmented, aligned', render: () => <SegmentedSettings fill /> }
export const SegmentedChoice: StoryObj = { name: 'Segmented, natural width', render: () => <SegmentedSettings fill={false} /> }
export const SegmentedField: StoryObj = { name: 'Segmented in a form', render: () => <SegmentedInForm /> }
export const Copy: StoryObj = { name: 'Copy button', render: () => <CopyLines /> }
