import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PeriodPicker } from '@winterop-com/sokkel-ui/PeriodPicker'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SaveBar } from '@winterop-com/sokkel-ui/SaveBar'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TreeSelect } from '@winterop-com/sokkel-ui/TreeSelect'
import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { indicators, indicatorValue, INDICATOR_TYPES, type Indicator, type IndicatorType } from '../data/backend'
import { childrenOf, LEVELS, orgUnit, ORG_UNIT_TREE, PERIODS, periodLabel, ROOT, TODAY } from '../data/metadata'
import { ExpressionField, figure, useChecked, useFoot, verdict } from '../ui'

type Draft = Pick<Indicator, 'name' | 'description' | 'type' | 'numerator' | 'denominator'>
const FIELDS: (keyof Draft)[] = ['name', 'description', 'type', 'numerator', 'denominator']

/** One indicator: its name, type and two expressions edited and checked as typed, and its value worked out for a unit and a month, over the year and for the units under it. */
export function IndicatorPage({ id }: { id: string }) {
    const { rows, error } = useCollection(indicators)
    const saved = rows?.find((one) => one.id === id)
    return (
        <PageState
            loading={rows === undefined && error === undefined}
            error={error}
            empty={rows !== undefined && saved === undefined}
            emptyMessage="No indicator has this uid. It may have been deleted."
        >
            {saved !== undefined && <Editor key={saved.id} saved={saved} />}
        </PageState>
    )
}

