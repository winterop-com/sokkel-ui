import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { CheckIcon, PhoneCall, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { go } from 'tidevann-shared/router'
import { type Incident, incidents, type Person, SITE_BY_ID } from '../data'
import { postUpdate } from '../live'
import { formatDuration } from '../status'

/** What an incident touches: its services, then its sites by city. */
export function touched(incident: Incident): string[] {
    return [...incident.services, ...incident.sites.map((id) => SITE_BY_ID[id]?.city ?? id)]
}

const SEVERITY_ORDER = { critical: 0, major: 1, minor: 2 }

function columns(compact: boolean): DataColumn<Incident>[] {
    const all: (DataColumn<Incident> & { full?: true })[] = [
        {
            id: 'title',
            header: 'Incident',
            width: 'minmax(14rem,1fr)',
            cell: (incident) => incident.title,
            sortValue: (incident) => incident.title,
        },
        {
            id: 'code',
            header: 'Code',
            width: '5.5rem',
            cell: (incident) => <span className="font-mono">{incident.code}</span>,
            sortValue: (incident) => Number(incident.code.replace(/\D/g, '')),
            stack: 'secondary',
        },
        {
            id: 'state',
            header: 'State',
            width: '8.5rem',
            cell: (incident) => <StatusChip status={incident.state} />,
            sortValue: (incident) => incident.state,
            stack: 'secondary',
        },
        {
            id: 'severity',
            header: 'Severity',
            width: '6.5rem',
            cell: (incident) => <StatusChip status={incident.severity} />,
            sortValue: (incident) => SEVERITY_ORDER[incident.severity],
            stack: 'secondary',
        },
        {
            id: 'touches',
            header: 'Touches',
            width: 'minmax(9rem,0.6fr)',
            cell: (incident) => <TagChips tags={touched(incident)} />,
            full: true,
        },
        {
            id: 'assignee',
            header: 'Assignee',
            width: '8.5rem',
            cell: (incident) => (
                <Row gap="2xs" inline>
                    <PersonAvatar name={incident.assignee} size="2xs" />
                    {incident.assignee}
                </Row>
            ),
            sortValue: (incident) => incident.assignee,
            full: true,
        },
        {
            id: 'opened',
            header: 'Opened',
            width: '8rem',
            cell: (incident) => <RelativeTime date={incident.opened} />,
            sortValue: (incident) => incident.opened,
            stack: 'secondary',
        },
        {
            id: 'lasted',
            header: 'Lasted',
            width: '6.5rem',
            align: 'end',
            cell: (incident) =>
                formatDuration(
                    (incident.resolved === null ? Date.now() : new Date(incident.resolved).getTime()) - new Date(incident.opened).getTime(),
                ),
            sortValue: (incident) =>
                (incident.resolved === null ? Date.now() : new Date(incident.resolved).getTime()) - new Date(incident.opened).getTime(),
            full: true,
        },
    ]
    return all.filter((column) => !compact || column.full !== true)
}

/** A row's menu: resolve or reopen it, give it to the person on call, open it. */
export function incidentActions(incident: Incident, me: Person, onCallNow: Person | undefined): DataAction[] {
    const resolved = incident.state === 'resolved'
    return [
        {
            id: 'resolve',
            label: resolved ? 'Reopen' : 'Resolve',
            icon: resolved ? <RotateCcw /> : <CheckIcon />,
            onSelect: () =>
                void postUpdate(
                    incident,
                    resolved ? 'investigating' : 'resolved',
                    resolved ? 'We are looking into this again.' : 'This incident is resolved.',
                    me,
                ),
        },
        {
            id: 'assign',
            label: onCallNow === undefined ? 'Assign to on call' : `Assign to ${onCallNow}`,
            icon: <PhoneCall />,
            disabled: onCallNow === undefined || onCallNow === incident.assignee,
            onSelect: () => {
                if (onCallNow !== undefined) void incidents.update(incident.id, { assignee: onCallNow })
            },
        },
    ]
}

/** Incidents as a table, or as a short list with fewer columns where it shares a page; a row opens its incident. */
export function IncidentTable({
    rows,
    compact = false,
    actions,
    empty,
    search,
    toolbar,
    className,
}: {
    rows: readonly Incident[]
    compact?: boolean
    actions?: (incident: Incident) => DataAction[]
    empty?: ReactNode
    search?: ReactNode
    toolbar?: ReactNode
    className?: string
}) {
    return (
        <DataTable
            className={className}
            variant={compact ? 'list' : 'table'}
            minWidth="auto"
            columns={columns(compact)}
            rows={rows}
            rowKey={(incident) => incident.id}
            onOpen={(incident) => go(`/incidents/${incident.id}`)}
            rowActions={actions}
            defaultSort={{ column: 'opened', direction: 'desc' }}
            empty={empty}
            search={search}
            toolbar={toolbar}
        />
    )
}
