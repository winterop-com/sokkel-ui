import { Link2 } from 'lucide-react'
import { Field } from '@winterop-com/sokkel-ui/Field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CopyButton } from '@winterop-com/sokkel-ui/CopyButton'
import { Segmented, type SegmentedVariant } from '@winterop-com/sokkel-ui/Segmented'
import { Card, CardContent, CardHeader, CardTitle } from '@winterop-com/sokkel-ui/primitives/card'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** The small controls a settings row or a code line carries: a segmented choice and a copy button. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <Stack gap="xl" className="max-w-5xl">
                {children}
            </Stack>
        </TooltipProvider>
    )
}

function ControlRow({
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
            <Stack gap="xs" className="w-full max-w-80">
                <Stack as="span" gap="none">
                    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                    {hint !== undefined && <span className="font-mono text-xs text-faint">{hint}</span>}
                </Stack>
                {children}
            </Stack>
        )
    }
    return (
        <Row gap="md" justify="between" wrap className="border-b border-border pb-4">
            <Stack gap="none">
                <span className="text-sm font-medium">{label}</span>
                {hint !== undefined && <span className="font-mono text-xs text-faint">{hint}</span>}
            </Stack>
            {fill ? <div className="w-full sm:w-56">{children}</div> : children}
        </Row>
    )
}

function Settings({ fill, variant, stacked = false }: { fill: boolean; variant: SegmentedVariant; stacked?: boolean }) {
    const [scheme, setScheme] = useState<'system' | 'light' | 'dark'>('system')
    const [clock, setClock] = useState<'utc' | 'local'>('utc')
    const [density, setDensity] = useState<'regular' | 'compact'>('regular')
    return (
        <Stack gap="lg">
            <ControlRow stacked={stacked} fill={fill} label="Appearance">
                <Segmented
                    fill={fill}
                    variant={variant}
                    label="Appearance"
                    value={scheme}
                    onValueChange={setScheme}
                    options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                    ]}
                />
            </ControlRow>
            <ControlRow stacked={stacked} fill={fill} label="Schedule clock" hint="schedule.timezone">
                <Segmented
                    fill={fill}
                    variant={variant}
                    label="Schedule clock"
                    value={clock}
                    onValueChange={setClock}
                    options={[
                        { value: 'utc', label: 'UTC' },
                        { value: 'local', label: 'Server time' },
                    ]}
                />
            </ControlRow>
            <ControlRow stacked={stacked} fill={fill} label="Density" hint="disabled">
                <Segmented
                    fill={fill}
                    variant={variant}
                    label="Density"
                    value={density}
                    onValueChange={setDensity}
                    disabled
                    options={[
                        { value: 'regular', label: 'Regular' },
                        { value: 'compact', label: 'Compact' },
                    ]}
                />
            </ControlRow>
        </Stack>
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
            <Columns count={2} min="xl" gap="3xl" rowGap="2xl">
                {VARIANTS.map((entry, index) => (
                    <Stack key={entry.variant} as="section">
                        <div>
                            <h3 className="text-sm font-medium">
                                {String.fromCharCode(65 + index)}. {entry.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">{entry.from}</p>
                        </div>
                        <Settings fill={false} variant={entry.variant} />
                    </Stack>
                ))}
            </Columns>
        </Ground>
    )
}

