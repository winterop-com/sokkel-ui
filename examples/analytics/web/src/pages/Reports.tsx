import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Split, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Download, Plus, Save, Trash2 } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { reports } from '../collections'
import { download, fileName, reportCsv } from '../csv'
import { PANEL_NAMES, PANELS, counted, dayOf, shortDay, type PanelId, type Report } from '../model'
import { OrderList } from '../order'
import { PANEL_PARTS } from '../panels'
import { useSegment, useSpans, ViewBar } from '../parts'
import { useLoaded } from '../state'
import { go, rangeName } from '../view'

/** The reports people saved, a report composed from panels with its preview drawn live, and its figures as a CSV download. */
export function Reports({ id }: { id: string | undefined }) {
    const { href } = useLoaded()
    const { rows } = useCollection(reports)
    const saved = rows ?? []
    const chosen = id === 'new' ? undefined : (saved.find((one) => one.id === id) ?? (id === undefined ? saved[0] : undefined))
    const columns: DataColumn<Report>[] = [
        { id: 'name', header: 'Report', width: 'minmax(8rem,1fr)', cell: (one) => one.name },
        {
            id: 'panels',
            header: 'Panels',
            width: '5.5rem',
            align: 'end',
            cell: (one) => <span className="text-muted-foreground">{counted(one.panels.length, 'panel')}</span>,
        },
    ]
    const list = (
        <Section title="Saved" meta={String(saved.length)} variant="boxed" flush>
            <DataTable
                variant="list"
                framed={false}
                minWidth="auto"
                stackLayout="compact"
                columns={columns}
                rows={saved}
                rowKey={(one) => one.id}
                onOpen={(one) => go(href(`reports/${one.id}`))}
                opened={(one) => one.id === chosen?.id}
                empty="No report saved yet."
            />
        </Section>
    )
    return (
        <>
            <PageHeader
                title="Reports"
                description="Panels put together, read over any range and segment, and kept as a file."
                actions={
                    <Button onClick={() => go(href('reports/new'))}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <ViewBar />
            {rows === undefined ? null : id !== undefined && id !== 'new' && chosen === undefined ? (
                <Split side="start" width="sm" align="start" aside={list}>
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>No such report</EmptyTitle>
                            <EmptyDescription>No saved report has the id {id}. It may have been deleted.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Split>
            ) : (
                <Composer key={chosen?.id ?? 'new'} report={chosen} list={list} />
            )}
        </>
    )
}

/** A report's name and panels beside the saved reports, its preview across the page under them, its CSV and saving it. */
function Composer({ report: start, list }: { report: Report | undefined; list: ReactNode }) {
    const { world, me, href, view, prefs } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const [name, setName] = useState(start?.name ?? '')
    const [panels, setPanels] = useState<PanelId[]>(start?.panels ?? ['kpis', 'revenue'])
    const [busy, setBusy] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const changed = start === undefined || start.name !== name.trim() || start.panels.join() !== panels.join()
    const why =
        name.trim() === ''
            ? 'A report needs a name.'
            : panels.length === 0
              ? 'A report needs a panel.'
              : !changed
                ? 'Nothing has changed since it was saved.'
                : undefined
    const save = () => {
        setBusy(true)
        const fields = { name: name.trim(), panels, by: me, updated: Date.now() }
        const done = start === undefined ? reports.create(fields, `report-${Date.now().toString(36)}`) : reports.update(start.id, fields)
        void done.then(
            (row) => {
                setBusy(false)
                toast.add({ type: 'success', title: `${row.name} saved`, description: counted(row.panels.length, 'panel') })
                if (start === undefined) go(href(`reports/${row.id}`))
            },
            (error: unknown) => {
                setBusy(false)
                toast.add({
                    type: 'error',
                    title: 'Could not save the report',
                    description: error instanceof Error ? error.message : String(error),
                })
            },
        )
    }
    const exportCsv = () => {
        const title = name.trim() === '' ? 'Report' : name.trim()
        const text = reportCsv(title, panels, {
            world,
            segment,
            span,
            previous,
            compare: view.compare,
            range: view.range,
            currency: prefs.currency,
        })
        const file = fileName(title, world.now)
        download(file, text)
        toast.add({ title: 'CSV downloaded', description: `${file}, ${counted(panels.length, 'panel')}` })
    }
    const left = PANELS.filter((panel) => !panels.includes(panel))
    return (
        <Stack gap="section">
            <Split side="start" width="sm" align="start" aside={list}>
                <Section
                    title={start === undefined ? 'New report' : start.name}
                    description={start === undefined ? 'Not saved yet.' : `Saved by ${start.by}, ${shortDay(dayOf(start.updated))}.`}
                    variant="boxed"
                    actions={
                        <>
                            {start !== undefined && (
                                <IconButton label="Delete report" variant="ghost" size="icon-sm" onClick={() => setDeleting(true)}>
                                    <Trash2 aria-hidden />
                                </IconButton>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                reason={panels.length === 0 ? 'Add a panel first.' : undefined}
                                onClick={exportCsv}
                            >
                                <Download aria-hidden />
                                Export CSV
                            </Button>
                            <Button size="sm" reason={why} disabled={busy} onClick={save}>
                                <Save aria-hidden />
                                {busy ? 'Saving' : 'Save'}
                            </Button>
                        </>
                    }
                >
                    <Stack gap="lg">
                        <TextField id="report-name" label="Name" value={name} onChange={setName} placeholder="Monthly board report" />
                        <Field
                            id="report-panels"
                            label="Panels"
                            description={`Read over ${rangeName(view.range).toLowerCase()}, as the bar above says.`}
                        >
                            <Stack gap="sm">
                                <OrderList
                                    items={panels}
                                    onChange={setPanels}
                                    name={(panel) => PANEL_NAMES[panel]}
                                    noun="Panel"
                                    empty="No panels yet. Add the first below."
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={<Button variant="outline" size="sm" className="self-start" disabled={left.length === 0} />}
                                    >
                                        <Plus aria-hidden />
                                        Add panel
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {left.map((panel) => (
                                            <DropdownMenuItem key={panel} onClick={() => setPanels([...panels, panel])}>
                                                {PANEL_NAMES[panel]}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </Stack>
                        </Field>
                    </Stack>
                </Section>
            </Split>
            {panels.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>Nothing to preview</EmptyTitle>
                        <EmptyDescription>Add a panel and its figures show here as the report will read.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <DashboardGrid>
                    {panels.map((panel) => {
                        const Part = PANEL_PARTS[panel]
                        return (
                            <Fragment key={panel}>
                                <Part />
                            </Fragment>
                        )
                    })}
                </DashboardGrid>
            )}
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${start?.name ?? 'this report'}?`}
                detail="The report goes for everyone; the figures it reads stay as they are."
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        setDeleting(false)
                        if (start !== undefined)
                            void reports.remove(start.id).then(() => {
                                toast.add({ title: `${start.name} deleted` })
                                go(href('reports'))
                            })
                    },
                }}
            />
        </Stack>
    )
}
