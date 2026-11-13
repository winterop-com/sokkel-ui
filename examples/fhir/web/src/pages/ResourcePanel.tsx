import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import type { CodeProblem } from '@winterop-com/sokkel-ui/CodeEditor'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DiffView } from '@winterop-com/sokkel-ui/DiffView'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { STATUS_CSS } from '@winterop-com/sokkel-ui/lib/status'
import { PanelSection, SidePanel, type SidePanelTab } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Activity, GitCompare, Link2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { issuePath } from '../data/model'
import { VITALS } from '../data/seed'
import { history, pointingAt, resources, type Version } from '../data/server'
import { reveals, useDraft } from '../editing'
import { onDay, titleOf, when } from '../ui'

const TONE = { error: STATUS_CSS.critical, warning: STATUS_CSS.warning, info: STATUS_CSS.info } as const
const WORD = { error: 'Error', warning: 'Warning', info: 'Note' } as const

interface Finding {
    id: string
    tone: keyof typeof TONE
    message: string
    where: string
    go: () => void
}

const FINDING_COLUMNS: DataColumn<Finding>[] = [
    { id: 'tone', header: 'Kind', width: '2rem', stack: 'lead', cell: (row) => <Dot color={TONE[row.tone]} label={WORD[row.tone]} /> },
    { id: 'message', header: 'Problem', width: 'minmax(10rem,1fr)', stack: 'primary', cell: (row) => row.message },
    { id: 'where', header: 'Where', width: '8rem', stack: 'secondary', cell: (row) => <span className="font-mono">{row.where}</span> },
]

/** A list in the panel: rows without heads or a bar, each opening what it names. */
function PanelList<T>({
    rows,
    columns,
    rowKey,
    onOpen,
    empty,
}: {
    rows: readonly T[]
    columns: DataColumn<T>[]
    rowKey: (row: T) => string
    onOpen: (row: T) => void
    empty: string
}) {
    return (
        <DataTable
            variant="list"
            framed={false}
            bar={false}
            columnHeads={false}
            resizable={false}
            minWidth="auto"
            columns={columns}
            rows={rows}
            rowKey={rowKey}
            onOpen={onOpen}
            empty={empty}
        />
    )
}

/**
 * What the editor shows: what its checks find as the resource is typed, and what the server said
 * at the last save, marked on the values it is about; each goes to its value.
 */
function Problems({ type, problems }: { type: string; problems: readonly CodeProblem[] }) {
    const rows: Finding[] = problems.map((problem) => ({
        id: `${String(problem.from)}-${problem.message}`,
        tone: problem.tone,
        message: problem.message,
        where: problem.path === undefined ? `line ${String(problem.line)}` : issuePath(type, problem.path),
        go: () =>
            reveals.set(
                problem.path === undefined ? { line: problem.line, from: problem.column, to: problem.endColumn } : { path: problem.path },
            ),
    }))
    return (
        <Stack gap="md">
            <PanelSection title="Problems">
                <PanelList
                    rows={rows}
                    columns={FINDING_COLUMNS}
                    rowKey={(row) => row.id}
                    onOpen={(row) => row.go()}
                    empty="The resource checks. The server checks it again, references included, as it is saved."
                />
            </PanelSection>
        </Stack>
    )
}

const VERSION_COLUMNS: DataColumn<Version>[] = [
    { id: 'version', header: 'Version', width: '3rem', stack: 'lead', cell: (row) => <span className="font-mono">v{row.versionId}</span> },
    { id: 'change', header: 'Change', width: '6rem', stack: 'primary', cell: (row) => <StatusChip status={row.change} /> },
    { id: 'by', header: 'By', width: 'minmax(8rem,1fr)', stack: 'secondary', cell: (row) => `${row.by}, ${when(row.at)}` },
]

/** Every version of the resource, newest first; the one chosen is drawn against the editor's text. */
function History({ resourceKey, current }: { resourceKey: string; current: string }) {
    const { rows } = useCollection(history)
    const versions = (rows ?? []).filter((row) => row.key === resourceKey).sort((left, right) => right.versionId - left.versionId)
    const [chosen, setChosen] = useState<number | undefined>(undefined)
    const picked = versions.find((row) => row.versionId === chosen) ?? versions[1] ?? versions[0]
    return (
        <Stack gap="md">
            <PanelSection title="Versions">
                <PanelList
                    rows={versions}
                    columns={VERSION_COLUMNS}
                    rowKey={(row) => row.id}
                    onOpen={(row) => setChosen(row.versionId)}
                    empty="No versions yet: it is saved as version 1."
                />
            </PanelSection>
            {picked !== undefined && (
                <PanelSection title={`Version ${String(picked.versionId)} against the editor`}>
                    <DiffView
                        size="sm"
                        before={picked.resource === null ? '' : JSON.stringify(picked.resource, null, 2)}
                        after={current}
                        words={{ unchanged: 'The editor holds this version.' }}
                    />
                </PanelSection>
            )}
        </Stack>
    )
}

