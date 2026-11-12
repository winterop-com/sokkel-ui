import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { useUnsavedChanges } from '@winterop-com/sokkel-ui/UnsavedChanges'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { TimeControls } from './controls'
import { dashboards } from './data'
import { ColorInput, ColorSelect, SelectInput } from './inputs'
import { type Dashboard, type GroupBy, KINDS, newPanel, type Panel, type PanelKind, REDUCES, type Reduce, SPANS } from './model'
import { PanelView } from './PanelView'
import { go } from './place'
import { bounds, spanOf, PRESETS } from './query'
import { type Aggregation, labelsOf, METRICS, metricOf, type MetricId, PROJECTS, SERVICES } from './source'
import type { View } from './view'

const UNITS = [
    { value: 'auto', label: 'The metric’s own' },
    { value: '', label: 'None' },
    { value: '%', label: 'Percent (%)' },
    { value: ' ms', label: 'Milliseconds (ms)' },
    { value: ' s', label: 'Seconds (s)' },
    { value: ' req/s', label: 'Requests per second' },
    { value: ' GB', label: 'Gigabytes (GB)' },
]

const DECIMALS = [
    { value: 'auto', label: 'Auto' },
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
]

const AGGREGATION_LABELS: Record<Aggregation, string> = { sum: 'Sum', avg: 'Mean', max: 'Max', min: 'Min' }
const GROUP_LABELS: Record<GroupBy, string> = { none: 'None', service: 'Service', host: 'Host', project: 'Project', job: 'Job' }

/** The thresholds' rows: the base color for everything below the first step, then each step from its value up. */
function ThresholdsInput({ value, onChange, unit }: { value: Threshold[]; onChange: (next: Threshold[]) => void; unit: string }) {
    const set = (index: number, patch: Partial<Threshold>) =>
        onChange(value.map((step, at) => (at === index ? { ...step, ...patch } : step)))
    const add = () => {
        if (value.length === 0) {
            onChange([{ color: 'good' }, { value: 80, color: 'critical' }])
            return
        }
        const last = value[value.length - 1]?.value ?? 0
        onChange([...value, { value: last + 10, color: 'critical' }])
    }
    return (
        <Stack gap="sm">
            {value.map((step, index) => (
                <Row key={index} gap="sm" align="center">
                    <ColorSelect
                        id={`threshold-${String(index)}`}
                        label={`Color of step ${String(index + 1)}`}
                        value={step.color}
                        onChange={(color) => set(index, { color })}
                    />
                    {index === 0 ? (
                        <span className="flex-1 text-sm text-muted-foreground">Base, below every step</span>
                    ) : (
                        <NumberField
                            id={`threshold-value-${String(index)}`}
                            label={`From, step ${String(index + 1)}`}
                            value={step.value ?? 0}
                            onValueChange={(next) => set(index, { value: next ?? 0 })}
                            suffix={unit.trim()}
                            className="flex-1"
                        />
                    )}
                    <IconButton
                        label={index === 0 ? 'Remove every step' : `Remove step ${String(index + 1)}`}
                        size="icon-sm"
                        onClick={() => onChange(index === 0 ? [] : value.filter((_, at) => at !== index))}
                    >
                        <Trash2 />
                    </IconButton>
                </Row>
            ))}
            <div>
                <Button variant="outline" size="sm" onClick={add}>
                    <Plus aria-hidden />
                    {value.length === 0 ? 'Add thresholds' : 'Add step'}
                </Button>
            </div>
        </Stack>
    )
}

/** What the preview reads, in a sentence: the metric, how its series combine, the range and its steps. */
function readsLine(panel: Panel, view: View): string {
    const metric = metricOf(panel.metric)
    if (panel.kind === 'logs') return 'The newest lines the hosts wrote in the range, under the variables and the panel’s filter.'
    const span = spanOf(view.range, view.at)
    const { start, end } = bounds(view.range, view.at)
    const chosen = view.range
    const preset = 'preset' in chosen ? PRESETS.find((one) => one.id === chosen.preset)?.label : undefined
    const range = preset?.toLowerCase() ?? `${String(Math.round((end - start) / 60))} minutes`
    const group = panel.groupBy === 'none' || panel.kind === 'stat' || panel.kind === 'gauge' ? '' : ` by ${panel.groupBy}`
    // A name in capitals, such as CPU, keeps them.
    const name = /^[A-Z][a-z]/.test(metric.label) ? metric.label.toLowerCase() : metric.label
    return `Reads ${name}, ${AGGREGATION_LABELS[panel.aggregation].toLowerCase()}${group}, over the ${range} in ${String(span.times.length)} steps of ${String(span.step)}s.`
}

