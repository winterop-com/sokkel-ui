import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { TimeField } from '@winterop-com/sokkel-ui/TimeField'
import { NativeSelect, NativeSelectOption } from '@winterop-com/sokkel-ui/primitives/native-select'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { createJob, STARTERS, type NewJob } from './backend'
import { dayOf, PEOPLE, PROJECTS, type Cadence, type Person, type Project } from './model'
import { CADENCES } from './schedule'
import { useConsole } from './state'

/** A job's code from its name: `Weekly cleanup` is `weekly-cleanup`. */
const codeOf = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-|-$/g, '')

const MANUAL = 'manual'

/** Makes a job: its name and code, its project and owner, its steps from a starter, and when it runs. */
export function NewJobDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { me, now, jobs } = useConsole()
    const [name, setName] = useState('')
    const [code, setCode] = useState<string | null>(null)
    const [description, setDescription] = useState('')
    const [project, setProject] = useState<Project>('harbor')
    const [owner, setOwner] = useState<Person>(me)
    const [starter, setStarter] = useState<NewJob['starter']>('pipeline')
    const [cadence, setCadence] = useState<Cadence | typeof MANUAL>('daily')
    const [at, setAt] = useState<string | null>('03:00')
    const [busy, setBusy] = useState(false)
    const [tried, setTried] = useState(false)

    const id = code ?? codeOf(name)
    const nameError = name.trim() === '' ? 'A job needs a name.' : null
    const codeError =
        id === ''
            ? 'A job needs a code.'
            : !/^[a-z][a-z0-9-]*$/.test(id)
              ? 'A code is lowercase letters, figures and dashes.'
              : jobs.some((job) => job.id === id)
                ? 'A job has this code already.'
                : null
    const atError = cadence !== MANUAL && at === null ? 'A schedule needs a time.' : null

    const reset = () => {
        setName('')
        setCode(null)
        setDescription('')
        setTried(false)
        setBusy(false)
    }
    const close = () => {
        onOpenChange(false)
        reset()
    }
    const submit = () => {
        setTried(true)
        if (nameError !== null || codeError !== null || atError !== null) return
        setBusy(true)
        createJob({
            id,
            name: name.trim(),
            description: description.trim(),
            project,
            owner,
            starter,
            schedule: cadence === MANUAL ? null : { cadence, at: at ?? '00:00', starts: dayOf(now) },
        }).then(
            (job) => {
                toast.add({ type: 'success', title: `${job.name} made`, description: `${job.id}, ${String(job.steps.length)} steps` })
                close()
                go(`/jobs/${job.id}`)
            },
            (error: unknown) => {
                setBusy(false)
                toast.add({
                    type: 'error',
                    title: 'Could not make the job',
                    description: error instanceof Error ? error.message : String(error),
                })
            },
        )
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={(next) => (next ? onOpenChange(true) : !busy && close())}
            title="New job"
            description="Its steps start from a starter; its schedule and settings change on its page."
            confirm={{ label: 'Make job', onConfirm: submit, busy, busyLabel: 'Making' }}
        >
            <Stack gap="lg">
                <TextField id="job-name" label="Name" value={name} onChange={setName} error={tried ? nameError : null} autoFocus />
                <TextField
                    id="job-code"
                    label="Code"
                    hint="in links and the API"
                    mono
                    value={id}
                    onChange={(value) => setCode(value)}
                    error={tried ? codeError : null}
                />
                <TextField id="job-description" label="Description" multiline rows={2} value={description} onChange={setDescription} />
                <Field id="job-project" label="Project">
                    <Segmented
                        label="Project"
                        value={project}
                        onValueChange={setProject}
                        options={PROJECTS.map((value) => ({ value, label: value }))}
                        fill
                    />
                </Field>
                <Field id="job-owner" label="Owner">
                    <NativeSelect
                        id="job-owner"
                        className="w-full"
                        value={owner}
                        onChange={(event) => setOwner(event.target.value as Person)}
                    >
                        {PEOPLE.map((person) => (
                            <NativeSelectOption key={person} value={person}>
                                {person}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <Field id="job-starter" label="Steps">
                    <NativeSelect
                        id="job-starter"
                        className="w-full"
                        value={starter}
                        onChange={(event) => setStarter(event.target.value as NewJob['starter'])}
                    >
                        {STARTERS.map((one) => (
                            <NativeSelectOption key={one.value} value={one.value}>
                                {one.label}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                <Field id="job-cadence" label="Runs">
                    <NativeSelect
                        id="job-cadence"
                        className="w-full"
                        value={cadence}
                        onChange={(event) => setCadence(event.target.value as Cadence)}
                    >
                        <NativeSelectOption value={MANUAL}>Manual only</NativeSelectOption>
                        {CADENCES.map((one) => (
                            <NativeSelectOption key={one.value} value={one.value}>
                                {one.label}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </Field>
                {cadence !== MANUAL && (
                    <TimeField
                        id="job-at"
                        label="At"
                        zone="UTC"
                        step={15}
                        value={at}
                        onValueChange={setAt}
                        error={tried ? atError : null}
                        required
                    />
                )}
            </Stack>
        </DialogShell>
    )
}