function Editor({ saved }: { saved: Indicator }) {
    const [draft, setDraft] = useState<Draft>(saved)
    const [busy, setBusy] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [unit, setUnit] = useState(ROOT)
    const [period, setPeriod] = useState<string>(PERIODS[PERIODS.length - 1])
    const numerator = useChecked(draft.numerator, 'expression')
    const denominator = useChecked(draft.denominator, 'expression')
    const state = verdict(numerator, denominator)
    const runnable = numerator.node !== null && denominator.node !== null && state !== 'invalid'
    const changed = FIELDS.filter((field) => draft[field] !== saved[field]).length
    const unitOf = INDICATOR_TYPES[draft.type].unit
    const here = orgUnit(unit)
    const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((was) => ({ ...was, [field]: value }))

    const now = useMemo(
        () =>
            runnable && numerator.node !== null && denominator.node !== null
                ? indicatorValue(numerator.node, denominator.node, draft.type, unit, period)
                : null,
        [runnable, numerator, denominator, draft.type, unit, period],
    )
    const year = useMemo(
        () =>
            PERIODS.map((one) => ({
                month: periodLabel(one),
                value:
                    runnable && numerator.node !== null && denominator.node !== null
                        ? indicatorValue(numerator.node, denominator.node, draft.type, unit, one).value
                        : null,
            })),
        [runnable, numerator, denominator, draft.type, unit],
    )
    const below = useMemo(
        () =>
            childrenOf(unit).map((child) => ({
                id: child.id,
                name: child.name,
                ...(runnable && numerator.node !== null && denominator.node !== null
                    ? indicatorValue(numerator.node, denominator.node, draft.type, child.id, period)
                    : { numerator: null, denominator: null, value: null }),
            })),
        [runnable, numerator, denominator, draft.type, unit, period],
    )
    useFoot(
        state === 'invalid'
            ? 'The expressions do not run as written'
            : `${here?.name ?? ''}, ${periodLabel(period)}: ${figure(now?.value, unitOf)}`,
        undefined,
        [state, unit, period, now?.value, unitOf],
    )

    const save = () => {
        setBusy(true)
        indicators.update(saved.id, draft).then(
            () => {
                setBusy(false)
                toast.success('Saved', { description: draft.name })
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not saved', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    const remove = () =>
        indicators.remove(saved.id).then(
            () => {
                toast(`${saved.name} deleted`)
                go('/indicators')
            },
            (failure: unknown) => toast.error('Not deleted', { description: failure instanceof Error ? failure.message : String(failure) }),
        )

    type Below = (typeof below)[number]
    const columns: DataColumn<Below>[] = [
        {
            id: 'name',
            header: here === undefined || here.level === 4 ? 'Unit' : LEVELS[(here.level + 1) as 2 | 3 | 4],
            width: 'minmax(8rem,1fr)',
            cell: (one) => one.name,
            sortValue: (one) => one.name,
        },
        {
            id: 'numerator',
            header: 'Numerator',
            width: '7rem',
            align: 'end',
            cell: (one) => figure(one.numerator),
            sortValue: (one) => one.numerator ?? -Infinity,
        },
        {
            id: 'denominator',
            header: 'Denominator',
            width: '7rem',
            align: 'end',
            cell: (one) => figure(one.denominator),
            sortValue: (one) => one.denominator ?? -Infinity,
        },
        {
            id: 'value',
            header: 'Value',
            width: '6rem',
            align: 'end',
            cell: (one) => figure(one.value, unitOf),
            sortValue: (one) => one.value ?? -Infinity,
        },
    ]

    return (
        <Page>
            <PageHeader
                title={saved.name}
                code={saved.id}
                description={saved.description === '' ? undefined : saved.description}
                actions={
                    <>
                        <ApiLink path={`/api/indicators/${saved.id}`} />
                        <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                            <Trash2 aria-hidden />
                            Delete
                        </Button>
                    </>
                }
            />
            <Columns count={2} min="lg" gap="inspector" align="start">
                <Section
                    title="Definition"
                    description="Typed in DHIS2's expression language. Type #{ and a name to put in a data element, a dot after it for one of its category option combos."
                >
                    <Stack gap="lg">
                        <Columns count={2} min="xs" gap="md">
                            <TextField
                                id="indicator-name"
                                label="Name"
                                value={draft.name}
                                onChange={(value) => set('name', value)}
                                required
                            />
                            <SelectField
                                id="indicator-type"
                                label="Type"
                                value={draft.type}
                                onChange={(value) => set('type', value as IndicatorType)}
                                options={(Object.keys(INDICATOR_TYPES) as IndicatorType[]).map((type) => ({
                                    value: type,
                                    label: `${INDICATOR_TYPES[type].label} (×${String(INDICATOR_TYPES[type].factor)})`,
                                }))}
                            />
                        </Columns>
                        <TextField
                            id="indicator-description"
                            label="Description"
                            multiline
                            rows={2}
                            value={draft.description}
                            onChange={(value) => set('description', value)}
                        />
                        <ExpressionField
                            id="indicator-numerator"
                            label="Numerator"
                            value={draft.numerator}
                            onChange={(value) => set('numerator', value)}
                            language="expression"
                            checked={numerator}
                        />
                        <ExpressionField
                            id="indicator-denominator"
                            label="Denominator"
                            value={draft.denominator}
                            onChange={(value) => set('denominator', value)}
                            language="expression"
                            checked={denominator}
                        />
                    </Stack>
                </Section>
                <Section
                    title="Try it"
                    description="The expressions as they stand, unsaved edits included, run on the server's data values."
                >
                    <Stack gap="lg">
                        <Columns count={2} min="xs" gap="md">
                            <Field id="indicator-unit" label="Organization unit">
                                <TreeSelect
                                    id="indicator-unit"
                                    nodes={ORG_UNIT_TREE}
                                    value={[unit]}
                                    onValueChange={(ids) => setUnit(ids[0] ?? ROOT)}
                                    defaultExpanded={[ROOT]}
                                />
                            </Field>
                            <Field id="indicator-period" label="Period">
                                <PeriodPicker
                                    id="indicator-period"
                                    type="monthly"
                                    value={period}
                                    onValueChange={(one) => setPeriod(one ?? period)}
                                    today={TODAY}
                                    count={12}
                                />
                            </Field>
                        </Columns>
                        <Columns count={3} min="xs" gap="md">
                            <Stat variant="tile" label="Numerator" value={figure(now?.numerator)} />
                            <Stat variant="tile" label="Denominator" value={figure(now?.denominator)} />
                            <Stat
                                variant="tile"
                                label={INDICATOR_TYPES[draft.type].label}
                                value={figure(now?.value, unitOf)}
                                note={
                                    state === 'invalid'
                                        ? 'Cannot run as written'
                                        : now !== null && now.value === null
                                          ? 'Missing data or a zero denominator'
                                          : `× ${String(INDICATOR_TYPES[draft.type].factor)}`
                                }
                                emphasis={state === 'invalid'}
                            />
                        </Columns>
                        <ChartFrame title="Over the year" subtitle={here?.name} className="h-64" empty={!runnable}>
                            {(chart) => (
                                <Chart
                                    kind="line"
                                    label={`${draft.name} by month for ${here?.name ?? ''}`}
                                    rows={year}
                                    x="month"
                                    y="value"
                                    unit={unitOf}
                                    fieldNames={{ value: draft.name, month: 'Month' }}
                                    {...chart}
                                />
                            )}
                        </ChartFrame>
                        {below.length > 0 && (
                            <DataTable
                                variant="list"
                                columns={columns}
                                rows={below}
                                rowKey={(one) => one.id}
                                onOpen={(one) => setUnit(one.id)}
                                chevron
                                minWidth="auto"
                            />
                        )}
                    </Stack>
                </Section>
            </Columns>
            {changed > 0 && <SaveBar count={changed} busy={busy} onSave={save} onDiscard={() => setDraft(saved)} />}
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${saved.name}?`}
                detail="The indicator goes from the server. Nothing else reads it here."
                confirm={{ label: 'Delete', destructive: true, onConfirm: remove }}
            />
        </Page>
    )
}
