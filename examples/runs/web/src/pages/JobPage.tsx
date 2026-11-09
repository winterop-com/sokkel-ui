import { PipelineGraph } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { InlineEdit } from '@winterop-com/sokkel-ui/InlineEdit'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { ListChecks, Pause, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useActions } from '../actions'
import { saveJob } from '../backend'
import { counted, PEOPLE, PROJECTS, stamp, took, type Cadence, type Job, type Person, type Project } from '../model'
import { runColumns, runMenu } from '../parts'
import { CADENCES, nextFire, saySchedule } from '../schedule'
import { useConsole } from '../state'

const MANUAL = 'manual'
const CADENCE_OPTIONS = [{ value: MANUAL, label: 'Manual only' }, ...CADENCES]
const PEOPLE_OPTIONS = PEOPLE.map((value) => ({ value, label: value }))
const PROJECT_OPTIONS = PROJECTS.map((value) => ({ value, label: value }))

const atMostTen = (value: number | null) =>
    value === null || value < 0 || value > 10 || !Number.isInteger(value) ? 'Retries are a whole number from 0 to 10.' : undefined
const positive = (value: number | null) =>
    value !== null && (value < 1 || value > 1440) ? 'A timeout is from 1 to 1,440 minutes, or empty for none.' : undefined

