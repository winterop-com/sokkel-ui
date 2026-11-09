import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { ConfirmDialog, DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { goals } from '../collections'
import { flows, levels, revenue, type Segment } from '../metrics'
import {
    METRIC_NAMES,
    METRIC_SUMS,
    METRICS,
    PLAN_NAMES,
    PLANS,
    REGION_NAMES,
    REGIONS,
    dayFrom,
    dayOf,
    isoDay,
    longDay,
    shortDay,
    startOf,
    type Goal,
    type Metric,
    type Plan,
    type Region,
} from '../model'
import { useLoaded } from '../state'
import { go } from '../view'
import type { World } from '../world'

/** A goal's figure at each of the moments, which come in order: a level such as MRR then, or a sum such as revenue since the goal began. */
function figures(world: World, goal: Goal, moments: readonly number[]): number[] {
    const segment: Segment = { plan: goal.plan, region: goal.region }
    if (!METRIC_SUMS[goal.metric]) {
        const level = levels(world, segment, moments)
        return goal.metric === 'mrr' ? level.mrr : goal.metric === 'paying' ? level.paying : level.active
    }
    let sum = 0
    let last = startOf(dayFrom(goal.start))
    return moments.map((at) => {
        if (at > last) {
            sum += goal.metric === 'revenue' ? revenue(world, segment, last, at) : flows(world, segment, last, at).signups
            last = at
        }
        return sum
    })
}

/** Where a goal stands: where it began, where it is, how far along, where it should be by now, and its line from start to due. */
function progress(world: World, goal: Goal) {
    const first = dayFrom(goal.start)
    const last = dayFrom(goal.due)
    const from = startOf(first)
    const to = startOf(last + 1)
    const now = Math.max(from, Math.min(world.now, to))
    const step = last - first > 120 ? 7 : 1
    const days: number[] = []
    for (let day = first; day <= last; day += step) days.push(day)
    const ends = days.filter((day) => startOf(day) <= world.now).map((day) => Math.min(startOf(day + step), now))
    const read = figures(world, goal, [from, ...ends, now])
    const began = METRIC_SUMS[goal.metric] ? 0 : (read[0] ?? 0)
    const current = read[read.length - 1] ?? 0
    const share = goal.target === began ? 1 : (current - began) / (goal.target - began)
    const elapsed = Math.max(0, Math.min(1, (now - from) / (to - from)))
    const expected = began + (goal.target - began) * elapsed
    const projected = elapsed === 0 ? current : began + (current - began) / elapsed
    const actual = days.map((_, index) => read[index + 1] ?? null)
    const pace = days.map((_, index) => began + (goal.target - began) * Math.min(1, (index + 1) / days.length))
    return {
        began,
        current,
        share,
        expected,
        projected,
        onTrack: current >= expected,
        done: current >= goal.target,
        over: world.now > to,
        labels: days.map((day) => shortDay(day)),
        actual,
        pace,
    }
}

/** Sets a goal up, or changes one: what it counts, for which segment, the target and the days it runs. */
function GoalDialog({ goal, open, onOpenChange }: { goal: Goal | undefined; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { me, world } = useLoaded()
    const today = dayOf(world.now)
    const [name, setName] = useState(goal?.name ?? '')
    const [metric, setMetric] = useState<Metric>(goal?.metric ?? 'mrr')
    const [target, setTarget] = useState<number | null>(goal?.target ?? null)
    const [plan, setPlan] = useState<Plan | 'all'>(goal?.plan ?? 'all')
    const [region, setRegion] = useState<Region | 'all'>(goal?.region ?? 'all')
    const [start, setStart] = useState<string | null>(goal?.start ?? isoDay(today))
    const [due, setDue] = useState<string | null>(goal?.due ?? isoDay(today + 90))
    const [tried, setTried] = useState(false)
    const [busy, setBusy] = useState(false)
    const nameError = name.trim() === '' ? 'A goal needs a name.' : null
    const targetError = target === null || target <= 0 ? 'A goal needs a target above zero.' : null
    const dueError = start === null || due === null ? 'A goal needs its days.' : due <= start ? 'It is due after it starts.' : null
    const now = useMemo(() => {
        const from = start ?? isoDay(today)
        const draft: Goal = { id: '', name, metric, target: target ?? 0, plan, region, start: from, due: due ?? from, by: me }
        return figures(world, draft, [Math.max(startOf(dayFrom(from)), world.now)])[0] ?? 0
    }, [world, name, metric, target, plan, region, start, due, today, me])
    const submit = () => {
        setTried(true)
        if (nameError !== null || targetError !== null || dueError !== null || target === null || start === null || due === null) return
        setBusy(true)
        const fields = { name: name.trim(), metric, target, plan, region, start, due, by: me }
        const done = goal === undefined ? goals.create(fields, `goal-${Date.now().toString(36)}`) : goals.update(goal.id, fields)
        void done.then((row) => {
            setBusy(false)
            onOpenChange(false)
            toast.add({
                type: 'success',
                title: goal === undefined ? `${row.name} set` : `${row.name} changed`,
                description: `Due ${longDay(dayFrom(row.due))}`,
            })
        })
    }
    const money = metric === 'mrr' || metric === 'revenue'
    return (
        <DialogShell
            open={open}
            onOpenChange={(value) => !busy && onOpenChange(value)}
            title={goal === undefined ? 'New goal' : `Change ${goal.name}`}
            description="Progress is read live, from the day it starts to the day it is due."
            confirm={{ label: goal === undefined ? 'Set goal' : 'Save', onConfirm: submit, busy, busyLabel: 'Saving' }}
        >
            <Stack gap="lg">
                <TextField
                    id="goal-name"
                    label="Name"
                    value={name}
                    onChange={setName}
                    error={tried ? nameError : null}
                    autoFocus
                    placeholder="MRR this quarter"
                />
                <Field
                    id="goal-metric"
                    label="Counts"
                    description={METRIC_SUMS[metric] ? 'Added up from the day it starts.' : 'The level on the day it is read.'}
                >
                    <NativeSelect
                        id="goal-metric"
                        className="w-full"
                        value={metric}
                        onChange={(event) => setMetric(event.target.value as Metric)}
                    >
                        {METRICS.map((one) => (
                            <NativeSelectOption key={one} value={one}>
                                {METRIC_NAMES[one]}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <NumberField
                    id="goal-target"
                    label="Target"
                    hint={`now ${Math.round(now).toLocaleString('en-US')}`}
                    prefix={money ? '$' : undefined}
                    integer
                    min={1}
                    value={target}
                    onValueChange={setTarget}
                    error={tried ? targetError : null}
                />
                <Field id="goal-plan" label="Plan">
                    <NativeSelect
                        id="goal-plan"
                        className="w-full"
                        value={plan}
                        onChange={(event) => setPlan(event.target.value as Plan | 'all')}
                    >
                        <NativeSelectOption value="all">All plans</NativeSelectOption>
                        {PLANS.map((one) => (
                            <NativeSelectOption key={one} value={one}>
                                {PLAN_NAMES[one]}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <Field id="goal-region" label="Region">
                    <NativeSelect
                        id="goal-region"
                        className="w-full"
                        value={region}
                        onChange={(event) => setRegion(event.target.value as Region | 'all')}
                    >
                        <NativeSelectOption value="all">Everywhere</NativeSelectOption>
                        {REGIONS.map((one) => (
                            <NativeSelectOption key={one} value={one}>
                                {REGION_NAMES[one]}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <DateField id="goal-start" label="Starts" value={start} onValueChange={setStart} today={isoDay(today)} />
                <DateField
                    id="goal-due"
                    label="Due"
                    value={due}
                    onValueChange={setDue}
                    today={isoDay(today)}
                    error={tried ? dueError : null}
                />
            </Stack>
        </DialogShell>
    )
}

/** The goals people set, each read live: how far along, whether it is on pace, and its line toward the target. */
export function Goals() {
    const { world, money, view, href } = useLoaded()
    const { rows } = useCollection(goals)
    // The palette's New goal comes here as `?new=1`, which opens the dialog once.
    const asked = view.params.get('new') === '1'
    const [editing, setEditing] = useState<Goal | 'new' | null>(asked ? 'new' : null)
    const [seen, setSeen] = useState(asked)
    if (asked !== seen) {
        setSeen(asked)
        if (asked) setEditing('new')
    }
    const close = () => {
        setEditing(null)
        if (asked) go(href('goals'))
    }
    const [deleting, setDeleting] = useState<Goal | null>(null)
    const list = rows ?? []
    const read = useMemo(() => list.map((goal) => ({ goal, at: progress(world, goal) })), [list, world])
    const write = (goal: Goal) => (value: number) =>
        goal.metric === 'mrr' || goal.metric === 'revenue' ? money(value, true) : Math.round(value).toLocaleString('en-US')
    return (
        <>
            <PageHeader
                title="Goals"
                description="Targets read live as the figures move."
                actions={
                    <Button onClick={() => setEditing('new')}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            {rows !== undefined && list.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No goals yet</EmptyTitle>
                        <EmptyDescription>
                            Set a target for MRR, revenue, teams or sign-ups, and see it fill as the figures move.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
                            New goal
                        </Button>
                    </EmptyContent>
                </Empty>
            ) : (
                <DashboardGrid>
                    {read.map(({ goal, at }) => {
                        const segment = [
                            goal.plan === 'all' ? null : PLAN_NAMES[goal.plan],
                            goal.region === 'all' ? null : REGION_NAMES[goal.region],
                        ]
                            .filter((part) => part !== null)
                            .join(', ')
                        const state = at.done ? 'reached' : at.over ? 'missed' : at.onTrack ? 'on pace' : 'behind pace'
                        return (
                            <Fragment key={goal.id}>
                                <StatPanel
                                    title={goal.name}
                                    value={at.current}
                                    format={write(goal)}
                                    color={at.done || at.onTrack ? 'good' : 'warning'}
                                    target={goal.target}
                                    targetRange={[Math.min(at.began, goal.target), Math.max(goal.target, at.current)]}
                                    delta={`${(Math.max(0, at.share) * 100).toFixed(0)}% of the way`}
                                    good={at.done || at.onTrack}
                                    note={`Due ${shortDay(dayFrom(goal.due))}, ${state}`}
                                    span="third"
                                />
                                <TimeSeriesPanel
                                    title={goal.name}
                                    subtitle={`heading for ${write(goal)(at.projected)}`}
                                    info={`${METRIC_NAMES[goal.metric]}${segment === '' ? '' : ` of ${segment}`}, ${longDay(dayFrom(goal.start))} to ${longDay(dayFrom(goal.due))}. The dashed line is the pace that reaches the target on the day it is due.`}
                                    span="two-thirds"
                                    x={at.labels}
                                    series={[
                                        {
                                            name: METRIC_NAMES[goal.metric],
                                            values: at.actual,
                                            color: at.onTrack || at.done ? 'chart-2' : 'warning',
                                        },
                                        { name: 'Pace to the target', values: at.pace, color: 'muted-foreground', dashed: true },
                                    ]}
                                    thresholds={[{ color: 'good' }, { value: goal.target, color: 'good' }]}
                                    format={write(goal)}
                                    fill="gradient"
                                    bodyClassName="h-40"
                                    actions={
                                        <>
                                            <IconButton
                                                label={`Change ${goal.name}`}
                                                size="icon-xs"
                                                variant="ghost"
                                                onClick={() => setEditing(goal)}
                                            >
                                                <Pencil aria-hidden />
                                            </IconButton>
                                            <IconButton
                                                label={`Delete ${goal.name}`}
                                                size="icon-xs"
                                                variant="ghost"
                                                onClick={() => setDeleting(goal)}
                                            >
                                                <Trash2 aria-hidden />
                                            </IconButton>
                                        </>
                                    }
                                    file={goal.id}
                                />
                            </Fragment>
                        )
                    })}
                </DashboardGrid>
            )}
            {editing !== null && (
                <GoalDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    goal={editing === 'new' ? undefined : editing}
                    open
                    onOpenChange={(open) => !open && close()}
                />
            )}
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                question={`Delete ${deleting?.name ?? 'this goal'}?`}
                detail="The goal goes for everyone; the figures it reads stay as they are."
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        const gone = deleting
                        setDeleting(null)
                        if (gone !== null) void goals.remove(gone.id).then(() => toast.add({ title: `${gone.name} deleted` }))
                    },
                }}
            />
        </>
    )
}