function SegmentedStacked() {
    return (
        <Ground>
            <p className="text-xs text-muted-foreground">Labels above, each control the column's width, up to 320px.</p>
            <Columns count={4} min="sm" gap="3xl" rowGap="2xl">
                {VARIANTS.map((entry, index) => (
                    <Stack key={entry.variant} as="section">
                        <h3 className="text-sm font-medium">
                            {String.fromCharCode(65 + index)}. {entry.name}
                        </h3>
                        <Settings fill stacked variant={entry.variant} />
                    </Stack>
                ))}
            </Columns>
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

function SegmentedOff() {
    const [region, setRegion] = useState<'europe' | 'americas' | 'asia' | 'oceania'>('europe')
    return (
        <Ground>
            <Segmented
                label="Region"
                value={region}
                onValueChange={setRegion}
                options={[
                    { value: 'europe', label: 'Europe' },
                    { value: 'americas', label: 'Americas' },
                    { value: 'asia', label: 'Asia', disabled: true, hint: 'No sites in Asia yet' },
                    { value: 'oceania', label: 'Oceania', disabled: true, hint: 'The Oceania sites are paused' },
                ]}
            />
        </Ground>
    )
}

const STEPS = [
    { value: 'all', label: 'All' },
    { value: 'fetch', label: 'Fetch' },
    { value: 'transform', label: 'Transform' },
    { value: 'validate', label: 'Validate' },
    { value: 'upload', label: 'Upload' },
    { value: 'notify', label: 'Notify' },
    { value: 'retry', label: 'Retry' },
    { value: 'cleanup', label: 'Clean up' },
] as const

function SegmentedWrapping() {
    const [step, setStep] = useState<(typeof STEPS)[number]['value']>('transform')
    return (
        <Ground>
            <Columns count={3} min="lg" gap="lg">
                {(['track', 'outline', 'solid'] as const).map((variant) => (
                    <Card key={variant}>
                        <CardHeader>
                            <CardTitle>Step</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Segmented fill variant={variant} label="Step" value={step} onValueChange={setStep} options={STEPS} />
                        </CardContent>
                    </Card>
                ))}
            </Columns>
        </Ground>
    )
}

function SegmentedInForm() {
    const [on, setOn] = useState<'success' | 'failure' | 'always'>('failure')
    return (
        <Ground>
            <Field id="notify-on" label="Notify on">
                <Segmented
                    id="notify-on"
                    size="md"
                    label="Notify on"
                    value={on}
                    onValueChange={setOn}
                    options={[
                        { value: 'success', label: 'Success' },
                        { value: 'failure', label: 'Failure' },
                        { value: 'always', label: 'Every run' },
                    ]}
                />
            </Field>
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
                    <Row key={line.label} gap="md" className="border-b border-border px-3 py-1.5 last:border-b-0">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">{line.label}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-sm">{line.value}</span>
                        <CopyButton value={line.value} />
                    </Row>
                ))}
            </div>
            <Row gap="md">
                <CopyButton value="xs" size="icon-xs" />
                <CopyButton value="sm" size="icon-sm" />
                <CopyButton value="md" size="icon" />
                <CopyButton
                    value="https://tidevann.example.org/harbor"
                    showLabel
                    icon={<Link2 aria-hidden />}
                    words={{ copy: 'Copy link', copied: 'Copied' }}
                />
            </Row>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Controls', parameters: { frame: 'padded' } }
export default meta

/** Every prop of a segmented control, to try live. */
export const Playground: StoryObj<{ variant: SegmentedVariant; size: 'sm' | 'md'; fill: boolean; disabled: boolean; options: number }> = {
    parameters: { controls: { disable: false } },
    args: { variant: 'track', size: 'sm', fill: false, disabled: false, options: 3 },
    argTypes: {
        variant: { control: 'inline-radio', options: ['track', 'tint', 'outline', 'solid'] },
        size: { control: 'inline-radio', options: ['sm', 'md'] },
        options: { control: { type: 'range', min: 2, max: 5 } },
    },
    render: (args) => {
        const all = [
            { value: 'hour', label: 'Hour' },
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
        ]
        return (
            <div className="w-full max-w-80">
                <Segmented
                    label="Period"
                    value="day"
                    onValueChange={() => undefined}
                    options={all.slice(0, args.options)}
                    variant={args.variant}
                    size={args.size}
                    fill={args.fill}
                    disabled={args.disabled}
                />
            </div>
        )
    },
}

export const SegmentedVariants: StoryObj = { name: 'Segmented, options', render: () => <SegmentedOptions /> }
export const SegmentedStackedLayout: StoryObj = { name: 'Segmented, stacked', render: () => <SegmentedStacked /> }
export const SegmentedAligned: StoryObj = { name: 'Segmented, aligned', render: () => <SegmentedSettings fill /> }
export const SegmentedChoice: StoryObj = { name: 'Segmented, natural width', render: () => <SegmentedSettings fill={false} /> }
/** Two options off on their own, each with a tooltip on hover and focus that says why. */
export const SegmentedOffOptions: StoryObj = { name: 'Segmented, off options', render: () => <SegmentedOff /> }
/** Eight options in cards a third of the width: they wrap onto more lines rather than overflow, each line shared out evenly. */
export const SegmentedWrap: StoryObj = { name: 'Segmented, wrapping', render: () => <SegmentedWrapping /> }
export const SegmentedField: StoryObj = { name: 'Form field', render: () => <SegmentedInForm /> }
export const Copy: StoryObj = { name: 'Copy button', render: () => <CopyLines /> }
