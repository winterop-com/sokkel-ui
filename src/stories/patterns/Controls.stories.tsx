import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CopyButton } from '../../components/CopyButton'
import { Segmented } from '../../components/Segmented'
import { TooltipProvider } from '../../components/ui/tooltip'

/** The small controls a settings row or a code line carries: a segmented choice and a copy button. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <div className="min-h-svh bg-background p-6 text-foreground">
                <div className="flex max-w-3xl flex-col gap-6">{children}</div>
            </div>
        </TooltipProvider>
    )
}

function Row({ label, hint, fill, children }: { label: string; hint?: string; fill: boolean; children: React.ReactNode }) {
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

function SegmentedSettings({ fill }: { fill: boolean }) {
    const [scheme, setScheme] = useState<'system' | 'light' | 'dark'>('system')
    const [clock, setClock] = useState<'utc' | 'local'>('utc')
    const [density, setDensity] = useState<'regular' | 'compact'>('regular')
    return (
        <Ground>
            <Row fill={fill} label="Appearance">
                <Segmented
                    fill={fill}
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
            <Row fill={fill} label="Schedule clock" hint="schedule.timezone">
                <Segmented
                    fill={fill}
                    label="Schedule clock"
                    value={clock}
                    onChoose={setClock}
                    options={[
                        { value: 'utc', label: 'UTC' },
                        { value: 'local', label: 'Server time' },
                    ]}
                />
            </Row>
            <Row fill={fill} label="Density">
                <Segmented
                    fill={fill}
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
        { label: 'Webhook', value: 'https://dirigent.example.org/hooks/weather-gate' },
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

export const SegmentedAligned: StoryObj = { name: 'Segmented, aligned', render: () => <SegmentedSettings fill /> }
export const SegmentedChoice: StoryObj = { name: 'Segmented, natural width', render: () => <SegmentedSettings fill={false} /> }
export const SegmentedField: StoryObj = { name: 'Segmented in a form', render: () => <SegmentedInForm /> }
export const Copy: StoryObj = { name: 'Copy button', render: () => <CopyLines /> }
