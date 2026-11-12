import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Switch } from '@winterop-com/sokkel-ui/primitives/switch'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { BellOff, BellRing, Copy, Eraser, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { conditionOf, readings, type RuleReading, written } from './alerting'
import { type AlertEvent, type AlertRule, events, rules as ruleStore } from './data'
import { clockOf, type Zone } from './query'
import { RuleDialog } from './RuleDialog'

type Tab = 'rules' | 'fired'
type FiredFilter = 'all' | 'firing' | 'resolved'

const lasted = (event: AlertEvent, now: number) => {
    const seconds = (event.resolvedAt ?? now) - event.firedAt
    return seconds < 60 ? `${String(seconds)}s` : `${String(Math.floor(seconds / 60))}m ${String(seconds % 60).padStart(2, '0')}s`
}

function ruleColumns(states: Readonly<Record<string, RuleReading>>): DataColumn<AlertRule>[] {
    return [
        {
            id: 'state',
            header: 'State',
            width: '7rem',
            cell: (rule) => <StatusChip status={states[rule.id]?.state ?? (rule.enabled ? 'normal' : 'paused')} />,
            sortValue: (rule) => ['firing', 'pending', 'normal', 'paused'].indexOf(states[rule.id]?.state ?? 'normal'),
            stack: 'secondary',
        },
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(10rem,1fr)',
            cell: (rule) => <span className="font-medium">{rule.name}</span>,
            sortValue: (rule) => rule.name,
            stack: 'primary',
        },
        {
            id: 'condition',
            header: 'Condition',
            width: 'minmax(16rem,2fr)',
            cell: (rule) => <span className="text-muted-foreground">{conditionOf(rule)}</span>,
            stack: 'line',
        },
        {
            id: 'now',
            header: 'Now',
            width: '7rem',
            align: 'end',
            cell: (rule) => <span className="tabular-nums">{written(rule, states[rule.id]?.value ?? null)}</span>,
            sortValue: (rule) => states[rule.id]?.value ?? 0,
            stack: 'secondary',
        },
        {
            id: 'severity',
            header: 'Severity',
            width: '7rem',
            cell: (rule) => <StatusChip status={rule.severity} />,
            sortValue: (rule) => rule.severity,
            stack: 'secondary',
        },
        {
            id: 'enabled',
            header: 'On',
            width: '4rem',
            resizable: false,
            cell: (rule) => (
                <Switch
                    aria-label={rule.enabled ? `Turn ${rule.name} off` : `Turn ${rule.name} on`}
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => void ruleStore.update(rule.id, { enabled })}
                />
            ),
            stack: 'secondary',
        },
    ]
}

function firedColumns(zone: Zone, now: number): DataColumn<AlertEvent>[] {
    return [
        {
            id: 'state',
            header: 'State',
            width: '7rem',
            cell: (event) => <StatusChip status={event.resolvedAt === null ? 'firing' : 'resolved'} />,
            sortValue: (event) => (event.resolvedAt === null ? 0 : 1),
            stack: 'secondary',
        },
        {
            id: 'name',
            header: 'Rule',
            width: 'minmax(10rem,1fr)',
            cell: (event) => <span className="font-medium">{event.name}</span>,
            sortValue: (event) => event.name,
            stack: 'primary',
        },
        {
            id: 'severity',
            header: 'Severity',
            width: '7rem',
            cell: (event) => <StatusChip status={event.severity} />,
            sortValue: (event) => event.severity,
            stack: 'secondary',
        },
        {
            id: 'value',
            header: 'Fired at',
            width: '7rem',
            align: 'end',
            cell: (event) => <span className="tabular-nums">{written(event, event.value)}</span>,
            sortValue: (event) => event.value,
            stack: 'secondary',
        },
        {
            id: 'fired',
            header: 'When',
            width: '12rem',
            cell: (event) => (
                <span className="flex gap-2">
                    <span className="font-mono tabular-nums">{clockOf(event.firedAt, zone)}</span>
                    <RelativeTime date={event.firedAt * 1000} length="short" className="text-muted-foreground" />
                </span>
            ),
            sortValue: (event) => event.firedAt,
            stack: 'line',
        },
        {
            id: 'lasted',
            header: 'Lasted',
            width: '7rem',
            align: 'end',
            cell: (event) => (
                <span className="tabular-nums">{event.resolvedAt === null ? `${lasted(event, now)}, still` : lasted(event, now)}</span>
            ),
            sortValue: (event) => (event.resolvedAt ?? now) - event.firedAt,
            stack: 'secondary',
        },
    ]
}

