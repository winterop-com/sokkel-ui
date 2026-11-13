import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { Banner } from '@winterop-com/sokkel-ui/Banner'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SourceSheet } from '@winterop-com/sokkel-ui/SourceSheet'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { FileJson, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'

import { cellOf, forward, households, receiptOf, receipts, STATE_WORDS, withdraw, type Receipt } from '../data/backend'
import { formOf, gridCells, PERIOD_LABEL, type Form, type Question } from '../data/forms'
import { placeName } from '../data/geo'
import { answerText, count, KindBadge, NUMBER, onDay, sectionTrail, StateChip, useFoot, when } from '../ui'

interface AnswerRow {
    id: string
    part: string
    question: Question
    text: string
}

const ANSWER_COLUMNS: DataColumn<AnswerRow>[] = [
    {
        id: 'question',
        header: 'Question',
        width: 'minmax(12rem,2fr)',
        cell: (row) => (
            <Stack gap="none">
                <span className="text-help text-muted-foreground">{row.part}</span>
                <span className="font-medium">{row.question.label}</span>
            </Stack>
        ),
    },
    { id: 'key', header: 'Key', width: '9rem', cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.id}</span> },
    { id: 'answer', header: 'Answer', width: 'minmax(8rem,1fr)', cell: (row) => row.text, stack: 'primary' },
]

/** The answers in the order the form asks them; a question left unanswered is not in the record, so it is not here. */
function answerRows(form: Form, receipt: Receipt): AnswerRow[] {
    return form.sections.flatMap((section) =>
        section.questions.flatMap((question) => {
            const text = answerText(question, receipt.answers[question.id] ?? null)
            return text === '' ? [] : [{ id: question.id, part: section.title, question, text }]
        }),
    )
}

function GridAnswers({ form, receipt }: { form: Form; receipt: Receipt }) {
    const grid = form.grid
    if (grid === undefined) return null
    type Line = (typeof grid.rows)[number]
    const columns: DataColumn<Line>[] = [
        { id: 'label', header: 'Question', width: 'minmax(12rem,1fr)', cell: (row) => row.label },
        ...gridCells(grid).map((category): DataColumn<Line> => ({
            id: category.value,
            header: category.label,
            band: category.band,
            width: '6rem',
            align: 'end',
            cell: (row) => {
                const value = cellOf(receipt.answers, row.id, category.value)
                return value === null ? '' : NUMBER.format(value)
            },
        })),
    ]
    return (
        <DataTable
            variant="list"
            columns={columns}
            rows={[...grid.rows]}
            rowKey={(row) => row.id}
            groupBy="part"
            minWidth="auto"
            stackBelow={640}
        />
    )
}

/** How many questions a receipt answers, as its answers list counts them. */
function answeredIn(form: Form | undefined, receipt: Receipt): number {
    if (form === undefined) return 0
    return form.grid === undefined
        ? answerRows(form, receipt).length
        : Object.values(receipt.answers).filter((value) => value !== null).length
}

/** A receipt's body, the same on its page and in the sheet over the list: what arrived, what it is for, every answer and where it went. */
export function ReceiptBody({ receipt }: { receipt: Receipt }) {
    const form = formOf(receipt.formId)
    const { rows: homes } = useCollection(households)
    const household = homes?.find((home) => home.id === receipt.householdId)
    const answered = answeredIn(form, receipt)
    return (
        <Stack gap="page">
            {receipt.state === 'rejected' && receipt.refusal !== null && (
                <Banner tone="critical">
                    Refused by the register: {receipt.refusal} Change nothing here; file the record again once it is put right, or send this
                    one on again.
                </Banner>
            )}
            <Section title="Received" description="The record as it arrived, not a view of what the register holds now.">
                <DescriptionList
                    columns={2}
                    layout="stacked"
                    items={[
                        { term: 'Received', value: when(receipt.receivedAt) },
                        { term: 'Receipt ID', value: receipt.receipt, code: true },
                        {
                            term: 'Form',
                            value: form === undefined ? receipt.formId : <TextLink href={`#/forms/${form.id}`}>{form.title}</TextLink>,
                        },
                        { term: 'Answers', value: String(answered), numeric: true },
                        { term: 'Filed by', value: receipt.by },
                        {
                            term: 'Identifier',
                            value: receipt.seed === null ? 'Entered by hand' : `Test data, seed ${String(receipt.seed)}`,
                        },
                    ]}
                />
            </Section>
            <Section title="Filed for" description="Where and when the record is for, read off the stored record.">
                <DescriptionList
                    columns={2}
                    layout="stacked"
                    items={[
                        { term: 'Place', value: <TextLink href={`#/places/${receipt.place}`}>{placeName(receipt.place)}</TextLink> },
                        ...(receipt.period === null
                            ? []
                            : [
                                  { term: 'Period', value: receipt.period, code: true },
                                  { term: 'Period type', value: form?.period === undefined ? '' : PERIOD_LABEL[form.period] },
                              ]),
                        ...(receipt.visitDate === null ? [] : [{ term: 'Visit date', value: onDay(receipt.visitDate) }]),
                        ...(receipt.householdId === null
                            ? []
                            : [
                                  {
                                      term: 'Household',
                                      value: (
                                          <TextLink href={`#/people/${receipt.householdId}`}>
                                              {household?.identifier ?? receipt.householdId}
                                          </TextLink>
                                      ),
                                  },
                              ]),
                        { term: 'State', value: <StateChip state={receipt.state} /> },
                    ]}
                />
            </Section>
            <Section
                variant="flat"
                title="Answers"
                meta={`${String(answered)} answered`}
                description="Every question the record answers, in the order the form asks them. A question left unanswered is not in the record."
            >
                {form === undefined ? (
                    <p className="text-help text-muted-foreground">
                        The server no longer serves the form this record answers, so there are no questions to show.
                    </p>
                ) : form.grid === undefined ? (
                    <DataTable
                        variant="list"
                        columns={ANSWER_COLUMNS}
                        rows={answerRows(form, receipt)}
                        rowKey={(row) => row.id}
                        rowHeight="auto"
                        minWidth="auto"
                    />
                ) : (
                    <GridAnswers form={form} receipt={receipt} />
                )}
            </Section>
            <Section variant="flat" title="History" description="Where the record has been since it arrived.">
                <Timeline
                    events={receipt.history.map((entry, index) => ({
                        id: String(index),
                        title: `${STATE_WORDS[entry.state].label} by ${entry.by}`,
                        at: when(entry.at),
                        detail: entry.note,
                        tone:
                            entry.state === 'rejected'
                                ? 'failed'
                                : entry.state === 'forwarded'
                                  ? 'succeeded'
                                  : entry.state === 'received'
                                    ? 'running'
                                    : 'neutral',
                    }))}
                />
            </Section>
        </Stack>
    )
}

