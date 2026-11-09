import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { written } from './alerting'
import { type AlertRule, crosses, rules } from './data'
import { SelectInput } from './inputs'
import { scraped } from './live'
import { readSeries, spanOf, timeLabel, type Zone } from './query'
import { ALL, type Aggregation, HOSTS, METRICS, metricOf, type MetricId, SERVICES } from './source'

const FRESH: Omit<AlertRule, 'id'> = {
    name: '',
    metric: 'latency_p95',
    aggregation: 'avg',
    filter: { service: 'api' },
    condition: 'above',
    threshold: 200,
    forSeconds: 15,
    severity: 'warning',
    enabled: true,
}

const HOLDS = [
    { value: '0', label: 'At once' },
    { value: '10', label: '10s' },
    { value: '15', label: '15s' },
    { value: '30', label: '30s' },
    { value: '60', label: '1m' },
    { value: '300', label: '5m' },
]

const AGGREGATION_LABELS: Record<Aggregation, string> = { sum: 'Sum', avg: 'Mean', max: 'Max', min: 'Min' }
const PREVIEW_RANGE = { preset: '15m' }

/** The last quarter hour of what a rule reads, with its threshold drawn across it, and where the value stands now. */
function RulePreview({ rule, zone }: { rule: Omit<AlertRule, 'id'>; zone: Zone }) {
    const second = useStore(scraped)
    const span = useMemo(() => spanOf(PREVIEW_RANGE, second, 90), [second])
    const series = useMemo(
        () => readSeries({ metric: rule.metric, aggregation: rule.aggregation, groupBy: 'none', filters: [rule.filter] }, span),
        [rule.metric, rule.aggregation, rule.filter, span],
    )
    const x = useMemo(() => span.times.map((time) => timeLabel(time, span, zone)), [span, zone])
    const tone = rule.severity === 'critical' ? 'critical' : 'warning'
    const thresholds =
        rule.condition === 'above'
            ? [{ color: 'good' }, { value: rule.threshold, color: tone }]
            : [{ color: tone }, { value: rule.threshold, color: 'good' }]
    const metric = metricOf(rule.metric)
    const now = series[0]?.values.at(-1) ?? null
    const over = crosses({ ...rule, id: '' }, now)
    return (
        <Stack gap="sm">
            <TimeSeriesPanel
                title="The last 15 minutes"
                subtitle={metric.label}
                x={x}
                series={series.map((one) => ({ ...one, color: 'chart-2' }))}
                unit={metric.unit}
                decimals={metric.decimals}
                thresholds={thresholds}
                fill="gradient"
                legend="none"
                bodyClassName="h-40"
                empty={series.length === 0}
                span="full"
            />
            <Row gap="sm" align="center">
                <StatusChip status={over ? (rule.forSeconds === 0 ? 'firing' : 'pending') : 'normal'} />
                <span className="text-sm text-muted-foreground">
                    Now {written(rule, now)},{' '}
                    {over
                        ? rule.forSeconds === 0
                            ? 'so the rule would fire.'
                            : `so it fires if it stays over for ${String(rule.forSeconds)}s.`
                        : 'within the threshold.'}
                </span>
            </Row>
        </Stack>
    )
}

