import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Check, CheckCheck, MapPin, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { alerts as alertsStore } from '../collections'
import { moment } from '../format'
import { ALERT_KINDS, type Alert } from '../model'

type Showing = 'open' | 'acknowledged' | 'all'

/** The run state each kind of alert is drawn in, for its chip's color. */
const KIND_STATUS = { country: 'waiting', process: 'pending', spike: 'failed' } as const

const acknowledge = (ids: Iterable<string>) => {
    const at = Date.now()
    for (const id of ids) void alertsStore.update(id, { acknowledged: true, acknowledgedAt: at })
}

function columns(): DataColumn<Alert>[] {
    return [
        {
            id: 'alert',
            header: 'Alert',
            width: 'minmax(16rem,2fr)',
            cell: (alert) => (
                <span className="flex min-w-0 flex-col">
                    <span className="truncate">{alert.title}</span>
                    <span className="truncate text-muted-foreground">{alert.detail}</span>
                </span>
            ),
            sortValue: (alert) => alert.title,
            stackTitle: 'free',
        },
        {
            id: 'kind',
            header: 'Kind',
            width: '9rem',
            cell: (alert) => <StatusChip status={KIND_STATUS[alert.kind]} label={ALERT_KINDS[alert.kind]} />,
            sortValue: (alert) => alert.kind,
            stack: 'secondary',
        },
        {
            id: 'at',
            header: 'Raised',
            width: '7.5rem',
            cell: (alert) => moment(alert.at),
            sortValue: (alert) => alert.at,
            stack: 'secondary',
        },
        {
            id: 'state',
            header: 'State',
            width: '9.5rem',
            cell: (alert) =>
                alert.acknowledged ? (
                    <StatusChip
                        status="succeeded"
                        label={alert.acknowledgedAt === undefined ? 'Acknowledged' : `Acked ${moment(alert.acknowledgedAt)}`}
                    />
                ) : (
                    <StatusChip status="queued" label="Open" />
                ),
            sortValue: (alert) => (alert.acknowledged ? 1 : 0),
            stack: 'secondary',
        },
    ]
}

/** The alerts raised, newest first: open ones to acknowledge, one at a time or many, and the acknowledged ones kept until cleared. */
export function AlertsPage({
    alerts,
    error,
    onShowOnMap,
}: {
    alerts: Alert[] | undefined
    error: string | undefined
    onShowOnMap: (address: string) => void
}) {
    const [showing, setShowing] = useStored<Showing>('alerts-showing', 'open')
    const [clearing, setClearing] = useState(false)
    const all = [...(alerts ?? [])].sort((a, b) => b.at - a.at)
    const open = all.filter((alert) => !alert.acknowledged)
    const done = all.filter((alert) => alert.acknowledged)
    const rows = showing === 'open' ? open : showing === 'acknowledged' ? done : all

    return (
        <Stack gap="section" className="h-full">
            <PageHeader
                title="Alerts"
                count={`${String(open.length)} open`}
                actions={
                    <>
                        <Button size="sm" variant="outline" disabled={done.length === 0} onClick={() => setClearing(true)}>
                            <Trash2 aria-hidden />
                            Clear acknowledged
                        </Button>
                        <Button size="sm" disabled={open.length === 0} onClick={() => acknowledge(open.map((alert) => alert.id))}>
                            <CheckCheck aria-hidden />
                            Acknowledge all
                        </Button>
                    </>
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                columns={columns()}
                rows={rows}
                rowKey={(alert) => alert.id}
                loading={alerts === undefined && error === undefined}
                error={error}
                selectable
                bulkActions={(ids, clear) => (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            acknowledge(ids)
                            clear()
                        }}
                    >
                        <Check aria-hidden />
                        Acknowledge
                    </Button>
                )}
                searchBy={(alert) => `${alert.title} ${alert.detail} ${ALERT_KINDS[alert.kind]}`}
                toolbar={
                    <Segmented<Showing>
                        label="Show"
                        size="sm"
                        value={showing}
                        onValueChange={setShowing}
                        options={[
                            { value: 'open', label: `Open (${String(open.length)})` },
                            { value: 'acknowledged', label: 'Acknowledged' },
                            { value: 'all', label: 'All' },
                        ]}
                    />
                }
                rowActions={(alert) => [
                    alert.acknowledged
                        ? {
                              id: 'reopen',
                              label: 'Reopen',
                              icon: <RotateCcw />,
                              onSelect: () => void alertsStore.update(alert.id, { acknowledged: false, acknowledgedAt: undefined }),
                          }
                        : {
                              id: 'acknowledge',
                              label: 'Acknowledge',
                              icon: <Check />,
                              inline: true,
                              onSelect: () => acknowledge([alert.id]),
                          },
                    ...(alert.address === undefined
                        ? []
                        : [{ id: 'map', label: 'Show on the map', icon: <MapPin />, onSelect: () => onShowOnMap(alert.address ?? '') }]),
                    { id: 'sep', separator: true as const },
                    {
                        id: 'delete',
                        label: 'Delete',
                        icon: <Trash2 />,
                        destructive: true,
                        onSelect: () => void alertsStore.remove(alert.id),
                    },
                ]}
                empty={
                    showing === 'open' ? 'Nothing to acknowledge. New countries, new processes and spikes show here.' : 'No alerts here.'
                }
            />
            <ConfirmDialog
                open={clearing}
                onOpenChange={setClearing}
                question="Clear the acknowledged alerts?"
                detail={`${String(done.length)} acknowledged ${done.length === 1 ? 'alert goes' : 'alerts go'} for good; open ones stay.`}
                confirm={{
                    label: 'Clear',
                    destructive: true,
                    onConfirm: () => {
                        setClearing(false)
                        for (const alert of done) void alertsStore.remove(alert.id)
                    },
                }}
            />
        </Stack>
    )
}
