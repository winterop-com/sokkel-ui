/**
 * What can be done to runs and jobs from anywhere in the console: start, retry, cancel and open a
 * run, pause and delete a job. Asking first, and saying what happened, are kept here, so every page,
 * row menu and palette command does the same.
 */

import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { go } from 'tidevann-shared/router'
import { cancelRun, deleteJob, onSettled, retryRun, saveJob, startRun } from './backend'
import type { Job, Run } from './model'
import { useConsole } from './state'
import { isLive, runAt } from './timeline'

export interface Actions {
    runNow: (job: Job) => void
    retry: (run: Run) => void
    /** Cancels a run going, or several, asking first when the person wants that. */
    cancel: (run: Run | readonly Run[]) => void
    /** Opens a run beside the page or on its own, as the person prefers. */
    open: (run: Run) => void
    /** The run shown beside the page, if any. */
    opened: string | null
    close: () => void
    togglePause: (job: Job) => void
    /** Deletes a job once the person says so, then goes to the jobs. */
    remove: (job: Job) => void
}

const Context = createContext<Actions | undefined>(undefined)

const failed = (what: string) => (error: unknown) =>
    toast.add({ type: 'error', title: what, description: error instanceof Error ? error.message : String(error) })

export function ActionsProvider({ children }: { children: ReactNode }) {
    const { me, prefs, jobOf } = useConsole()
    const [opened, setOpened] = useState<string | null>(null)
    const [cancelling, setCancelling] = useState<readonly Run[]>([])
    const [deleting, setDeleting] = useState<Job | null>(null)
    const [busy, setBusy] = useState(false)

    // What the person wants to hear of, read when a run settles rather than when the engine started.
    const wants = useRef({ prefs, me, jobOf })
    wants.current = { prefs, me, jobOf }
    useEffect(
        () =>
            onSettled(({ run }) => {
                const { prefs: now, me: person, jobOf: find } = wants.current
                const name = find(run.job)?.name ?? run.job
                const mine = run.by === person
                if (run.state === 'failed' && (now.notifyFailures || (mine && now.notifyMine)))
                    toast.add({ type: 'error', title: `${name} failed`, description: `${run.id}: ${run.error ?? 'a step failed'}` })
                else if (run.state === 'succeeded' && mine && now.notifyMine)
                    toast.add({ type: 'success', title: `${name} succeeded`, description: `${run.id}, started by you` })
            }),
        [],
    )

    const open = (run: Run) => {
        if (prefs.openRuns === 'page') {
            setOpened(null)
            go(`/runs/${run.id}`)
        } else setOpened(run.id)
    }

    const cancelNow = (some: readonly Run[]) =>
        Promise.all(some.map((run) => cancelRun(run, me))).then(
            () =>
                toast.add({
                    title: some.length === 1 ? 'Run cancelled' : `${String(some.length)} runs cancelled`,
                    description: some.map((run) => run.id).join(', '),
                }),
            failed('Could not cancel'),
        )

    const actions: Actions = {
        runNow: (job) => {
            startRun(job, me).then(
                (run) => {
                    toast.add({ type: 'info', title: `${job.name} queued`, description: `${run.id}, started by you` })
                    open(run)
                },
                failed(`Could not start ${job.id}`),
            )
        },
        retry: (run) => {
            const job = jobOf(run.job)
            if (job === undefined)
                return void toast.add({ type: 'error', title: 'The job is gone', description: `${run.job} was deleted.` })
            retryRun(run, job, me).then((next) => {
                toast.add({ type: 'info', title: `${job.name} queued again`, description: `${next.id} retries ${run.id}` })
                open(next)
            }, failed('Could not retry the run'))
        },
        cancel: (which) => {
            const now = Date.now()
            const some = (Array.isArray(which) ? which : [which]).filter((run: Run) => isLive(runAt(run, now).state))
            if (some.length === 0) return
            if (prefs.confirmCancel) setCancelling(some)
            else void cancelNow(some)
        },
        open,
        opened,
        close: () => setOpened(null),
        togglePause: (job) => {
            saveJob(job, { paused: !job.paused }).then(
                () =>
                    toast.add({
                        title: job.paused ? `${job.name} resumed` : `${job.name} paused`,
                        description: job.paused ? 'Its schedule runs again.' : 'Its schedule starts no runs until it is resumed.',
                    }),
                failed('Could not change the job'),
            )
        },
        remove: (job) => setDeleting(job),
    }

    return (
        <Context value={actions}>
            {children}
            <ConfirmDialog
                open={cancelling.length > 0}
                onOpenChange={(next) => !next && setCancelling([])}
                question={
                    cancelling.length === 1 ? `Cancel ${cancelling[0]?.id ?? 'the run'}?` : `Cancel ${String(cancelling.length)} runs?`
                }
                detail="The step running now stops, and the steps after it are skipped."
                confirm={{
                    label: cancelling.length === 1 ? 'Cancel run' : 'Cancel runs',
                    destructive: true,
                    onConfirm: () => {
                        void cancelNow(cancelling)
                        setCancelling([])
                    },
                }}
                words={{ cancel: 'Keep running' }}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(next) => !next && !busy && setDeleting(null)}
                question={`Delete ${deleting?.id ?? 'the job'}?`}
                detail="Its runs going now are cancelled and its schedule stops. Its past runs stay in the history."
                confirm={{
                    label: 'Delete job',
                    destructive: true,
                    busy,
                    busyLabel: 'Deleting',
                    onConfirm: () => {
                        if (deleting === null) return
                        const job = deleting
                        setBusy(true)
                        deleteJob(job, me)
                            .then(() => {
                                toast.add({ title: `${job.name} deleted`, description: `${job.id} and its schedule are gone.` })
                                go('/jobs')
                            }, failed('Could not delete the job'))
                            .finally(() => {
                                setBusy(false)
                                setDeleting(null)
                            })
                    },
                }}
            />
        </Context>
    )
}

export function useActions(): Actions {
    const actions = useContext(Context)
    if (actions === undefined) throw new Error('useActions is used outside ActionsProvider')
    return actions
}
