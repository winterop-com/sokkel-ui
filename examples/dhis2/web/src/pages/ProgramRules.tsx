import { ComputedField } from '@winterop-com/sokkel-ui/ComputedField'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Inspector, InspectorSection } from '@winterop-com/sokkel-ui/Inspector'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { Columns, Fill, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { RepeatedDrag } from '@winterop-com/sokkel-ui/RepeatedDrag'
import { RepeatedGroup } from '@winterop-com/sokkel-ui/RepeatedGroup'
import { SaveBar } from '@winterop-com/sokkel-ui/SaveBar'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Tree } from '@winterop-com/sokkel-ui/Tree'
import { YesNoField } from '@winterop-com/sokkel-ui/YesNoField'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { programRules } from '../data/backend'
import type { Value } from '../data/expression'
import { uid } from '../data/metadata'
import {
    ACTIONS,
    EVALUATED_VARIABLES,
    FIELDS,
    newAction,
    PROGRAM,
    runRules,
    VARIABLES,
    type ActionType,
    type Effect,
    type ProgramRule,
    type RuleAction,
} from '../data/program'
import { count, ExpressionField, useChecked, useFoot, useVersion } from '../ui'

const CONTEXT = { variables: VARIABLES, evaluatedVariables: EVALUATED_VARIABLES }
const FIELD_OPTIONS = FIELDS.map((field) => ({ value: field.variable, label: field.label }))
const EVENT_DATE = '2026-11-02'

type Draft = Omit<ProgramRule, 'id'>

/** The program's rules in the order they run, dragged into another order to number their priorities again, the chosen one's condition and actions edited, and the program's form beside them, reacting to every rule as it is filled. */
export function ProgramRules({ selected }: { selected?: string }) {
    const { rows, error } = useCollection(programRules)
    const ordered = useMemo(() => [...(rows ?? [])].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)), [rows])
    const saved = ordered.find((one) => one.id === selected) ?? ordered[0]
    const [draft, setDraft] = useState<{ id: string; rule: Draft } | null>(null)
    const editing = saved === undefined ? undefined : draft?.id === saved.id ? draft.rule : saved
    const rules = useMemo(
        () => ordered.map((one) => (one.id === saved?.id && editing !== undefined ? { ...editing, id: one.id } : one)),
        [ordered, saved, editing],
    )

    /** Moves a rule to another place in the run order, numbering every rule's priority from 1 in the new order. */
    const reorder = (id: string, index: number) => {
        const from = ordered.findIndex((one) => one.id === id)
        if (from === -1) return
        const next = moveItem(ordered, from, index)
        const priorities = new Map(next.map((one, place) => [one.id, place + 1]))
        setDraft((now) => {
            const priority = now === null ? undefined : priorities.get(now.id)
            return now === null || priority === undefined ? now : { id: now.id, rule: { ...now.rule, priority } }
        })
        const changed = next.filter((one, place) => one.priority !== place + 1)
        Promise.all(changed.map((one) => programRules.update(one.id, { priority: priorities.get(one.id) ?? one.priority }))).catch(
            (failure: unknown) => toast.error('Not moved', { description: failure instanceof Error ? failure.message : String(failure) }),
        )
    }

    const create = () => {
        const made = (ordered.length + 1).toString()
        programRules
            .create(
                {
                    name: `New rule ${made}`,
                    description: '',
                    priority: (ordered[ordered.length - 1]?.priority ?? 0) + 1,
                    condition: 'd2:hasValue(#{water source})',
                    actions: [newAction('SHOWWARNING')],
                },
                uid(`prr:new:${made}:${Date.now().toString(36)}`),
            )
            .then(
                (one: ProgramRule) => go(`/program-rules/${one.id}`),
                (failure: unknown) =>
                    toast.error('Not created', { description: failure instanceof Error ? failure.message : String(failure) }),
            )
    }

    return (
        <Row gap="none" align="stretch" className="h-full min-h-0">
            <SubNav
                label="Program rules"
                title={PROGRAM.name}
                actions={
                    <Button size="sm" variant="ghost" onClick={create}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
                defaultSize={264}
            >
                <Tree
                    label="Program rules"
                    nodes={ordered.map((one) => ({ id: one.id, label: one.name, meta: String(one.priority) }))}
                    selected={saved === undefined ? [] : [saved.id]}
                    onSelect={(ids) => ids[0] !== undefined && go(`/program-rules/${ids[0]}`)}
                    onMove={(id, _into, index) => reorder(id, index)}
                />
            </SubNav>
            <Fill>
                <PageState
                    loading={rows === undefined && error === undefined}
                    error={error}
                    empty={rows !== undefined && saved === undefined}
                    emptyMessage="The program has no rules. Add one with New."
                >
                    {saved !== undefined && editing !== undefined && (
                        <Row gap="none" align="stretch" className="h-full min-h-0">
                            <Fill>
                                <Editor
                                    key={saved.id}
                                    saved={saved}
                                    draft={editing}
                                    onDraft={(rule) => setDraft({ id: saved.id, rule })}
                                    onDiscard={() => setDraft(null)}
                                />
                            </Fill>
                            <TryForm rules={rules} />
                        </Row>
                    )}
                </PageState>
            </Fill>
        </Row>
    )
}