/** A job's page: its name and settings edited in place, its steps as a graph, its schedule, and its recent runs. */
export function JobPage({ id }: { id: string }) {
    const { jobOf, runs, now, prefs, loading } = useConsole()
    const actions = useActions()
    const job = jobOf(id)
    const [step, setStep] = useState<string | null>(null)
    useCommands(
        job === undefined
            ? []
            : [
                  {
                      title: job.name,
                      commands: [
                          { id: 'job-run', label: `Run ${job.id} now`, icon: Play, onSelect: () => actions.runNow(job) },
                          ...(job.schedule === null
                              ? []
                              : [
                                    {
                                        id: 'job-pause',
                                        label: job.paused ? `Resume ${job.id}` : `Pause ${job.id}`,
                                        icon: job.paused ? Play : Pause,
                                        onSelect: () => actions.togglePause(job),
                                    },
                                ]),
                          { id: 'job-delete', label: `Delete ${job.id}`, icon: Trash2, onSelect: () => actions.remove(job) },
                      ],
                  },
              ],
        [job],
    )

    if (job === undefined) {
        return loading ? null : (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>No job {id}</EmptyTitle>
                    <EmptyDescription>It may have been deleted, or the demo data reset.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/jobs')}>
                    <ListChecks aria-hidden />
                    All jobs
                </Button>
            </Empty>
        )
    }

    const save = (patch: Partial<Omit<Job, 'id'>>) => saveJob(job, patch).then(() => undefined)
    const own = runs.filter((run) => run.job === job.id)
    const recent = own.slice(0, 50)
    const next = job.schedule === null || job.paused ? null : nextFire(job.schedule, now)
    const chosen = job.steps.find((one) => one.code === step)
    const schedule = job.schedule

    return (
        <Stack gap="page">
            <PageHeader
                title={
                    <InlineEdit
                        label="Name"
                        variant="title"
                        value={job.name}
                        validate={(name) => (name.trim() === '' ? 'A job needs a name.' : undefined)}
                        onSave={(name) => save({ name: name.trim() })}
                    />
                }
                code={job.id}
                meta={
                    <MetaLine
                        items={[
                            job.paused ? <StatusChip key="paused" status="paused" /> : saySchedule(schedule),
                            `Owned by ${job.owner}`,
                            `Project ${job.project}`,
                            counted(own.length, 'run'),
                        ]}
                    />
                }
                actions={
                    <>
                        <Button size="sm" variant="ghost" onClick={() => actions.remove(job)}>
                            <Trash2 aria-hidden />
                            Delete
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => actions.togglePause(job)}
                            reason={schedule === null ? 'The job has no schedule to pause.' : undefined}
                        >
                            {job.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                            {job.paused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button size="sm" onClick={() => actions.runNow(job)}>
                            <Play aria-hidden />
                            Run now
                        </Button>
                    </>
                }
            />
            <Section title="Steps" meta={counted(job.steps.length, 'step')} flush>
                <PipelineGraph steps={job.steps} selected={step} onSelect={setStep} frame="fitted" words={{ label: `${job.id} steps` }} />
            </Section>
            {chosen !== undefined && (
                <Section
                    title={<span className="font-mono">{chosen.code}</span>}
                    meta={chosen.kind}
                    actions={
                        <Button size="xs" variant="ghost" onClick={() => setStep(null)}>
                            Close
                        </Button>
                    }
                >
                    <DescriptionList
                        termWidth="7rem"
                        items={[
                            { term: 'Runs on', value: chosen.kind, code: true },
                            { term: 'Needs', value: chosen.needs.length === 0 ? 'nothing' : chosen.needs.join(', '), code: true },
                            { term: 'Usual time', value: took(job.pace * 1000) },
                            {
                                term: 'Failed',
                                value: counted(
                                    own.filter((run) => run.at.state === 'failed' && run.at.step === chosen.code).length,
                                    'time',
                                ),
                            },
                        ]}
                    />
                </Section>
            )}
            <Columns count={2} min="md" gap="section">
                <Section title="Schedule" description="On the UTC clock. Each saves as it is changed.">
                    <DescriptionList
                        termWidth="6rem"
                        items={[
                            {
                                term: 'Runs',
                                value: (
                                    <InlineEdit
                                        label="Runs"
                                        editor="select"
                                        options={CADENCE_OPTIONS}
                                        value={schedule?.cadence ?? MANUAL}
                                        onSave={(cadence) =>
                                            save({
                                                schedule:
                                                    cadence === MANUAL
                                                        ? null
                                                        : {
                                                              cadence: cadence as Cadence,
                                                              at: schedule?.at ?? '03:00',
                                                              starts: schedule?.starts ?? new Date(now).toISOString().slice(0, 10),
                                                          },
                                            })
                                        }
                                    />
                                ),
                            },
                            {
                                term: 'At',
                                value: (
                                    <InlineEdit
                                        label="At"
                                        editor="time"
                                        value={schedule?.at ?? null}
                                        disabled={schedule === null}
                                        placeholder="No schedule"
                                        display={(at) => `${at ?? ''} UTC`}
                                        validate={(at) => (at === null ? 'A schedule needs a time.' : undefined)}
                                        onSave={(at) =>
                                            schedule === null || at === null ? Promise.resolve() : save({ schedule: { ...schedule, at } })
                                        }
                                    />
                                ),
                            },
                            {
                                term: 'From',
                                value: (
                                    <InlineEdit
                                        label="From"
                                        editor="date"
                                        value={schedule?.starts ?? null}
                                        disabled={schedule === null}
                                        placeholder="No schedule"
                                        validate={(starts) => (starts === null ? 'A schedule needs a first day.' : undefined)}
                                        onSave={(starts) =>
                                            schedule === null || starts === null
                                                ? Promise.resolve()
                                                : save({ schedule: { ...schedule, starts } })
                                        }
                                    />
                                ),
                            },
                            {
                                term: 'Next run',
                                value: (
                                    <InlineEdit
                                        label="Next run"
                                        value={job.paused ? 'Paused' : next === null ? 'Only when started' : stamp(next)}
                                        disabled
                                        onSave={() => undefined}
                                    />
                                ),
                            },
                        ]}
                    />
                </Section>
                <Section title="Settings" description="Each saves as it is changed.">
                    <DescriptionList
                        termWidth="6rem"
                        items={[
                            {
                                term: 'Owner',
                                value: (
                                    <InlineEdit
                                        label="Owner"
                                        editor="select"
                                        options={PEOPLE_OPTIONS}
                                        value={job.owner}
                                        onSave={(owner) => save({ owner: owner as Person })}
                                    />
                                ),
                            },
                            {
                                term: 'Project',
                                value: (
                                    <InlineEdit
                                        label="Project"
                                        editor="select"
                                        options={PROJECT_OPTIONS}
                                        value={job.project}
                                        onSave={(project) => save({ project: project as Project })}
                                    />
                                ),
                            },
                            {
                                term: 'Retries',
                                value: (
                                    <InlineEdit
                                        label="Retries"
                                        editor="number"
                                        value={job.retries}
                                        validate={atMostTen}
                                        onSave={(retries) => save({ retries: retries ?? 0 })}
                                    />
                                ),
                            },
                            {
                                term: 'Timeout',
                                value: (
                                    <InlineEdit
                                        label="Timeout"
                                        editor="number"
                                        value={job.timeout}
                                        placeholder="None"
                                        validate={positive}
                                        display={(minutes) => (minutes === null ? 'None' : `${String(minutes)} min`)}
                                        onSave={(timeout) => save({ timeout })}
                                    />
                                ),
                            },
                            {
                                term: 'Description',
                                value: (
                                    <InlineEdit
                                        label="Description"
                                        editor="multiline"
                                        value={job.description}
                                        placeholder="None"
                                        onSave={(description) => save({ description })}
                                    />
                                ),
                            },
                        ]}
                    />
                </Section>
            </Columns>
            <Section
                title="Recent runs"
                meta={own.length > recent.length ? `the last ${String(recent.length)}` : counted(own.length, 'run')}
                flush
            >
                <DataTable
                    variant="list"
                    framed={false}
                    minWidth="auto"
                    columns={runColumns(now, prefs.times, { job: false })}
                    rows={recent}
                    rowKey={(run) => run.id}
                    rowActions={(run) => runMenu(run, actions)}
                    onOpen={actions.open}
                    opened={(run) => run.id === actions.opened}
                    words={{ empty: 'No runs yet. Run now starts one.' }}
                />
            </Section>
        </Stack>
    )
}