interface Link {
    key: string
    title: string
}

const LINK_COLUMNS: DataColumn<Link>[] = [
    { id: 'title', header: 'Resource', width: 'minmax(8rem,1fr)', stack: 'primary', cell: (row) => row.title },
    { id: 'key', header: 'Key', width: '10rem', stack: 'secondary', cell: (row) => <span className="font-mono">{row.key}</span> },
]

/** The resources this one points at and those that point at it, each opening its page. */
function References({ resourceKey, current }: { resourceKey: string; current: string }) {
    const { rows } = useCollection(resources)
    const all = rows ?? []
    const link = (key: string): Link => {
        const found = all.find((row) => row.id === key)
        return { key, title: found === undefined ? 'Not on the server' : titleOf(found.resource) }
    }
    const out = [
        ...new Set([...current.matchAll(/"reference"\s*:\s*"([A-Z][A-Za-z]+\/[A-Za-z0-9\-.]+)"/g)].map((match) => match[1] ?? '')),
    ].map(link)
    const into = pointingAt(all, resourceKey).map(link)
    const open = (row: Link) => go(`/resources/${row.key}`)
    return (
        <Stack gap="md">
            <PanelSection title="Points at">
                <PanelList
                    rows={out}
                    columns={LINK_COLUMNS}
                    rowKey={(row) => row.key}
                    onOpen={open}
                    empty="It points at no other resource."
                />
            </PanelSection>
            <PanelSection title="Pointed at by">
                <PanelList
                    rows={into}
                    columns={LINK_COLUMNS}
                    rowKey={(row) => row.key}
                    onOpen={open}
                    empty="No resource points at it, so it can be deleted."
                />
            </PanelSection>
        </Stack>
    )
}

/** A patient's vital signs over the year, one chart for each, from the observations on the server. */
function Vitals({ resourceKey }: { resourceKey: string }) {
    const { rows } = useCollection(resources)
    const series = useMemo(() => {
        const observations = (rows ?? []).filter(
            (row) => row.type === 'Observation' && (row.resource.subject as { reference?: string } | undefined)?.reference === resourceKey,
        )
        return VITALS.map((vital) => ({
            vital,
            rows: observations
                .filter((row) =>
                    (row.resource.code as { coding?: { code?: string }[] } | undefined)?.coding?.some(
                        (coding) => coding.code === vital.code,
                    ),
                )
                .map((row) => ({
                    day: onDay(row.resource.effectiveDateTime as string | undefined),
                    at: String(row.resource.effectiveDateTime ?? ''),
                    value: (row.resource.valueQuantity as { value?: number } | undefined)?.value ?? 0,
                }))
                .sort((left, right) => left.at.localeCompare(right.at)),
        }))
    }, [rows, resourceKey])
    return (
        <Stack gap="md">
            {series.map(({ vital, rows: points }) => (
                <ChartFrame key={vital.id} title={vital.display} subtitle={vital.unit} empty={points.length === 0} bodyClassName="h-40">
                    {(state) => (
                        <Chart
                            kind="line"
                            label={`${vital.display} over the year`}
                            rows={points}
                            x="day"
                            y="value"
                            unit={vital.unit}
                            {...state}
                        />
                    )}
                </ChartFrame>
            ))}
        </Stack>
    )
}

/** The side panel beside a resource: its problems, its versions, its references and, for a patient, the vital signs. */
export function ResourcePanel({ type, id, problems }: { type: string; id: string; problems: readonly CodeProblem[] }) {
    const resourceKey = `${type}/${id}`
    const { rows } = useCollection(resources)
    const stored = rows?.find((row) => row.id === resourceKey)
    const draft = useDraft(resourceKey)
    const current = draft?.text ?? (stored === undefined ? '' : JSON.stringify(stored.resource, null, 2))
    const issues = problems.filter((problem) => problem.tone !== 'info').length
    const tabs: SidePanelTab[] = [
        {
            id: 'problems',
            label: issues === 0 ? 'Problems' : `Problems ${String(issues)}`,
            icon: TriangleAlert,
            content: <Problems type={type} problems={problems} />,
        },
        ...(id === 'new'
            ? []
            : [
                  { id: 'history', label: 'History', icon: GitCompare, content: <History resourceKey={resourceKey} current={current} /> },
                  {
                      id: 'references',
                      label: 'References',
                      icon: Link2,
                      content: <References resourceKey={resourceKey} current={current} />,
                  },
              ]),
        ...(type === 'Patient' && id !== 'new'
            ? [{ id: 'vitals', label: 'Vitals', icon: Activity, content: <Vitals resourceKey={resourceKey} /> }]
            : []),
    ]
    return <SidePanel tabs={tabs} defaultActive={type === 'Patient' ? 'vitals' : 'problems'} defaultSize={400} soleTab="tab" />
}
