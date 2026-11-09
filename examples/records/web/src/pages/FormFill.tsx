import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { ComputedField } from '@winterop-com/sokkel-ui/ComputedField'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { FormBar } from '@winterop-com/sokkel-ui/FormBar'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { IssueCount, type IssueEntry } from '@winterop-com/sokkel-ui/IssueMark'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PeriodPicker } from '@winterop-com/sokkel-ui/PeriodPicker'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Input } from '@winterop-com/sokkel-ui/primitives/input'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { tableEditing } from '@winterop-com/sokkel-ui/table-editing'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TimeField } from '@winterop-com/sokkel-ui/TimeField'
import { TreeSelect } from '@winterop-com/sokkel-ui/TreeSelect'
import { YesNoField } from '@winterop-com/sokkel-ui/YesNoField'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { Eraser, Send, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { day, households, Refused, submit, Unreachable } from '../data/backend'
import {
    answerIssue,
    cellKey,
    formOf,
    KIND,
    lastWholePeriod,
    questionCount,
    questionsOf,
    rangeHint,
    testAnswers,
    testPlace,
    type AnswerValue,
    type FillContext,
    type Form,
    type Question,
} from '../data/forms'
import { LEVEL_LABEL, PLACE_TREE, pathOf, placeOf } from '../data/geo'
import { count, KindBadge, useFoot } from '../ui'

/** Where a kind of form is filed from, said under the place's label. */
const PLACE_MEANING: Record<Form['kind'], string> = {
    periodic: 'The place the counts are for. The report is filed under it and its period.',
    event: 'The site the visit was made at. The record is filed under it.',
    registration: 'Where the household lives. Its visits are filed under the same place.',
    followup: 'The site the visit was made from, usually where the household was registered.',
}

interface GridRow {
    id: string
    part: string
    label: string
}

/** A form opened to fill in: where and when it is for, its sections of questions or its grid of counts, and Submit at the foot. */
export function FormFill({ formId, householdId, keepPlace }: { formId: string; householdId?: string; keepPlace: boolean }) {
    const form = formOf(formId)
    if (form === undefined)
        return (
            <Page>
                <PageHeader title="No such form" onBack={() => go('/forms')} words={{ back: 'All forms' }} />
                <PageState
                    loading={false}
                    status={404}
                    error={`The server serves no form called ${formId}. The form list names every one it serves.`}
                >
                    {null}
                </PageState>
            </Page>
        )
    return <Filling form={form} householdId={householdId} keepPlace={keepPlace} />
}

function Filling({ form, householdId: givenHousehold, keepPlace }: { form: Form; householdId?: string; keepPlace: boolean }) {
    const today = day(0)
    const [lastPlace, setLastPlace] = useStored<string | null>('last-place', null)
    const outside = (id: string): string | undefined => {
        const level = placeOf(id)?.level
        if (form.levels === undefined || level === undefined || form.levels.includes(level)) return undefined
        return `Filed per ${form.levels.map((each) => LEVEL_LABEL[each].toLowerCase()).join(' or ')}`
    }
    const startPlace =
        keepPlace && lastPlace !== null && placeOf(lastPlace) !== undefined && outside(lastPlace) === undefined ? lastPlace : null
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
    const [place, setPlace] = useState<string | null>(startPlace)
    const [period, setPeriod] = useState<string | null>(form.period === undefined ? null : lastWholePeriod(form.period, today))
    const [periodIssue, setPeriodIssue] = useState<string | null>(null)
    const [visitDate, setVisitDate] = useState<string | null>(form.kind === 'periodic' ? null : today)
    const [householdId, setHouseholdId] = useState<string | null>(givenHousehold ?? null)
    const [fieldIssues, setFieldIssues] = useState<Record<string, string | null>>({})
    const [serverIssues, setServerIssues] = useState<Record<string, string>>({})
    const [tried, setTried] = useState(false)
    const [busy, setBusy] = useState(false)
    const [seedText, setSeedText] = useState('')
    const [seed, setSeed] = useState<number | null>(null)
    const [openIssue, setOpenIssue] = useState<string | null>(null)
    const { rows: homes } = useCollection(households)
    const household = homes?.find((home) => home.id === householdId)
    const offered = (homes ?? []).filter((home) => home.status === 'active' || home.id === householdId)
    // A visit opened for a household reports from where it was registered until another place is chosen.
    useEffect(() => {
        if (household !== undefined && place === null) setPlace(household.site)
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- only the household arriving or changing sets the place
    }, [household?.id])

    const context: FillContext = { place, period, visitDate, person: household === undefined ? null : { householdSize: household.size } }
    const questions = questionsOf(form)
    const asked = questions.filter((question) => question.type !== 'computed')

    const set = (id: string, value: AnswerValue) => {
        setAnswers((all) => ({ ...all, [id]: value }))
        setServerIssues((all) => {
            const { [id]: _, ...rest } = all
            return rest
        })
    }

    // What stops a submit: the context, each answer's own issue, a required question left empty once a submit was tried, and the server's refusals.
    const issues: { id: string; label: string; text: string }[] = []
    if (place === null && tried) issues.push({ id: 'place', label: 'Reporting from', text: 'Say where the record is from.' })
    if (form.period !== undefined && (period === null || periodIssue !== null))
        issues.push({ id: 'period', label: 'Reporting period', text: periodIssue ?? 'Say which period the report is for.' })
    if (form.kind !== 'periodic' && visitDate === null && tried)
        issues.push({ id: 'visit-date', label: 'Visit date', text: 'Say when the visit was.' })
    if (form.kind === 'followup' && householdId === null && tried)
        issues.push({ id: 'household', label: 'Answering for', text: 'Say which household the visit was to.' })
    for (const question of asked) {
        const value = answers[question.id] ?? null
        const own = fieldIssues[question.id] ?? answerIssue(question, value) ?? serverIssues[question.id] ?? null
        if (own !== null) issues.push({ id: question.id, label: question.label, text: own })
        else if (tried && question.required === true && (value === null || value === ''))
            issues.push({ id: question.id, label: question.label, text: 'Answer this question.' })
    }
    const issueOf = (id: string) => issues.find((issue) => issue.id === id)?.text ?? null
    const answered =
        form.grid === undefined
            ? asked.filter((question) => (answers[question.id] ?? null) !== null && answers[question.id] !== '').length
            : Object.values(answers).filter((value) => value !== null).length
    const total = form.grid === undefined ? asked.length : questionCount(form)
    useFoot(`${String(answered)} of ${String(total)} questions answered`, undefined, [answered, total])

    const fill = () => {
        const typed = Number.parseInt(seedText, 10)
        const used = Number.isInteger(typed) ? typed : 1000 + Math.floor(Math.random() * 9000)
        setAnswers(testAnswers(form, used))
        setSeed(used)
        setSeedText(String(used))
        if (place === null) setPlace(form.id === 'FRM-STOCK' ? (pathOf(testPlace(used))[1]?.id ?? testPlace(used)) : testPlace(used))
        setFieldIssues({})
        setServerIssues({})
        toast.success('Filled with test data', { description: `Seed ${String(used)}. Change anything you like before submitting.` })
    }

    const clear = () => {
        setAnswers({})
        setFieldIssues({})
        setServerIssues({})
        setTried(false)
        setSeed(null)
        toast('Cleared', { description: 'The answers are empty again. Where and when the record is for stay as they were.' })
    }

    const send = () => {
        setTried(true)
        const missing = asked.some(
            (question) => question.required === true && ((answers[question.id] ?? null) === null || answers[question.id] === ''),
        )
        if (
            issues.length > 0 ||
            missing ||
            place === null ||
            (form.kind !== 'periodic' && visitDate === null) ||
            (form.kind === 'followup' && householdId === null)
        ) {
            toast.error('Not filed yet', { description: 'Some answers need attention; the count beside Submit lists them.' })
            return
        }
        setBusy(true)
        const computed = Object.fromEntries(
            questions.flatMap((question) =>
                question.formula === undefined ? [] : [[question.id, question.formula.compute(answers, context)]],
            ),
        )
        submit({ formId: form.id, place, period, visitDate, householdId, answers: { ...answers, ...computed }, seed }).then(
            (receipt) => {
                setBusy(false)
                if (keepPlace) setLastPlace(place)
                toast.success('Filed', {
                    description: `Stored as receipt ${receipt.receipt.slice(0, 12)}, not yet sent on to the register.`,
                })
                go(`/responses/${receipt.receipt}`)
            },
            (failure: unknown) => {
                setBusy(false)
                if (failure instanceof Refused) {
                    setServerIssues(Object.fromEntries(failure.issues.map((issue) => [issue.question, issue.text])))
                    toast.error('The server refused the response', {
                        description: `${count(failure.issues.length, 'issue')}; nothing was stored.`,
                    })
                } else if (failure instanceof Unreachable)
                    toast.error('Not filed', {
                        description: 'The server is not answering, so nothing was stored. Try again once it answers.',
                    })
                else toast.error('Not filed', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }

    const list: IssueEntry[] = issues.map((issue) => ({
        label: issue.label,
        issue: { tone: 'critical', text: issue.text },
        onGo: () => {
            setOpenIssue(issue.id)
            document.getElementById(issue.id === 'period' ? 'period' : issue.id)?.focus()
        },
    }))
    const holdIssue = (id: string) => ({
        issueOpen: openIssue === id,
        onIssueOpenChange: (open: boolean) => setOpenIssue(open ? id : null),
    })

    return (
        <Stack gap="none" className="min-h-full">
            <Page className="flex-1">
                <PageHeader
                    title={form.title}
                    code={form.id}
                    onBack={() => go('/forms')}
                    words={{ back: 'All forms' }}
                    description={form.description}
                    meta={
                        <>
                            <KindBadge form={form} />
                            <span>{count(total, 'question')}</span>
                            {form.repeats === true && <span>Each visit is its own record</span>}
                        </>
                    }
                    actions={<ApiLink path={`/forms/${form.id}`} />}
                />
                <Section
                    title="Filed for"
                    description="Where and when the record is for. It is context, not an answer: the server files the whole record under it."
                >
                    <Columns count={2} min="md" gap="lg" fields>
                        <Field
                            id="place"
                            label={form.kind === 'registration' ? 'Registered at' : 'Reporting from'}
                            required
                            description={PLACE_MEANING[form.kind]}
                            help={keepPlace ? 'The place chosen is kept for the next form.' : undefined}
                            error={issueOf('place')}
                            {...holdIssue('place')}
                        >
                            <TreeSelect
                                id="place"
                                nodes={PLACE_TREE}
                                value={place === null ? [] : [place]}
                                onValueChange={(ids) => setPlace(ids[0] ?? null)}
                                unavailable={(node) => outside(node.id)}
                                defaultExpanded={place === null ? ['sierra-leone'] : pathOf(place).map((one) => one.id)}
                                invalid={issueOf('place') !== null}
                            />
                        </Field>
                        {form.period !== undefined && (
                            <Field
                                id="period"
                                label="Reporting period"
                                required
                                hint={form.period}
                                description="The period the counts are for. A report for another period is a record of its own."
                                error={periodIssue === null ? issueOf('period') : null}
                                {...holdIssue('period')}
                            >
                                <PeriodPicker
                                    id="period"
                                    type={form.period}
                                    value={period}
                                    onValueChange={setPeriod}
                                    onIssueChange={setPeriodIssue}
                                    today={today}
                                />
                            </Field>
                        )}
                        {form.kind !== 'periodic' && (
                            <DateField
                                id="visit-date"
                                label="Visit date"
                                required
                                description="The day the visit was made. The record is filed under it."
                                value={visitDate}
                                onValueChange={setVisitDate}
                                max={today}
                                error={issueOf('visit-date')}
                                today={today}
                            />
                        )}
                        {form.kind === 'followup' && (
                            <Field
                                id="household"
                                label="Answering for"
                                required
                                description="The registered household the visit was to."
                                help={
                                    offered.length === 0 ? (
                                        <>
                                            No household is registered yet.{' '}
                                            <TextLink href="#/forms/FRM-ENROLL">Register one first.</TextLink>
                                        </>
                                    ) : household === undefined ? undefined : (
                                        <>
                                            {count(household.size, 'person', 'people')}, registered at{' '}
                                            {placeOf(household.site)?.name ?? household.site}.{' '}
                                            <TextLink href={`#/people/${household.id}`}>Open the household</TextLink>
                                        </>
                                    )
                                }
                                error={issueOf('household')}
                                {...holdIssue('household')}
                            >
                                <NativeSelect
                                    id="household"
                                    className="w-full"
                                    value={householdId ?? ''}
                                    onChange={(event) => {
                                        const next = event.target.value === '' ? null : event.target.value
                                        setHouseholdId(next)
                                        const home = homes?.find((one) => one.id === next)
                                        if (home !== undefined && place === null) setPlace(home.site)
                                    }}
                                >
                                    <NativeSelectOption value="">Not chosen</NativeSelectOption>
                                    {offered.map((home) => (
                                        <NativeSelectOption key={home.id} value={home.id}>
                                            {home.identifier}, {placeOf(home.site)?.name ?? home.site}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                        )}
                        {form.kind === 'registration' && (
                            <ComputedField
                                id="identifier"
                                label="Household identifier"
                                value={null}
                                why="The server gives the household its identifier when the record is filed, and every visit names it."
                                words={{ pending: 'Given when the record is filed', computed: 'from the server' }}
                            />
                        )}
                    </Columns>
                </Section>
                {form.grid !== undefined && <CountGrid form={form} answers={answers} onAnswer={set} />}
                {form.sections.map((section) => (
                    <Section
                        key={section.id}
                        title={section.title}
                        description={section.description}
                        meta={count(section.questions.length, 'question')}
                    >
                        <Columns
                            count={section.questions.some((question) => question.type === 'multiline') ? 2 : 3}
                            min="sm"
                            gap="lg"
                            fields
                        >
                            {section.questions.map((question) => (
                                <QuestionField
                                    key={question.id}
                                    question={question}
                                    value={answers[question.id] ?? null}
                                    context={context}
                                    answers={answers}
                                    onAnswer={(value) => set(question.id, value)}
                                    onIssue={(text) =>
                                        setFieldIssues((all) => (all[question.id] === text ? all : { ...all, [question.id]: text }))
                                    }
                                    error={issueOf(question.id)}
                                    hold={holdIssue(question.id)}
                                    today={today}
                                />
                            ))}
                        </Columns>
                    </Section>
                ))}
            </Page>
            <FormBar
                note={seed === null ? `${String(answered)} of ${String(total)} answered` : `Test data from seed ${String(seed)}`}
                start={
                    <Row gap="sm">
                        <Button size="sm" variant="ghost" onClick={clear} disabled={Object.keys(answers).length === 0}>
                            <Eraser aria-hidden />
                            Clear
                        </Button>
                        <Button size="sm" variant="outline" onClick={fill}>
                            <Sparkles aria-hidden />
                            Fill with test data
                        </Button>
                        <Input
                            aria-label="Seed"
                            title="The same seed fills in the same answers. Leave it empty for new ones."
                            placeholder="Seed"
                            inputMode="numeric"
                            className="w-24 font-mono"
                            value={seedText}
                            onChange={(event) => setSeedText(event.target.value.replace(/\D/g, ''))}
                        />
                    </Row>
                }
            >
                {issues.length > 0 && <IssueCount critical={issues.length} list={list} />}
                <Button size="sm" onClick={send} disabled={busy} reason={busy ? 'Filing' : undefined}>
                    <Send aria-hidden />
                    {busy ? 'Submitting' : 'Submit'}
                </Button>
            </FormBar>
        </Stack>
    )
}

function QuestionField({
    question,
    value,
    context,
    answers,
    onAnswer,
    onIssue,
    error,
    hold,
    today,
}: {
    question: Question
    value: AnswerValue
    context: FillContext
    answers: Record<string, AnswerValue>
    onAnswer: (value: AnswerValue) => void
    onIssue: (text: string | null) => void
    error: string | null
    hold: { issueOpen: boolean; onIssueOpenChange: (open: boolean) => void }
    today: string
}) {
    const common = {
        id: question.id,
        label: question.label,
        required: question.required,
        description: question.description,
        error,
        ...hold,
    }
    if (question.type === 'computed' && question.formula !== undefined) {
        const worked = question.formula.compute(answers, context)
        return (
            <ComputedField
                id={question.id}
                label={question.label}
                value={worked === null ? null : String(worked)}
                unit={question.unit}
                why={question.formula.why}
                formula={question.formula.expression}
                description={question.description}
                numeric
            />
        )
    }
    if (question.type === 'integer' || question.type === 'decimal')
        return (
            <NumberField
                {...common}
                hint={question.unit}
                help={question.help ?? rangeHint(question)}
                integer={question.type === 'integer'}
                min={question.min}
                max={question.max}
                value={typeof value === 'number' ? value : null}
                onValueChange={(next) => onAnswer(next)}
                onIssueChange={(issue) => onIssue(issue === null ? null : issue.text)}
            />
        )
    if (question.type === 'yesno')
        return (
            <YesNoField
                {...common}
                help={question.help}
                yesOnly={question.yesOnly}
                value={typeof value === 'boolean' ? value : null}
                onValueChange={(next) => onAnswer(question.yesOnly === true && next === false ? null : next)}
            />
        )
    if (question.type === 'choice')
        return (
            <Field {...common} help={question.help}>
                <NativeSelect
                    id={question.id}
                    className="w-full"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onAnswer(event.target.value === '' ? null : event.target.value)}
                >
                    <NativeSelectOption value="">Not answered</NativeSelectOption>
                    {question.options?.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                            {option.label}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </Field>
        )
    if (question.type === 'time')
        return (
            <TimeField
                {...common}
                help={question.help}
                clock={24}
                value={typeof value === 'string' ? value : null}
                onValueChange={(next) => onAnswer(next)}
                onIssueChange={(issue) => onIssue(issue === null ? null : issue.text)}
            />
        )
    if (question.type === 'date')
        return (
            <DateField
                {...common}
                help={question.help}
                today={today}
                value={typeof value === 'string' ? value : null}
                onValueChange={(next) => onAnswer(next)}
                onIssueChange={(issue) => onIssue(issue === null ? null : issue.text)}
            />
        )
    return (
        <TextField
            {...common}
            help={question.help}
            multiline={question.type === 'multiline'}
            rows={question.type === 'multiline' ? 4 : undefined}
            value={typeof value === 'string' ? value : ''}
            onChange={(next) => onAnswer(next)}
        />
    )
}

/** A periodic report's counts: a row per question under its part, a column per category, a total for each, every cell saved as it is entered. */
function CountGrid({
    form,
    answers,
    onAnswer,
}: {
    form: Form
    answers: Record<string, AnswerValue>
    onAnswer: (id: string, value: AnswerValue) => void
}) {
    const grid = form.grid
    const rows: GridRow[] = useMemo(() => [...(grid?.rows ?? [])], [grid])
    if (grid === undefined) return null
    const cell = (row: GridRow, category: string) => {
        const value = answers[cellKey(row.id, category)]
        return typeof value === 'number' ? value : null
    }
    const sum = (values: readonly (number | null)[]) => values.reduce<number>((all, value) => all + (value ?? 0), 0)
    const rowTotal = (row: GridRow) => sum(grid.categories.map((category) => cell(row, category.value)))
    const columns: DataColumn<GridRow>[] = [
        { id: 'label', header: 'Question', width: 'minmax(14rem,1fr)', cell: (row) => row.label },
        ...grid.categories.map((category): DataColumn<GridRow> => ({
            id: category.value,
            header: category.label,
            width: '6.5rem',
            align: 'end',
            cell: (row) => cell(row, category.value)?.toLocaleString('en-US') ?? '',
            aggregate: (group) => sum(group.map((row) => cell(row, category.value))).toLocaleString('en-US'),
            edit: {
                editor: 'number',
                value: (row) => cell(row, category.value),
                validate: (value) =>
                    value !== null && (!Number.isInteger(value) || value < 0) ? 'Counts are whole numbers, 0 or more.' : undefined,
                save: async (row, value) => {
                    if (value !== null && value > 999) throw new Error('A month holds at most 999. Check the count with the station.')
                    onAnswer(cellKey(row.id, category.value), value)
                },
            },
        })),
        {
            id: 'total',
            header: 'Total',
            width: '6.5rem',
            align: 'end',
            cell: (row) => <span className="font-medium">{rowTotal(row).toLocaleString('en-US')}</span>,
            aggregate: (group) => sum(group.map(rowTotal)).toLocaleString('en-US'),
        },
    ]
    return (
        <Section
            title="Counts"
            description={`By ${grid.by}. Each count is kept as it is entered; Tab moves to the next, Enter down.`}
            meta={KIND[form.kind].label}
            flush
        >
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                groupBy="part"
                minWidth="auto"
                stackBelow={720}
                editing={tableEditing}
                hover={false}
                variant="list"
            />
        </Section>
    )
}