/** Alert rules on thresholds, each evaluated every second against the source, and the list of what fired. */
export function AlertsPage({
    rules,
    fired,
    zone,
    onNew,
}: {
    rules: readonly AlertRule[] | undefined
    fired: readonly AlertEvent[] | undefined
    zone: Zone
    onNew: () => void
}) {
    const states = useStore(readings)
    const [tab, setTab] = useState<Tab>('rules')
    const [filter, setFilter] = useState<FiredFilter>('all')
    const [editing, setEditing] = useState<AlertRule | null>(null)
    const [deleting, setDeleting] = useState<AlertRule | null>(null)
    const [clearing, setClearing] = useState(false)
    const allRules = rules ?? []
    const allFired = [...(fired ?? [])].sort((left, right) => right.firedAt - left.firedAt)
    const firingNow = allFired.filter((event) => event.resolvedAt === null)
    const resolved = allFired.length - firingNow.length
    const shown = filter === 'all' ? allFired : filter === 'firing' ? firingNow : allFired.filter((event) => event.resolvedAt !== null)
    const now = Math.floor(Date.now() / 1000)

    const ruleActions = (rule: AlertRule): DataAction[] => [
        { id: 'edit', label: 'Edit', icon: <PencilLine />, onSelect: () => setEditing(rule) },
        {
            id: 'toggle',
            label: rule.enabled ? 'Turn off' : 'Turn on',
            icon: rule.enabled ? <BellOff /> : <BellRing />,
            onSelect: () => void ruleStore.update(rule.id, { enabled: !rule.enabled }),
        },
        {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy />,
            onSelect: () => {
                const { id: _, ...fields } = rule
                void ruleStore.create({ ...fields, name: `${rule.name} copy` }).then(() => toast.success(`${rule.name} duplicated`))
            },
        },
        { id: 'line', separator: true },
        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(rule) },
    ]

    return (
        <Page className="h-full">
            <PageHeader
                title="Alerts"
                count={firingNow.length === 0 ? 'nothing firing' : `${String(firingNow.length)} firing`}
                description="Each rule is read every second from the newest scrape. One that holds past its threshold for long enough fires, and resolves once it is back."
                actions={
                    <Button size="sm" onClick={onNew}>
                        <Plus aria-hidden />
                        New rule
                    </Button>
                }
            />
            <Toolbar
                end={
                    tab === 'fired' ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClearing(true)}
                            reason={resolved === 0 ? 'Nothing has resolved yet.' : undefined}
                        >
                            <Eraser aria-hidden />
                            Clear resolved
                        </Button>
                    ) : undefined
                }
            >
                <Segmented<Tab>
                    label="Show"
                    value={tab}
                    onValueChange={setTab}
                    options={[
                        { value: 'rules', label: 'Rules', count: allRules.length },
                        { value: 'fired', label: 'Fired', count: allFired.length },
                    ]}
                />
                {tab === 'fired' && (
                    <Segmented<FiredFilter>
                        label="Which"
                        size="sm"
                        value={filter}
                        onValueChange={setFilter}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'firing', label: 'Firing', count: firingNow.length, dot: 'var(--critical)' },
                            { value: 'resolved', label: 'Resolved', count: resolved },
                        ]}
                    />
                )}
            </Toolbar>
            {tab === 'rules' ? (
                <DataTable
                    className="min-h-0 flex-1"
                    variant="list"
                    minWidth="auto"
                    columns={ruleColumns(states)}
                    rows={allRules}
                    rowKey={(rule) => rule.id}
                    onOpen={setEditing}
                    rowActions={ruleActions}
                    loading={rules === undefined}
                />
            ) : (
                <DataTable
                    className="min-h-0 flex-1"
                    variant="list"
                    minWidth="auto"
                    columns={firedColumns(zone, now)}
                    rows={shown}
                    rowKey={(event) => event.id}
                    loading={fired === undefined}
                />
            )}
            <RuleDialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                rule={editing ?? undefined}
                zone={zone}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                question={`Delete ${deleting?.name ?? 'the rule'}?`}
                detail="What it fired stays in the list until it is cleared."
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        if (deleting === null) return
                        const gone = deleting
                        setDeleting(null)
                        void ruleStore.remove(gone.id).then(() => toast.success(`${gone.name} deleted`))
                    },
                }}
            />
            <ConfirmDialog
                open={clearing}
                onOpenChange={setClearing}
                question="Clear the resolved alerts?"
                detail={`${String(resolved)} resolved ${resolved === 1 ? 'alert leaves' : 'alerts leave'} the list. Those still firing stay.`}
                confirm={{
                    label: 'Clear',
                    destructive: true,
                    onConfirm: () => {
                        setClearing(false)
                        void Promise.all(
                            allFired.filter((event) => event.resolvedAt !== null).map((event) => events.remove(event.id)),
                        ).then(() => toast.success('Resolved alerts cleared'))
                    },
                }}
            />
        </Page>
    )
}
