import { DataTable, type DataAction, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Timeline, type TimelineEvent } from '@winterop-com/sokkel-ui/Timeline'
import { DashboardGrid, DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { TimeRangePicker } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { ArrowUpDown, RotateCcwIcon, Undo2, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cancelPlan, changePlan, retryCharge, setInvoiceStatus, setOwner } from '../backend'
import { usage } from '../metrics'
import {
    DAY,
    PEOPLE,
    PLAN_NAMES,
    PLANS,
    PRICE,
    REGION_NAMES,
    counted,
    dateOfDay,
    dayOf,
    longDay,
    shortDay,
    type Invoice,
    type InvoiceStatus,
    type Person,
    type Plan,
    type Team,
} from '../model'
import { describe, PlanChip, STATUSES, useSpans } from '../parts'
import { useLoaded } from '../state'
import { fromPicker, go, pickerValue, PRESETS } from '../view'
import { standing } from '../world'

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Moves a team to another plan or number of seats, saying what it will pay. */
function PlanDialog({ team, open, onOpenChange }: { team: Team; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { money, me, world } = useLoaded()
    const now = standing(team, world.now)
    const [plan, setPlan] = useState<Plan>(now.status === 'churned' || now.plan === 'free' ? 'team' : now.plan)
    const [seats, setSeats] = useState<number | null>(Math.max(1, now.seats || 3))
    const [busy, setBusy] = useState(false)
    const next = PRICE[plan] * (seats ?? 0)
    const was = now.status === 'churned' ? 0 : now.mrr
    const same = now.status !== 'churned' && plan === now.plan && seats === now.seats
    const why = seats === null || seats < 1 ? 'A plan needs at least one seat.' : same ? 'This is the plan it is on.' : undefined
    return (
        <DialogShell
            open={open}
            onOpenChange={(value) => !busy && onOpenChange(value)}
            title={now.status === 'churned' ? `Restart ${team.name}` : `Change ${team.name}'s plan`}
            description={`It pays ${money(was)} a month now.`}
            confirm={{
                label: now.status === 'churned' ? 'Restart' : 'Change plan',
                why,
                busy,
                busyLabel: 'Changing',
                onConfirm: () => {
                    if (seats === null) return
                    setBusy(true)
                    void changePlan(team, plan, seats, me).then(() => {
                        setBusy(false)
                        onOpenChange(false)
                        toast.add({
                            type: 'success',
                            title: `${team.name} is on ${PLAN_NAMES[plan]}`,
                            description: `${String(seats)} seats, ${money(next)} a month`,
                        })
                    })
                },
            }}
        >
            <Stack gap="lg">
                <Field id="plan-plan" label="Plan">
                    <Segmented
                        id="plan-plan"
                        label="Plan"
                        value={plan}
                        onValueChange={setPlan}
                        options={PLANS.map((value) => ({
                            value,
                            label: `${PLAN_NAMES[value]}${PRICE[value] > 0 ? `, ${money(PRICE[value])} a seat` : ''}`,
                        }))}
                        fill
                    />
                </Field>
                <NumberField id="plan-seats" label="Seats" integer stepper min={1} max={500} value={seats} onValueChange={setSeats} />
                <DescriptionList
                    items={[
                        { term: 'Each month', value: money(next), numeric: true },
                        { term: 'Change', value: `${next >= was ? '+' : '-'}${money(Math.abs(next - was))}`, numeric: true },
                    ]}
                />
            </Stack>
        </DialogShell>
    )
}

/** One team's page: its plan and what it pays, its plan history, its members at work, and its invoices with what can be done about them. */
export function Customer({ id }: { id: string }) {
    const { world, money, me, href, view, setView } = useLoaded()
    const { span } = useSpans()
    const team = world.byId.get(id)
    const [planOpen, setPlanOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [refunding, setRefunding] = useState<Invoice | null>(null)
    const invoices = useMemo(() => [...(world.invoicesOf.get(id) ?? [])].reverse(), [world, id])
    const work = useMemo(() => (team === undefined ? undefined : usage(team, span, world.now)), [team, span, world.now])

    if (team === undefined || work === undefined)
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>No such team</EmptyTitle>
                    <EmptyDescription>No team has the id {id}. It may have been made before the demo data were reset.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go(href('customers'))}>
                    All customers
                </Button>
            </Empty>
        )

    const now = standing(team, world.now)
    const lifetime = invoices.reduce((sum, invoice) => sum + (invoice.status === 'paid' ? invoice.amount : 0), 0)
    const months = team.firsts.paid === null ? 0 : Math.floor((world.now - team.firsts.paid) / (30 * DAY))
    const history: TimelineEvent[] = [...team.changes].reverse().map((change) => {
        const said = describe(change, team)
        return {
            id: change.id,
            title: capitalized(said.text.replace(`${team.name} `, '')),
            detail:
                change.kind === 'churn'
                    ? 'Left'
                    : `${PLAN_NAMES[change.plan]}, ${String(change.seats)} ${change.seats === 1 ? 'seat' : 'seats'}, ${money(PRICE[change.plan] * change.seats)} a month`,
            at: `${longDay(dayOf(change.at))}`,
            tone: said.tone === 'critical' ? 'failed' : said.tone === 'good' ? 'succeeded' : said.tone === 'warning' ? 'waiting' : 'info',
        }
    })
    const say = (invoice: Invoice, status: InvoiceStatus) =>
        setInvoiceStatus(invoice, status, me).then(() =>
            toast.add({ title: `${invoice.id} ${STATUSES[status]?.label?.toLowerCase() ?? status}`, description: money(invoice.amount) }),
        )
    const invoiceColumns: DataColumn<Invoice>[] = [
        { id: 'id', header: 'Invoice', width: '10rem', cell: (invoice) => <span className="font-mono">{invoice.id}</span> },
        { id: 'date', header: 'Date', width: '6.5rem', cell: (invoice) => <span className="tabular-nums">{shortDay(invoice.day)}</span> },
        { id: 'plan', header: 'Plan', width: '6.5rem', cell: (invoice) => <PlanChip plan={invoice.plan} /> },
        { id: 'status', header: 'State', width: '7rem', cell: (invoice) => <StatusChip status={invoice.status} statuses={STATUSES} /> },
        {
            id: 'amount',
            header: 'Amount',
            width: 'minmax(6rem,1fr)',
            align: 'end',
            cell: (invoice) => <span className="tabular-nums">{money(invoice.amount)}</span>,
        },
    ]
    const invoiceActions = (invoice: Invoice): DataAction[] => [
        {
            id: 'retry',
            label: 'Charge again',
            icon: <RotateCcwIcon />,
            disabled: invoice.status !== 'failed' && invoice.status !== 'open',
            onSelect: () =>
                void retryCharge(invoice, me).then((status) =>
                    toast.add(
                        status === 'paid'
                            ? { type: 'success', title: `${invoice.id} paid` }
                            : { type: 'error', title: `${invoice.id} declined again` },
                    ),
                ),
        },
        {
            id: 'paid',
            label: 'Mark paid',
            disabled: invoice.status === 'paid' || invoice.status === 'refunded',
            onSelect: () => void say(invoice, 'paid'),
        },
        {
            id: 'refund',
            label: 'Refund',
            icon: <Undo2 />,
            destructive: true,
            disabled: invoice.status !== 'paid',
            onSelect: () => setRefunding(invoice),
        },
    ]

    return (
        <>
            <PageHeader
                title={team.name}
                onBack={() => go(href('customers'))}
                meta={
                    <>
                        <PlanChip plan={now.plan} /> <StatusChip status={now.status} statuses={STATUSES} />
                    </>
                }
                actions={
                    <>
                        {now.status !== 'churned' && now.plan !== 'free' && (
                            <Button variant="outline" onClick={() => setCancelling(true)}>
                                <XIcon aria-hidden />
                                Cancel plan
                            </Button>
                        )}
                        <Button onClick={() => setPlanOpen(true)}>
                            <ArrowUpDown aria-hidden />
                            {now.status === 'churned' ? 'Restart' : 'Change plan'}
                        </Button>
                    </>
                }
            />
            <DashboardGrid>
                <StatPanel title="MRR" value={now.mrr} format={(value) => money(value)} color="chart-1" span="quarter" />
                <StatPanel title="Seats" value={now.seats} color="chart-2" span="quarter" />
                <StatPanel title="Paid in all" value={lifetime} format={(value) => money(value, true)} color="chart-3" span="quarter" />
                <StatPanel
                    title="Paying for"
                    value={team.firsts.paid === null ? null : months}
                    unit={months === 1 ? ' month' : ' months'}
                    color="chart-4"
                    words={{ noData: 'Never paid' }}
                    span="quarter"
                />
                <TimeSeriesPanel
                    title="Members at work"
                    subtitle="each day, against its seats"
                    span="two-thirds"
                    x={work.labels}
                    series={[
                        { name: 'Members at work', values: work.members, color: 'chart-2' },
                        { name: 'Seats', values: work.seats, color: 'muted-foreground', dashed: true },
                    ]}
                    bodyClassName="h-56"
                    actions={
                        <TimeRangePicker
                            value={pickerValue(view.range)}
                            onChange={(value) => setView({ range: fromPicker(value) })}
                            presets={PRESETS.filter((preset) => preset.id !== 'today')}
                            today={dateOfDay(dayOf(world.now))}
                        />
                    }
                    file={`${team.id}-usage`}
                />
                <DashboardPanel title="About" span="third">
                    <DescriptionList
                        termWidth="8rem"
                        items={[
                            { term: 'Country', value: `${team.country}, ${REGION_NAMES[team.region]}` },
                            { term: 'Signed up', value: longDay(dayOf(team.created)) },
                            { term: 'First project', value: team.project === null ? null : longDay(team.project) },
                            { term: 'Invited a teammate', value: team.invited === null ? null : longDay(team.invited) },
                            {
                                term: 'Looked after by',
                                value: (
                                    <InlineEdit
                                        label="Looked after by"
                                        editor="select"
                                        options={PEOPLE.map((person) => ({ value: person, label: person }))}
                                        value={team.owner}
                                        onSave={(owner) =>
                                            setOwner(team, owner as Person).then(() => {
                                                toast.add({ title: `${owner} looks after ${team.name}` })
                                            })
                                        }
                                    />
                                ),
                            },
                            { term: 'Team code', value: team.id, code: true },
                        ]}
                    />
                </DashboardPanel>
                <DashboardPanel
                    title="Invoices"
                    subtitle={`${String(invoices.length)} in all`}
                    span="two-thirds"
                    flush
                    empty={invoices.length === 0}
                    words={{ empty: 'It has never been billed: it is on Free.' }}
                >
                    <DataTable
                        variant="list"
                        framed={false}
                        minWidth="auto"
                        columns={invoiceColumns}
                        rows={invoices}
                        rowKey={(invoice) => invoice.id}
                        rowActions={invoiceActions}
                        paging="client"
                        defaultPageSize={10}
                        pageSizes={[10, 25, 50]}
                    />
                </DashboardPanel>
                <DashboardPanel title="Plan history" subtitle={counted(team.changes.length, 'change')} span="third">
                    <Timeline events={history} />
                </DashboardPanel>
            </DashboardGrid>
            {planOpen && <PlanDialog team={team} open={planOpen} onOpenChange={setPlanOpen} />}
            <ConfirmDialog
                open={cancelling}
                onOpenChange={setCancelling}
                question={`Cancel ${team.name}'s plan?`}
                detail={`It stops paying ${money(now.mrr)} a month, and counts as a team that left.`}
                confirm={{
                    label: 'Cancel plan',
                    destructive: true,
                    onConfirm: () => {
                        setCancelling(false)
                        void cancelPlan(team, me).then(() =>
                            toast.add({ title: `${team.name} has left`, description: `${money(now.mrr)} a month less` }),
                        )
                    },
                }}
            />
            <ConfirmDialog
                open={refunding !== null}
                onOpenChange={(open) => !open && setRefunding(null)}
                question={refunding === null ? '' : `Refund ${refunding.id}?`}
                detail={refunding === null ? undefined : `${money(refunding.amount)} goes back to ${team.name}, and leaves the revenue.`}
                confirm={{
                    label: 'Refund',
                    destructive: true,
                    onConfirm: () => {
                        if (refunding !== null) void say(refunding, 'refunded')
                        setRefunding(null)
                    },
                }}
            />
        </>
    )
}
