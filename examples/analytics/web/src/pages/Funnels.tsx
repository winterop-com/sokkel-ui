import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Split, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { DashboardGrid, DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { funnels } from '../collections'
import { funnel, type Stage } from '../metrics'
import { STEP_NAMES, STEPS, counted, dayOf, shortDay, type Funnel, type Step } from '../model'
import { OrderList } from '../order'
import { useSegment, useSpans, ViewBar } from '../parts'
import { useLoaded } from '../state'
import { go, rangeName } from '../view'

const WINDOWS = [7, 14, 30, 60, 90, 365]

const BLANK: Omit<Funnel, 'id' | 'by' | 'updated'> = { name: '', steps: ['signedUp', 'project'], window: 30 }

/** The funnels people saved, a funnel built from steps with its preview drawn as the steps change, and saving it. */
export function Funnels({ id }: { id: string | undefined }) {
    const { href } = useLoaded()
    const { rows } = useCollection(funnels)
    const saved = rows ?? []
    const chosen = id === 'new' ? undefined : (saved.find((one) => one.id === id) ?? (id === undefined ? saved[0] : undefined))
    const columns: DataColumn<Funnel>[] = [
        { id: 'name', header: 'Funnel', width: 'minmax(8rem,1fr)', cell: (one) => one.name },
        {
            id: 'steps',
            header: 'Steps',
            width: '5rem',
            align: 'end',
            cell: (one) => <span className="text-muted-foreground">{counted(one.steps.length, 'step')}</span>,
        },
    ]
    return (
        <>
            <PageHeader
                title="Funnels"
                description="How far teams get, step by step, from the day they sign up."
                actions={
                    <Button onClick={() => go(href('funnels/new'))}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <ViewBar />
            <Split
                side="start"
                width="sm"
                align="start"
                aside={
                    <Section title="Saved" meta={String(saved.length)} variant="boxed" flush>
                        <DataTable
                            variant="list"
                            framed={false}
                            minWidth="auto"
                            stackLayout="compact"
                            columns={columns}
                            rows={saved}
                            rowKey={(one) => one.id}
                            onOpen={(one) => go(href(`funnels/${one.id}`))}
                            opened={(one) => one.id === chosen?.id}
                            empty="No funnel saved yet."
                        />
                    </Section>
                }
            >
                {rows === undefined ? null : id !== undefined && id !== 'new' && chosen === undefined ? (
                    <Section title="No such funnel" variant="boxed">
                        <p className="text-muted-foreground">No saved funnel has the id {id}. It may have been deleted.</p>
                    </Section>
                ) : (
                    <Builder key={chosen?.id ?? 'new'} funnel={chosen} />
                )}
            </Split>
        </>
    )
}

/** A funnel's name, steps and window, its preview over the range and segment, and saving it. */
function Builder({ funnel: start }: { funnel: Funnel | undefined }) {
    const { world, me, href, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const [name, setName] = useState(start?.name ?? BLANK.name)
    const [steps, setSteps] = useState<Step[]>(start?.steps ?? BLANK.steps)
    const [within, setWithin] = useState(start?.window ?? BLANK.window)
    const [busy, setBusy] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const stages = useMemo(() => funnel(world, segment, span.from, span.to, steps, within), [world, segment, span, steps, within])
    const before = useMemo(
        () => (view.compare ? funnel(world, segment, previous.from, previous.to, steps, within) : undefined),
        [world, segment, previous, steps, within, view.compare],
    )
    const rows = useMemo(() => stages.map((stage) => ({ stage: stage.name, teams: stage.count })), [stages])

    const changed = start === undefined || start.name !== name.trim() || start.window !== within || start.steps.join() !== steps.join()
    const why =
        name.trim() === ''
            ? 'A funnel needs a name.'
            : steps.length < 2
              ? 'A funnel needs two steps or more.'
              : !changed
                ? 'Nothing has changed since it was saved.'
                : undefined
    const save = () => {
        setBusy(true)
        const fields = { name: name.trim(), steps, window: within, by: me, updated: Date.now() }
        const done = start === undefined ? funnels.create(fields, `funnel-${Date.now().toString(36)}`) : funnels.update(start.id, fields)
        void done.then(
            (row) => {
                setBusy(false)
                toast.add({ type: 'success', title: `${row.name} saved`, description: counted(row.steps.length, 'step') })
                if (start === undefined) go(href(`funnels/${row.id}`))
            },
            (error: unknown) => {
                setBusy(false)
                toast.add({
                    type: 'error',
                    title: 'Could not save the funnel',
                    description: error instanceof Error ? error.message : String(error),
                })
            },
        )
    }
    const add = (step: Step) => setSteps(step === 'visited' ? ['visited', ...steps] : [...steps, step])
    const left = STEPS.filter((step) => !steps.includes(step))
    const stageColumns: DataColumn<Stage>[] = [
        { id: 'stage', header: 'Step', width: 'minmax(10rem,1fr)', cell: (stage) => stage.name },
        {
            id: 'count',
            header: 'Reached',
            width: '6rem',
            align: 'end',
            cell: (stage) => <span className="tabular-nums">{stage.count.toLocaleString('en-US')}</span>,
        },
        {
            id: 'previous',
            header: 'Of the step before',
            width: '9rem',
            align: 'end',
            cell: (stage) => <span className="tabular-nums">{`${stage.ofPrevious.toFixed(1)}%`}</span>,
        },
        {
            id: 'first',
            header: 'Of the first',
            width: '7rem',
            align: 'end',
            cell: (stage) => <span className="tabular-nums">{`${stage.ofFirst.toFixed(1)}%`}</span>,
        },
        ...(before === undefined
            ? []
            : [
                  {
                      id: 'before',
                      header: 'Period before',
                      width: '8rem',
                      align: 'end' as const,
                      cell: (stage: Stage) => {
                          const then = before.find((one) => one.step === stage.step)
                          return (
                              <span className="text-muted-foreground tabular-nums">
                                  {then === undefined ? '-' : `${then.ofFirst.toFixed(1)}%`}
                              </span>
                          )
                      },
                  },
              ]),
    ]
    const last = stages[stages.length - 1]
    return (
        <Stack gap="section">
            <Section
                title={start === undefined ? 'New funnel' : start.name}
                description={start === undefined ? 'Not saved yet.' : `Saved by ${start.by}, ${shortDay(dayOf(start.updated))}.`}
                variant="boxed"
                actions={
                    <>
                        {start !== undefined && (
                            <IconButton label="Delete funnel" variant="ghost" size="icon-sm" onClick={() => setDeleting(true)}>
                                <Trash2 aria-hidden />
                            </IconButton>
                        )}
                        <Button size="sm" reason={why} disabled={busy} onClick={save}>
                            <Save aria-hidden />
                            {busy ? 'Saving' : 'Save'}
                        </Button>
                    </>
                }
            >
                <Stack gap="lg">
                    <TextField id="funnel-name" label="Name" value={name} onChange={setName} placeholder="Sign-up to paid" />
                    <Field id="funnel-steps" label="Steps" description="Each step counts the teams that took it after the step before.">
                        <Stack gap="sm">
                            <OrderList
                                items={steps}
                                onChange={setSteps}
                                name={(step) => STEP_NAMES[step]}
                                noun="Step"
                                figure={{
                                    header: 'Reached',
                                    cell: (_, index) => (
                                        <span className="tabular-nums">{(stages[index]?.count ?? 0).toLocaleString('en-US')}</span>
                                    ),
                                }}
                                stuck={(step, index, by) =>
                                    step === 'visited'
                                        ? 'Visiting the site comes first.'
                                        : by === -1 && index === 1 && steps[0] === 'visited'
                                          ? 'Visiting the site comes first.'
                                          : undefined
                                }
                                empty="No steps yet. Add the first below."
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" size="sm" className="self-start" disabled={left.length === 0} />}
                                >
                                    <Plus aria-hidden />
                                    Add step
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {left.map((step) => (
                                        <DropdownMenuItem key={step} onClick={() => add(step)}>
                                            {STEP_NAMES[step]}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </Stack>
                    </Field>
                    <Field id="funnel-window" label="Within" description="How long after signing up a team has to take every step.">
                        <NativeSelect id="funnel-window" value={String(within)} onChange={(event) => setWithin(Number(event.target.value))}>
                            {WINDOWS.map((days) => (
                                <NativeSelectOption key={days} value={String(days)}>
                                    {days === 365 ? 'A year' : `${String(days)} days`}
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </Field>
                </Stack>
            </Section>
            <DashboardGrid>
                <ChartPanel
                    kind="funnel"
                    title="Preview"
                    subtitle={`teams that signed up, ${rangeName(view.range).toLowerCase()}`}
                    span="full"
                    rows={rows}
                    x="stage"
                    y="teams"
                    order={rows.map((row) => row.stage)}
                    legend="none"
                    bodyClassName="h-64"
                    empty={steps.length === 0}
                    file={name.trim() === '' ? 'funnel' : name.trim().toLowerCase().replaceAll(/\s+/g, '-')}
                />
                <DashboardPanel
                    title="Steps"
                    subtitle={
                        last === undefined
                            ? undefined
                            : `${last.ofFirst.toFixed(1)}% made it through, within ${within === 365 ? 'a year' : `${String(within)} days`}`
                    }
                    span="full"
                    flush
                    empty={steps.length === 0}
                >
                    <DataTable
                        variant="list"
                        framed={false}
                        minWidth="auto"
                        stackBelow={480}
                        columns={stageColumns}
                        rows={stages}
                        rowKey={(stage) => stage.step}
                    />
                </DashboardPanel>
            </DashboardGrid>
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                question={`Delete ${start?.name ?? 'this funnel'}?`}
                detail="The funnel goes for everyone; the teams it counts stay as they are."
                confirm={{
                    label: 'Delete',
                    destructive: true,
                    onConfirm: () => {
                        setDeleting(false)
                        if (start !== undefined)
                            void funnels.remove(start.id).then(() => {
                                toast.add({ title: `${start.name} deleted` })
                                go(href('funnels'))
                            })
                    },
                }}
            />
        </Stack>
    )
}