/** Making or changing an alert rule, with a live chart of what it reads against its threshold. */
export function RuleDialog({
    open,
    onOpenChange,
    rule,
    zone = 'local',
    onSaved,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    rule?: AlertRule
    zone?: Zone
    onSaved?: () => void
}) {
    const [draft, setDraft] = useState<Omit<AlertRule, 'id'>>(FRESH)
    const [shown, setShown] = useState(false)
    const [busy, setBusy] = useState(false)
    if (open && !shown) {
        setShown(true)
        setDraft(rule === undefined ? FRESH : { ...rule })
    }
    if (!open && shown) setShown(false)
    const set = (patch: Partial<Omit<AlertRule, 'id'>>) => setDraft((current) => ({ ...current, ...patch }))
    const metric = metricOf(draft.metric)
    const service = draft.filter.service ?? ALL
    const hosts = HOSTS.filter((host) => service === ALL || host.service === service)
    const name = draft.name.trim()
    const submit = () => {
        if (name === '') return
        setBusy(true)
        const saved = { ...draft, name }
        const done = rule === undefined ? rules.create(saved) : rules.update(rule.id, saved)
        void done.then(() => {
            setBusy(false)
            toast.success(rule === undefined ? `${name} added` : `${name} saved`)
            onOpenChange(false)
            onSaved?.()
        })
    }
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="lg"
            title={rule === undefined ? 'New alert rule' : `Edit ${rule.name}`}
            description="A rule fires when its value crosses the threshold for as long as it says, and resolves once it is back."
            confirm={{
                label: rule === undefined ? 'Add rule' : 'Save',
                onConfirm: submit,
                why: name === '' ? 'A rule needs a name.' : undefined,
                busy,
            }}
        >
            <Stack gap="md">
                <TextField id="rule-name" label="Name" value={draft.name} onChange={(value) => set({ name: value })} onEnter={submit} />
                <Row gap="sm" wrap>
                    <Field id="rule-metric" label="Metric" className="min-w-48 flex-1">
                        <SelectInput
                            id="rule-metric"
                            value={draft.metric}
                            onChange={(value) => {
                                const next = metricOf(value as MetricId)
                                set({
                                    metric: next.id,
                                    aggregation: next.aggregations.includes(draft.aggregation)
                                        ? draft.aggregation
                                        : (next.aggregations[0] ?? 'avg'),
                                })
                            }}
                            options={METRICS.map((one) => ({ value: one.id, label: one.label }))}
                        />
                    </Field>
                    <Field id="rule-aggregation" label="Across series" className="min-w-48 flex-1">
                        <Segmented<Aggregation>
                            id="rule-aggregation"
                            label="Across series"
                            fill
                            value={draft.aggregation}
                            onValueChange={(aggregation) => set({ aggregation })}
                            options={metric.aggregations.map((value) => ({ value, label: AGGREGATION_LABELS[value] }))}
                        />
                    </Field>
                </Row>
                <Row gap="sm" wrap>
                    <Field id="rule-service" label="Service" className="min-w-40 flex-1">
                        <SelectInput
                            id="rule-service"
                            value={service}
                            onChange={(value) =>
                                set({ filter: { ...draft.filter, service: value === ALL ? undefined : value, host: undefined } })
                            }
                            options={[{ value: ALL, label: 'Any service' }, ...SERVICES.map((value) => ({ value, label: value }))]}
                        />
                    </Field>
                    <Field id="rule-host" label="Host" className="min-w-40 flex-1">
                        <SelectInput
                            id="rule-host"
                            value={draft.filter.host ?? ALL}
                            onChange={(value) => set({ filter: { ...draft.filter, host: value === ALL ? undefined : value } })}
                            options={[{ value: ALL, label: 'Any host' }, ...hosts.map((host) => ({ value: host.id, label: host.id }))]}
                        />
                    </Field>
                </Row>
                <Row gap="sm" wrap align="end">
                    <Field id="rule-condition" label="Fires when the value is" className="min-w-40 flex-1">
                        <Segmented
                            id="rule-condition"
                            label="Fires when the value is"
                            fill
                            value={draft.condition}
                            onValueChange={(condition) => set({ condition })}
                            options={[
                                { value: 'above', label: 'Above' },
                                { value: 'below', label: 'Below' },
                            ]}
                        />
                    </Field>
                    <NumberField
                        id="rule-threshold"
                        label="Threshold"
                        value={draft.threshold}
                        onValueChange={(value) => set({ threshold: value ?? 0 })}
                        suffix={metric.unit.trim()}
                        className="min-w-40 flex-1"
                    />
                </Row>
                <Field id="rule-for" label="For" description="How long the value must stay over before the rule fires.">
                    <Segmented
                        id="rule-for"
                        label="For"
                        fill
                        value={String(draft.forSeconds)}
                        onValueChange={(value) => set({ forSeconds: Number(value) })}
                        options={HOLDS}
                    />
                </Field>
                <Row gap="sm" wrap align="end">
                    <Field id="rule-severity" label="Severity" className="min-w-40 flex-1">
                        <Segmented
                            id="rule-severity"
                            label="Severity"
                            fill
                            value={draft.severity}
                            onValueChange={(severity) => set({ severity })}
                            options={[
                                { value: 'warning', label: 'Warning' },
                                { value: 'critical', label: 'Critical' },
                            ]}
                        />
                    </Field>
                    <div className="min-w-40 flex-1">
                        <SwitchField
                            id="rule-enabled"
                            label="Evaluate this rule"
                            checked={draft.enabled}
                            onCheckedChange={(enabled) => set({ enabled })}
                        />
                    </div>
                </Row>
                {open && <RulePreview rule={draft} zone={zone} />}
            </Stack>
        </DialogShell>
    )
}