const FIELDS_OF_DRAFT: (keyof Draft)[] = ['name', 'description', 'priority', 'condition', 'actions']

function Editor({
    saved,
    draft,
    onDraft,
    onDiscard,
}: {
    saved: ProgramRule
    draft: Draft
    onDraft: (rule: Draft) => void
    onDiscard: () => void
}) {
    const [busy, setBusy] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const condition = useChecked(draft.condition, 'rule', CONTEXT)
    const changed = FIELDS_OF_DRAFT.filter((field) => JSON.stringify(draft[field]) !== JSON.stringify(saved[field])).length
    const set = <K extends keyof Draft>(field: K, value: Draft[K]) => onDraft({ ...draft, [field]: value })
    const setAction = (key: string, patch: Partial<RuleAction>) =>
        set(
            'actions',
            draft.actions.map((one) => (one.key === key ? { ...one, ...patch } : one)),
        )

    const save = () => {
        setBusy(true)
        programRules.update(saved.id, draft).then(
            () => {
                setBusy(false)
                onDiscard()
                toast.success('Saved', { description: draft.name })
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not saved', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    const remove = () =>
        programRules.remove(saved.id).then(
            () => {
                toast(`${saved.name} deleted`)
                go('/program-rules')
            },
            (failure: unknown) => toast.error('Not deleted', { description: failure instanceof Error ? failure.message : String(failure) }),
        )

    return (
        <Page>
            <PageHeader
                title={saved.name}
                code={saved.id}
                description={saved.description === '' ? undefined : saved.description}
                actions={
                    <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                        <Trash2 aria-hidden />
                        Delete
                    </Button>
                }
            />
            <Section
                title="Rule"
                description="The condition is written in the program rule language: #{} names the form's fields by their rule variables, V{} the program's variables and d2: its functions."
            >
                <Stack gap="lg">
                    <Columns count={2} min="xs" gap="md">
                        <TextField
                            id="program-rule-name"
                            label="Name"
                            value={draft.name}
                            onChange={(value) => set('name', value)}
                            required
                        />
                        <NumberField
                            id="program-rule-priority"
                            label="Priority"
                            integer
                            value={draft.priority}
                            onValueChange={(value) => set('priority', value ?? 0)}
                            help="Rules run from the lowest priority up; a later rule reads what an earlier one assigned."
                        />
                    </Columns>
                    <TextField
                        id="program-rule-description"
                        label="Description"
                        value={draft.description}
                        onChange={(value) => set('description', value)}
                    />
                    <ExpressionField
                        id="program-rule-condition"
                        label="Condition"
                        value={draft.condition}
                        onChange={(value) => set('condition', value)}
                        language="rule"
                        checked={condition}
                        context={CONTEXT}
                    />
                    <RepeatedDrag>
                        <RepeatedGroup
                            id="program-rule-actions"
                            label="Actions"
                            description="What happens on the form while the condition holds."
                            rows={draft.actions}
                            min={1}
                            onAdd={() => set('actions', [...draft.actions, newAction()])}
                            onRemove={(key) =>
                                set(
                                    'actions',
                                    draft.actions.filter((one) => one.key !== key),
                                )
                            }
                            onMove={(from, to) => set('actions', moveItem(draft.actions, from, to))}
                        >
                            {(key) => {
                                const one = draft.actions.find((action) => action.key === key)
                                if (one === undefined) return null
                                return <ActionFields action={one} onChange={(patch) => setAction(key, patch)} />
                            }}
                        </RepeatedGroup>
                    </RepeatedDrag>
                </Stack>
            </Section>
            {changed > 0 && <SaveBar count={changed} busy={busy} onSave={save} onDiscard={onDiscard} />}
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${saved.name}?`}
                detail="The rule goes from the program, and the form stops following it."
                confirm={{ label: 'Delete', destructive: true, onConfirm: remove }}
            />
        </Page>
    )
}

function ActionFields({ action, onChange }: { action: RuleAction; onChange: (patch: Partial<RuleAction>) => void }) {
    const shape = ACTIONS[action.type]
    const data = useChecked(action.data, 'rule', CONTEXT)
    return (
        <Stack gap="md">
            <Columns count={2} min="xs" gap="md">
                <SelectField
                    id={`${action.key}-type`}
                    label="Action"
                    value={action.type}
                    onChange={(value) => onChange({ type: value as ActionType })}
                    options={(Object.keys(ACTIONS) as ActionType[]).map((type) => ({ value: type, label: ACTIONS[type].label }))}
                />
                {shape.field && (
                    <SelectField
                        id={`${action.key}-field`}
                        label="Field"
                        value={action.field}
                        onChange={(value) => onChange({ field: value })}
                        options={FIELD_OPTIONS}
                    />
                )}
            </Columns>
            {shape.content && (
                <TextField
                    id={`${action.key}-content`}
                    label="Message"
                    value={action.content}
                    onChange={(value) => onChange({ content: value })}
                />
            )}
            {shape.data && (
                <ExpressionField
                    id={`${action.key}-data`}
                    label={action.type === 'ASSIGN' ? 'Value' : 'Written after the message'}
                    value={action.data}
                    onChange={(value) => onChange({ data: value })}
                    language="rule"
                    checked={action.data.trim() === '' && action.type !== 'ASSIGN' ? { node: null, findings: [] } : data}
                    context={CONTEXT}
                />
            )}
        </Stack>
    )
}

const START: Record<string, Value> = { 'water source': 'river', treated: false, 'samples taken': 3, 'samples failed': 1 }

/** The program's form, filled in by hand, every rule run on it as it changes: unsaved edits to the rule shown included. */
function TryForm({ rules }: { rules: readonly ProgramRule[] }) {
    const version = useVersion()
    const [values, setValues] = useState<Record<string, Value>>(START)
    const [eventDate, setEventDate] = useState(EVENT_DATE)
    const run = useMemo(() => runRules(rules, values, eventDate, version), [rules, values, eventDate, version])
    const set = (variable: string, value: Value) => setValues((was) => ({ ...was, [variable]: value }))
    const issues = (variable: string): Issue[] =>
        run.effects
            .filter((effect) => effect.field === variable && (effect.type === 'SHOWWARNING' || effect.type === 'SHOWERROR'))
            .map((effect) => ({ tone: effect.type === 'SHOWERROR' ? 'critical' : 'warning', text: effect.text }))
    const fired = new Set(run.effects.map((effect) => effect.rule)).size
    useFoot(
        `${count(fired, 'rule')} acting on the form${run.broken.length > 0 ? `, ${count(run.broken.length, 'rule')} that cannot run` : ''}`,
        undefined,
        [fired, run.broken.length],
    )

    const ruleName = (id: string) => rules.find((one) => one.id === id)?.name ?? id
    const columns: DataColumn<Effect & { id: string }>[] = [
        { id: 'rule', header: 'Rule', width: 'minmax(8rem,1fr)', cell: (effect) => ruleName(effect.rule), stack: 'lead' },
        {
            id: 'effect',
            header: 'Effect',
            width: 'minmax(10rem,1.4fr)',
            cell: (effect) => (
                <span>
                    <span className="font-medium">{ACTIONS[effect.type].label}</span>
                    {effect.field !== undefined && (
                        <span className="text-muted-foreground"> on {FIELDS.find((field) => field.variable === effect.field)?.label}</span>
                    )}
                    {effect.type !== 'HIDEFIELD' && <span className="block text-xs text-muted-foreground">{effect.text}</span>}
                </span>
            ),
        },
    ]

    return (
        <Inspector
            title="Try the form"
            code={PROGRAM.stage}
            defaultSize={380}
            actions={
                <Button size="sm" variant="ghost" onClick={() => setValues({})}>
                    <RotateCcw aria-hidden />
                    Clear
                </Button>
            }
        >
            <InspectorSection title={PROGRAM.name}>
                <Stack gap="md">
                    <DateField
                        id="try-event-date"
                        label="Inspection date"
                        value={eventDate}
                        onValueChange={(value) => setEventDate(value ?? EVENT_DATE)}
                    />
                    {FIELDS.filter((field) => !run.hidden.has(field.variable)).map((field) => {
                        const value = values[field.variable] ?? null
                        const id = `try-${field.variable.replace(/\W+/g, '-')}`
                        if (field.assigned === true) {
                            const assigned = run.assigned[field.variable]
                            return (
                                <ComputedField
                                    key={field.variable}
                                    id={id}
                                    label={field.label}
                                    value={assigned === undefined || assigned === null ? null : String(assigned)}
                                    why="Assigned by a program rule from the other answers."
                                    numeric
                                />
                            )
                        }
                        if (field.type === 'option')
                            return (
                                <SelectField
                                    key={field.variable}
                                    id={id}
                                    label={field.label}
                                    value={typeof value === 'string' ? value : ''}
                                    onChange={(next) => set(field.variable, next === '' ? null : next)}
                                    options={field.options ?? []}
                                    placeholder="Choose"
                                    issues={issues(field.variable)}
                                />
                            )
                        if (field.type === 'boolean')
                            return (
                                <YesNoField
                                    key={field.variable}
                                    id={id}
                                    label={field.label}
                                    value={typeof value === 'boolean' ? value : null}
                                    onValueChange={(next) => set(field.variable, next)}
                                    issues={issues(field.variable)}
                                />
                            )
                        if (field.type === 'number')
                            return (
                                <NumberField
                                    key={field.variable}
                                    id={id}
                                    label={field.label}
                                    integer
                                    value={typeof value === 'number' ? value : null}
                                    onValueChange={(next) => set(field.variable, next)}
                                    issues={issues(field.variable)}
                                />
                            )
                        if (field.type === 'date')
                            return (
                                <DateField
                                    key={field.variable}
                                    id={id}
                                    label={field.label}
                                    value={typeof value === 'string' ? value : null}
                                    onValueChange={(next) => set(field.variable, next)}
                                    issues={issues(field.variable)}
                                />
                            )
                        return (
                            <TextField
                                key={field.variable}
                                id={id}
                                label={field.label}
                                value={typeof value === 'string' ? value : ''}
                                onChange={(next) => set(field.variable, next === '' ? null : next)}
                                issues={issues(field.variable)}
                            />
                        )
                    })}
                </Stack>
            </InspectorSection>
            <InspectorSection title={`What the rules did (${String(run.effects.length)})`}>
                <DataTable
                    variant="list"
                    columns={columns}
                    rows={run.effects.map((effect, index) => ({ ...effect, id: `${effect.rule}-${String(index)}` }))}
                    rowKey={(effect) => effect.id}
                    rowHeight="auto"
                    minWidth="auto"
                    columnHeads={false}
                    words={{ empty: 'No rule acts on the form as it is filled.' }}
                />
            </InspectorSection>
            {run.broken.length > 0 && (
                <InspectorSection title={`Cannot run (${String(run.broken.length)})`}>
                    <DataTable
                        variant="list"
                        columns={[
                            { id: 'rule', header: 'Rule', width: 'minmax(8rem,1fr)', cell: (one) => ruleName(one.rule), stack: 'lead' },
                            { id: 'why', header: 'Why', width: 'minmax(10rem,1.4fr)', cell: (one) => one.message },
                        ]}
                        rows={run.broken.map((one, index) => ({ ...one, id: `${one.rule}-${String(index)}` }))}
                        rowKey={(one) => one.id}
                        rowHeight="auto"
                        minWidth="auto"
                        columnHeads={false}
                    />
                </InspectorSection>
            )}
        </Inspector>
    )
}