/** Editing one panel, or making a new one: the options beside a live preview that moves with the source, saved back to the dashboard. */
export function EditorPage({
    dashboard,
    panelId,
    view,
    kept,
}: {
    dashboard: Dashboard
    panelId: string | undefined
    view: View
    kept: URLSearchParams
}) {
    const original = panelId === undefined ? undefined : dashboard.panels.find((panel) => panel.id === panelId)
    const [draft, setDraft] = useState<Panel>(() => original ?? newPanel())
    const [saving, setSaving] = useState(false)
    const dirty = original === undefined || JSON.stringify(draft) !== JSON.stringify(original)
    const guard = useUnsavedChanges(dirty && !saving, { hashRoutes: true })
    const back = (focus?: string) => {
        const params = new URLSearchParams(kept)
        if (focus !== undefined) params.set('focus', focus)
        go(`/d/${dashboard.id}`, params)
    }
    const leave = () => {
        if (!dirty) {
            back()
            return
        }
        void guard.confirmLeave().then((ok) => {
            if (ok) back()
        })
    }

    if (panelId !== undefined && original === undefined) {
        return (
            <Page>
                <PageState loading={false} error={`${dashboard.title} has no panel \`${panelId}\`. It may have been deleted.`}>
                    {null}
                </PageState>
                <div>
                    <Button variant="outline" size="sm" onClick={() => back()}>
                        Back to {dashboard.title}
                    </Button>
                </div>
            </Page>
        )
    }

    const metric = metricOf(draft.metric)
    const set = (patch: Partial<Panel>) => setDraft((current) => ({ ...current, ...patch }))
    const setMetric = (id: MetricId) => {
        const next = metricOf(id)
        const groups = labelsOf(next)
        set({
            metric: id,
            aggregation: next.aggregations.includes(draft.aggregation) ? draft.aggregation : (next.aggregations[0] ?? 'avg'),
            groupBy: draft.groupBy === 'none' || groups.includes(draft.groupBy) ? draft.groupBy : 'none',
        })
    }
    const kind = draft.kind
    const one = kind === 'stat' || kind === 'gauge'
    const logs = kind === 'logs'
    const unit = draft.unit ?? metric.unit
    const title = draft.title.trim()

    const save = () => {
        if (title === '') return
        setSaving(true)
        const panel = { ...draft, title }
        const panels =
            original === undefined ? [...dashboard.panels, panel] : dashboard.panels.map((one) => (one.id === panel.id ? panel : one))
        void dashboards.update(dashboard.id, { panels }).then(() => {
            toast.success(`${panel.title} saved to ${dashboard.title}`)
            back(panel.id)
        })
    }

    // Each pane's one block fills it, and the pane scrolls what runs past.
    const preview = (
        <div>
            <Stack gap="md" className="p-1">
                <Toolbar variant="pane" end={<TimeControls view={view} />} />
                <PanelView
                    panel={draft}
                    vars={view.vars}
                    range={view.range}
                    at={view.at}
                    zone={view.zone}
                    loading={view.refreshing}
                    preview
                />
                <p className="text-xs text-muted-foreground">{readsLine(draft, view)}</p>
            </Stack>
        </div>
    )

    const options = (
        <div>
            <Stack gap="lg" className="p-1">
                <Section title="Panel">
                    <Stack gap="md">
                        <TextField
                            id="panel-title"
                            label="Title"
                            value={draft.title}
                            onChange={(value) => set({ title: value })}
                            error={title === '' ? 'A panel needs a title.' : null}
                        />
                        <Field id="panel-kind" label="Visualization">
                            <Segmented<PanelKind>
                                id="panel-kind"
                                label="Visualization"
                                fill
                                value={kind}
                                onValueChange={(value) => set({ kind: value })}
                                options={KINDS}
                            />
                        </Field>
                        <Field
                            id="panel-span"
                            label="Width"
                            description="Of the dashboard’s width on a wide screen; panels stack on a phone."
                        >
                            <Segmented
                                id="panel-span"
                                label="Width"
                                fill
                                value={draft.span}
                                onValueChange={(value) => set({ span: value })}
                                options={SPANS}
                            />
                        </Field>
                    </Stack>
                </Section>
                <Section title="Query">
                    <Stack gap="md">
                        {!logs && (
                            <Field id="panel-metric" label="Metric" help={metric.description}>
                                <SelectInput
                                    id="panel-metric"
                                    value={draft.metric}
                                    onChange={(value) => setMetric(value as MetricId)}
                                    options={METRICS.map((one) => ({ value: one.id, label: one.label }))}
                                />
                            </Field>
                        )}
                        {!logs && (
                            <Field id="panel-aggregation" label="Aggregation" description="How the series in a group combine at each step.">
                                <Segmented<Aggregation>
                                    id="panel-aggregation"
                                    label="Aggregation"
                                    fill
                                    value={draft.aggregation}
                                    onValueChange={(value) => set({ aggregation: value })}
                                    options={metric.aggregations.map((value) => ({ value, label: AGGREGATION_LABELS[value] }))}
                                />
                            </Field>
                        )}
                        {!logs && !one && (
                            <Field id="panel-group" label="Group by" description="One series for each, or one for all.">
                                <Segmented<GroupBy>
                                    id="panel-group"
                                    label="Group by"
                                    fill
                                    value={draft.groupBy}
                                    onValueChange={(value) => set({ groupBy: value })}
                                    options={(['none', ...labelsOf(metric)] as GroupBy[]).map((value) => ({
                                        value,
                                        label: GROUP_LABELS[value],
                                    }))}
                                />
                            </Field>
                        )}
                        {(one || kind === 'bargauge') && (
                            <Field id="panel-reduce" label="Value" description="How each series over the range reads as one value.">
                                <Segmented<Reduce>
                                    id="panel-reduce"
                                    label="Value"
                                    fill
                                    value={draft.reduce}
                                    onValueChange={(value) => set({ reduce: value })}
                                    options={REDUCES}
                                />
                            </Field>
                        )}
                        <Row gap="sm" wrap>
                            <Field id="panel-service" label="Service" className="min-w-40 flex-1">
                                <SelectInput
                                    id="panel-service"
                                    value={draft.filter.service ?? 'all'}
                                    onChange={(value) => set({ filter: { ...draft.filter, service: value === 'all' ? undefined : value } })}
                                    options={[
                                        { value: 'all', label: 'Any service' },
                                        ...SERVICES.map((value) => ({ value, label: value })),
                                    ]}
                                />
                            </Field>
                            <Field id="panel-project" label="Project" className="min-w-40 flex-1">
                                <SelectInput
                                    id="panel-project"
                                    value={draft.filter.project ?? 'all'}
                                    onChange={(value) => set({ filter: { ...draft.filter, project: value === 'all' ? undefined : value } })}
                                    options={[
                                        { value: 'all', label: 'Any project' },
                                        ...PROJECTS.map((value) => ({ value, label: value })),
                                    ]}
                                />
                            </Field>
                        </Row>
                    </Stack>
                </Section>
                {!logs && (
                    <Section title="Display">
                        <Stack gap="md">
                            <Field id="panel-unit" label="Unit">
                                <SelectInput
                                    id="panel-unit"
                                    value={draft.unit ?? 'auto'}
                                    onChange={(value) => set({ unit: value === 'auto' ? null : value })}
                                    options={UNITS}
                                />
                            </Field>
                            <Field id="panel-decimals" label="Decimals">
                                <Segmented
                                    id="panel-decimals"
                                    label="Decimals"
                                    fill
                                    value={draft.decimals === null ? 'auto' : String(draft.decimals)}
                                    onValueChange={(value) => set({ decimals: value === 'auto' ? null : Number(value) })}
                                    options={DECIMALS}
                                />
                            </Field>
                            {kind === 'timeseries' && (
                                <Field id="panel-fill" label="Fill">
                                    <Segmented
                                        id="panel-fill"
                                        label="Fill"
                                        fill
                                        value={draft.fill}
                                        onValueChange={(value) => set({ fill: value })}
                                        options={[
                                            { value: 'none', label: 'Lines' },
                                            { value: 'gradient', label: 'Fading' },
                                            { value: 'solid', label: 'Solid' },
                                        ]}
                                    />
                                </Field>
                            )}
                            {(kind === 'timeseries' || kind === 'bar') && (
                                <SwitchField
                                    id="panel-stacked"
                                    label="Stack the series"
                                    checked={draft.stacked}
                                    onCheckedChange={(stacked) => set({ stacked })}
                                />
                            )}
                            {kind === 'stat' && (
                                <Field id="panel-color-mode" label="Threshold color on">
                                    <Segmented
                                        id="panel-color-mode"
                                        label="Threshold color on"
                                        fill
                                        value={draft.colorMode}
                                        onValueChange={(value) => set({ colorMode: value })}
                                        options={[
                                            { value: 'value', label: 'The value' },
                                            { value: 'background', label: 'The tile' },
                                            { value: 'none', label: 'Neither' },
                                        ]}
                                    />
                                </Field>
                            )}
                            {(kind === 'gauge' || kind === 'bargauge') && (
                                <Row gap="sm" wrap>
                                    <NumberField
                                        id="panel-min"
                                        label="Min"
                                        value={draft.min}
                                        onValueChange={(value) => set({ min: value ?? 0 })}
                                        suffix={unit.trim()}
                                        className="min-w-32 flex-1"
                                    />
                                    <NumberField
                                        id="panel-max"
                                        label="Max"
                                        value={draft.max}
                                        onValueChange={(value) => set({ max: value ?? 100 })}
                                        suffix={unit.trim()}
                                        className="min-w-32 flex-1"
                                    />
                                </Row>
                            )}
                            <Field
                                id="panel-color"
                                label="Color"
                                description={
                                    draft.groupBy !== 'none' && !one && kind !== 'bargauge'
                                        ? 'Grouped series take the theme’s colors in turn; this one draws a single series.'
                                        : 'The series, the tile or the dial where no threshold colors it.'
                                }
                            >
                                <ColorInput id="panel-color" label="Color" value={draft.color} onChange={(color) => set({ color })} />
                            </Field>
                        </Stack>
                    </Section>
                )}
                {!logs && (
                    <Section
                        title="Thresholds"
                        description={
                            kind === 'timeseries'
                                ? 'Drawn as dashed lines across the chart.'
                                : kind === 'heatmap'
                                  ? 'Their colors make the heatmap’s scale.'
                                  : 'Color the value by the step it reaches.'
                        }
                    >
                        <ThresholdsInput value={draft.thresholds} onChange={(thresholds) => set({ thresholds })} unit={unit} />
                    </Section>
                )}
            </Stack>
        </div>
    )

    return (
        <Page className="h-full">
            <PageHeader title={original === undefined ? 'New panel' : `Edit ${original.title}`} onBack={leave} />
            <SplitPane
                className="min-h-0 flex-1"
                id="metrics-editor"
                defaultShare={0.6}
                minShare={0.35}
                maxShare={0.75}
                narrow="stack"
                first={preview}
                second={options}
            />
            <FormBar note={original === undefined ? 'A new panel, not yet on the dashboard' : dirty ? 'Unsaved changes' : 'No changes'}>
                <Button variant="outline" size="sm" onClick={leave}>
                    Discard
                </Button>
                <Button
                    size="sm"
                    onClick={save}
                    reason={title === '' ? 'A panel needs a title.' : !dirty ? 'Nothing has changed yet.' : saving ? 'Saving' : undefined}
                >
                    {original === undefined ? 'Add to dashboard' : 'Save'}
                </Button>
            </FormBar>
            {guard.dialog}
        </Page>
    )
}