/** What can be done with a receipt where it is now: send it on, or take it back out of the register. */
export function ReceiptActions({ receipt }: { receipt: Receipt }) {
    const [asking, setAsking] = useState(false)
    const [busy, setBusy] = useState(false)
    const sendOn = () => {
        setBusy(true)
        forward(receipt).then(
            (next) => {
                setBusy(false)
                if (next.state === 'rejected') toast.error('Refused by the register', { description: next.refusal ?? undefined })
                else toast.success('Sent on', { description: 'The register took the record.' })
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not sent on', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }
    const takeBack = () => {
        setBusy(true)
        withdraw(receipt, 'Taken back from the receipt.').then(
            () => {
                setBusy(false)
                setAsking(false)
                toast.success('Withdrawn', { description: 'The register keeps the record, no longer active.' })
            },
            (failure: unknown) => {
                setBusy(false)
                toast.error('Not withdrawn', { description: failure instanceof Error ? failure.message : String(failure) })
            },
        )
    }
    return (
        <>
            {(receipt.state === 'received' || receipt.state === 'rejected') && (
                <Button size="sm" onClick={sendOn} disabled={busy}>
                    <Send aria-hidden />
                    {receipt.state === 'rejected' ? 'Send on again' : 'Send on'}
                </Button>
            )}
            {receipt.state === 'forwarded' && (
                <Button size="sm" variant="outline" onClick={() => setAsking(true)}>
                    <Undo2 aria-hidden />
                    Withdraw
                </Button>
            )}
            <ConfirmDialog
                open={asking}
                onOpenChange={setAsking}
                question="Withdraw this record from the register?"
                detail="The register keeps it, no longer active, and its counts leave every report. This cannot be sent on again."
                confirm={{ label: 'Withdraw', onConfirm: takeBack, busy, busyLabel: 'Withdrawing', destructive: true }}
            />
        </>
    )
}

/** A receipt on a page of its own. */
export function ReceiptPage({ code }: { code: string }) {
    const { rows, error } = useCollection(receipts)
    const receipt = receiptOf(rows, code)
    const form = formOf(receipt?.formId)
    const [raw, setRaw] = useState(false)
    const [sourceWidth, setSourceWidth] = useStored('source-sheet-width', 576)
    useFoot(
        receipt === undefined ? undefined : `${count(answeredIn(form, receipt), 'answer')} · received ${when(receipt.receivedAt)}`,
        undefined,
        [receipt?.receipt, receipt?.state],
    )
    return (
        <Page>
            <PageHeader
                title={form?.title ?? 'Response'}
                code={code}
                trail={sectionTrail('Responses', '/responses')}
                trailInTop
                meta={
                    receipt === undefined || form === undefined ? undefined : (
                        <>
                            <KindBadge form={form} />
                            <StateChip state={receipt.state} />
                        </>
                    )
                }
                actions={
                    receipt === undefined ? undefined : (
                        <>
                            <ApiLink path={`/responses/${receipt.receipt}`} />
                            <Button size="sm" variant="outline" onClick={() => setRaw(true)}>
                                <FileJson aria-hidden />
                                Raw record
                            </Button>
                            <ReceiptActions receipt={receipt} />
                        </>
                    )
                }
            />
            <PageState
                loading={rows === undefined && error === undefined}
                error={
                    error ??
                    (rows !== undefined && receipt === undefined ? `The server holds no response under the receipt ${code}.` : undefined)
                }
                status={rows !== undefined && receipt === undefined ? 404 : undefined}
                empty={false}
            >
                {receipt === undefined ? (
                    <p className="text-help text-muted-foreground">The server holds no response under the receipt {code}.</p>
                ) : (
                    <>
                        <ReceiptBody receipt={receipt} />
                        <SourceSheet
                            open={raw}
                            onOpenChange={setRaw}
                            title="Raw record"
                            description="The record exactly as the server stored it."
                            size={sourceWidth}
                            onSizeChange={setSourceWidth}
                            value={receipt}
                            language="json"
                        />
                    </>
                )}
            </PageState>
        </Page>
    )
}
