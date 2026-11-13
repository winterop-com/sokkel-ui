import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SaveBar } from '@winterop-com/sokkel-ui/SaveBar'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TreeSelect } from '@winterop-com/sokkel-ui/TreeSelect'
import { Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import {
    OPERATORS,
    runRule,
    STRATEGIES,
    unitName,
    validationRules,
    type Importance,
    type MissingValueStrategy,
    type Operator,
    type ValidationRule,
    type Violation,
} from '../data/backend'
import { orgUnit, ORG_UNIT_TREE, pathOf, PERIODS, periodLabel, ROOT, sitesUnder } from '../data/metadata'
import { count, ExpressionField, figure, useChecked, useFoot, verdict } from '../ui'

type Draft = Omit<ValidationRule, 'id' | 'code'>
const FIELDS: (keyof Draft)[] = ['name', 'instruction', 'importance', 'left', 'operator', 'right', 'leftStrategy', 'rightStrategy']

const PERIOD_OPTIONS = PERIODS.map((one) => ({ value: one, label: periodLabel(one) }))
const STRATEGY_OPTIONS = (Object.keys(STRATEGIES) as MissingValueStrategy[]).map((one) => ({ value: one, label: STRATEGIES[one].label }))

/** One validation rule: its sides and operator edited and checked as typed, and run over the sites under a unit for a run of months, its violations listed. */
export function ValidationRulePage({ id }: { id: string }) {
    const { rows, error } = useCollection(validationRules)
    const saved = rows?.find((one) => one.id === id)
    return (
        <PageState
            loading={rows === undefined && error === undefined}
            error={error}
            empty={rows !== undefined && saved === undefined}
            emptyMessage="No validation rule has this uid. It may have been deleted."
        >
            {saved !== undefined && <Editor key={saved.id} saved={saved} />}
        </PageState>
    )
}

interface Run {
    violations: Violation[]
    tried: number
    skipped: number
    where: string
    months: string
}

function Editor({ saved }: { saved: ValidationRule }) {
    const [draft, setDraft] = useState<Draft>(saved)
    const [busy, setBusy] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [unit, setUnit] = useState(ROOT)
    const [from, setFrom] = useState(PERIODS[0])
    const [to, setTo] = useState(PERIODS[PERIODS.length - 1])
    const [run, setRun] = useState<Run | null>(null)
    const left = useChecked(draft.left, 'expression')
    const right = useChecked(draft.right, 'expression')
    const state = verdict(left, right)
    const runnable = left.node !== null && right.node !== null && state !== 'invalid'
    const changed = FIELDS.filter((field) => draft[field] !== saved[field]).length
    const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((was) => ({ ...was, [field]: value }))
    useFoot(run === null ? 'Not run yet' : `${count(run.violations.length, 'violation')} of ${count(run.tried, 'pair')} tried`, undefined, [
        run,
    ])

    const months = PERIODS.filter((one) => one >= (from < to ? from : to) && one <= (from < to ? to : from))

    const start = () => {
        if (left.node === null || right.node === null) return
        const sites = sitesUnder(unit).map((site) => site.id)
        const result = runRule({ id: saved.id, ...draft }, left.node, right.node, sites, months)
        setRun({
            ...result,
            where: orgUnit(unit)?.name ?? '',
            months: `${periodLabel(months[0])} to ${periodLabel(months[months.length - 1])}`,
        })
        toast(
            result.violations.length === 0
                ? 'The rule holds everywhere it was tried'
                : `${count(result.violations.length, 'violation')} found`,
        )
    }

    const save = () => {
        setBusy(true)
        validationRules.update(saved.id, draft).then(
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
        validationRules.remove(saved.id).then(
            () => {
                toast(`${saved.name} deleted`)
                go('/validation-rules')
            },
            (failure: unknown) => toast.error('Not deleted', { description: failure instanceof Error ? failure.message : String(failure) }),
        )

    const columns: DataColumn<Violation>[] = [
        {
            id: 'unit',
            header: 'Site',
            width: 'minmax(12rem,1.4fr)',
            cell: (one) => (
                <span>
                    <span className="font-medium">{unitName(one.unit)}</span>
                    <span className="block text-xs text-muted-foreground">
                        {pathOf(one.unit)
                            .slice(1, -1)
                            .map((step) => step.name)
                            .join(' / ')}
                    </span>
                </span>
            ),
            sortValue: (one) => unitName(one.unit),
            stack: 'lead',
        },
        { id: 'period', header: 'Month', width: '8rem', cell: (one) => periodLabel(one.period), sortValue: (one) => one.period },
        {
            id: 'left',
            header: 'Left side',
            width: '7rem',
            align: 'end',
            cell: (one) => figure(one.left),
            sortValue: (one) => one.left ?? -Infinity,
        },
        {
            id: 'operator',
            header: 'Must be',
            width: '6rem',
            align: 'center',
            cell: () => <span className="font-mono">{OPERATORS[draft.operator].sign}</span>,
        },
        {
            id: 'right',
            header: 'Right side',
            width: '7rem',
            align: 'end',
            cell: (one) => figure(one.right),
            sortValue: (one) => one.right ?? -Infinity,
        },
    ]

    return (
        <Page>
            <PageHeader
                title={saved.name}
                code={saved.id}
                description={saved.instruction === '' ? undefined : saved.instruction}
                actions={
                    <>
                        <ApiLink path={`/api/validationRules/${saved.id}`} />
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
                    description="Each side is an expression over the data; the rule holds where the left side stands to the right as the operator says."
                >
                    <Stack gap="lg">
                        <Columns count={2} min="xs" gap="md">
                            <TextField id="rule-name" label="Name" value={draft.name} onChange={(value) => set('name', value)} required />
                            <SelectField
                                id="rule-importance"
                                label="Importance"
                                value={draft.importance}
                                onChange={(value) => set('importance', value as Importance)}
                                options={[
                                    { value: 'high', label: 'High' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'low', label: 'Low' },
                                ]}
                            />
                        </Columns>
                        <TextField
                            id="rule-instruction"
                            label="Instruction"
                            multiline
                            rows={2}
                            value={draft.instruction}
                            onChange={(value) => set('instruction', value)}
                        />
                        <ExpressionField
                            id="rule-left"
                            label="Left side"
                            value={draft.left}
                            onChange={(value) => set('left', value)}
                            language="expression"
                            checked={left}
                        />
                        <SelectField
                            id="rule-left-strategy"
                            label="When the left side has missing values"
                            value={draft.leftStrategy}
                            onChange={(value) => set('leftStrategy', value as MissingValueStrategy)}
                            options={STRATEGY_OPTIONS}
                            help={STRATEGIES[draft.leftStrategy].description}
                        />
                        <SelectField
                            id="rule-operator"
                            label="Operator"
                            value={draft.operator}
                            onChange={(value) => set('operator', value as Operator)}
                            options={(Object.keys(OPERATORS) as Operator[]).map((one) => ({
                                value: one,
                                label: `${OPERATORS[one].label} (${OPERATORS[one].sign})`,
                            }))}
                        />
                        <ExpressionField
                            id="rule-right"
                            label="Right side"
                            value={draft.right}
                            onChange={(value) => set('right', value)}
                            language="expression"
                            checked={right}
                        />
                        <SelectField
                            id="rule-right-strategy"
                            label="When the right side has missing values"
                            value={draft.rightStrategy}
                            onChange={(value) => set('rightStrategy', value as MissingValueStrategy)}
                            options={STRATEGY_OPTIONS}
                            help={STRATEGIES[draft.rightStrategy].description}
                        />
                    </Stack>
                </Section>
                <Section
                    title="Run"
                    description="The rule as it stands, unsaved edits included, tried for each site under the unit in each month."
                    actions={
                        <Button size="sm" onClick={start} disabled={!runnable}>
                            <Play aria-hidden />
                            Run
                        </Button>
                    }
                >
                    <Stack gap="lg">
                        <Field id="rule-unit" label="Organization unit">
                            <TreeSelect
                                id="rule-unit"
                                nodes={ORG_UNIT_TREE}
                                value={[unit]}
                                onValueChange={(ids) => setUnit(ids[0] ?? ROOT)}
                                defaultExpanded={[ROOT]}
                            />
                        </Field>
                        <Columns count={2} min="xs" gap="md">
                            <SelectField id="rule-from" label="From" value={from} onChange={setFrom} options={PERIOD_OPTIONS} />
                            <SelectField id="rule-to" label="To" value={to} onChange={setTo} options={PERIOD_OPTIONS} />
                        </Columns>
                        {run !== null && (
                            <>
                                <Columns count={3} min="xs" gap="md">
                                    <Stat
                                        variant="tile"
                                        label="Violations"
                                        value={run.violations.length}
                                        emphasis={run.violations.length > 0}
                                        note={`${run.where}, ${run.months}`}
                                    />
                                    <Stat variant="tile" label="Tried" value={run.tried} note="site and month pairs" />
                                    <Stat variant="tile" label="Skipped" value={run.skipped} note="for missing values" />
                                </Columns>
                                <DataTable
                                    variant="list"
                                    columns={columns}
                                    rows={run.violations}
                                    rowKey={(one) => one.id}
                                    rowHeight="auto"
                                    minWidth="auto"
                                    words={{ empty: 'The rule holds for every site and month it was tried on.' }}
                                />
                            </>
                        )}
                    </Stack>
                </Section>
            </Columns>
            {changed > 0 && <SaveBar count={changed} busy={busy} onSave={save} onDiscard={() => setDraft(saved)} />}
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${saved.name}?`}
                detail="The rule goes from the server, and with it the violations it finds."
                confirm={{ label: 'Delete', destructive: true, onConfirm: remove }}
            />
        </Page>
    )
}
