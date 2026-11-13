import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useState } from 'react'

import { METRIC_IDS, METRICS, SERVICES, type Metric, type Service, type Widget, type WidgetOptions } from './model'
import { KINDS, titleOf } from './widgets'

const METRIC_OPTIONS = METRIC_IDS.map((metric) => ({ value: metric, label: METRICS[metric].label }))
const ROWS = [4, 6, 8, 10].map((rows) => ({ value: String(rows), label: String(rows) }))

/**
 * A widget's options: its title (empty for the one its options give it) and what its kind reads,
 * applied to the dashboard being edited and kept with the rest once Done is pressed.
 */
export function ConfigureDialog({
    widget,
    onClose,
    onApply,
}: {
    widget: Widget | null
    onClose: () => void
    onApply: (widget: Widget) => void
}) {
    return widget === null ? null : <Form key={widget.id} widget={widget} onApply={onApply} onClose={onClose} />
}

function Form({ widget, onApply, onClose }: { widget: Widget; onApply: (widget: Widget) => void; onClose: () => void }) {
    const [title, setTitle] = useState(widget.title ?? '')
    const [options, setOptions] = useState<WidgetOptions>(widget.options)
    const set = (patch: Partial<WidgetOptions>) => setOptions({ ...options, ...patch })
    const { title: _given, ...plain } = widget
    const fallback = titleOf({ ...plain, options })
    const apply = () => {
        const given = title.trim()
        onApply({ ...plain, options, ...(given === '' || given === fallback ? {} : { title: given }) })
    }
    const kind = widget.kind
    return (
        <DialogShell
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            title={`Configure ${KINDS[kind].label.toLowerCase()}`}
            width="md"
            phone="sheet"
            confirm={{ label: 'Apply', onConfirm: apply }}
        >
            <Stack gap="lg">
                <TextField
                    id="widget-title"
                    label="Title"
                    value={title}
                    placeholder={fallback}
                    onChange={setTitle}
                    onEnter={apply}
                    fallback={`Empty, it is called ${fallback}`}
                />
                {(kind === 'stat' || kind === 'gauge' || kind === 'trend') && (
                    <SelectField
                        id="widget-metric"
                        label={kind === 'trend' ? 'Figure' : 'Reads'}
                        options={METRIC_OPTIONS}
                        value={options.metric ?? 'runs'}
                        onChange={(metric) => set({ metric: metric as Metric })}
                    />
                )}
                {kind === 'trend' && (
                    <>
                        <SelectField
                            id="widget-compare"
                            label="Beside it"
                            options={[{ value: 'none', label: 'Nothing' }, ...METRIC_OPTIONS.filter((one) => one.value !== options.metric)]}
                            value={options.compare ?? 'none'}
                            onChange={(compare) => set({ compare: compare as Metric | 'none' })}
                        />
                        <Field id="widget-style" label="Drawn as">
                            <Segmented
                                id="widget-style"
                                label="Drawn as"
                                value={options.style ?? 'line'}
                                onValueChange={(style) => set({ style })}
                                options={[
                                    { value: 'line', label: 'Line' },
                                    { value: 'area', label: 'Area' },
                                ]}
                            />
                        </Field>
                    </>
                )}
                {kind === 'bars' && (
                    <Field id="widget-group" label="Runs by">
                        <Segmented
                            id="widget-group"
                            label="Runs by"
                            value={options.group ?? 'job'}
                            onValueChange={(group) => set({ group })}
                            options={[
                                { value: 'job', label: 'Job' },
                                { value: 'project', label: 'Project' },
                                { value: 'person', label: 'Person' },
                            ]}
                        />
                    </Field>
                )}
                {(kind === 'runs' || kind === 'activity' || kind === 'upcoming') && (
                    <Field id="widget-rows" label="Rows">
                        <Segmented
                            id="widget-rows"
                            label="Rows"
                            value={String(options.rows ?? 6)}
                            onValueChange={(rows) => set({ rows: Number(rows) })}
                            options={ROWS}
                        />
                    </Field>
                )}
                {kind === 'runs' && (
                    <SwitchField
                        id="widget-failed"
                        label="Only failed runs"
                        checked={options.failedOnly === true}
                        onCheckedChange={(failedOnly) => set({ failedOnly })}
                    />
                )}
                {kind === 'log' && (
                    <Field id="widget-service" label="Service">
                        <Segmented<Service>
                            id="widget-service"
                            label="Service"
                            value={options.service ?? 'api'}
                            onValueChange={(service) => set({ service })}
                            options={SERVICES.map((service) => ({ value: service, label: service }))}
                        />
                    </Field>
                )}
                {kind === 'note' && (
                    <TextField
                        id="widget-text"
                        label="Text"
                        hint="Markdown"
                        multiline
                        rows={8}
                        maxRows={16}
                        value={options.text ?? ''}
                        onChange={(text) => set({ text })}
                    />
                )}
                {kind === 'todo' && (
                    <SwitchField
                        id="widget-hide-done"
                        label="Hide what is done"
                        checked={options.hideDone === true}
                        onCheckedChange={(hideDone) => set({ hideDone })}
                    />
                )}
                {kind === 'oncall' && (
                    <SwitchField
                        id="widget-next"
                        label="Show who is next"
                        checked={options.showNext !== false}
                        onCheckedChange={(showNext) => set({ showNext })}
                    />
                )}
            </Stack>
        </DialogShell>
    )
}
