/** What every page of the console reads: the jobs, the runs as they stand now, the person's preferences and the clock. */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { jobs, prefs, runs } from './backend'
import { DEFAULT_PREFS, type Job, type Person, type Prefs, type Run } from './model'
import { runAt, type RunAt } from './timeline'

/** A run with where it stands now. */
export interface LiveRun extends Run {
    at: RunAt
}

export interface ConsoleState {
    jobs: Job[]
    runs: LiveRun[]
    /** Whether the first answer is still on its way. */
    loading: boolean
    error: string | undefined
    prefs: Prefs
    setPrefs: (patch: Partial<Omit<Prefs, 'id'>>) => Promise<void>
    /** Who is signed in. */
    me: Person
    now: number
    jobOf: (id: string) => Job | undefined
    runOf: (id: string) => LiveRun | undefined
}

const Context = createContext<ConsoleState | undefined>(undefined)

/** The clock, read again every `every` milliseconds. */
export function useNow(every = 1000): number {
    const [now, setNow] = useState(Date.now)
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), every)
        return () => window.clearInterval(timer)
    }, [every])
    return now
}

/** Settled runs stand where they ended, so each is worked out once. */
const settled = new WeakMap<Run, RunAt>()

/** Past every moment a run plans, so a settled run is read as it ended, never by a clock read before it settled. */
const LATER = Number.MAX_SAFE_INTEGER

function standing(run: Run, now: number): RunAt {
    const live = run.state === 'running' || run.state === 'queued'
    if (live) return runAt(run, now)
    let at = settled.get(run)
    if (at === undefined) {
        at = runAt(run, LATER)
        settled.set(run, at)
    }
    return at
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
    const now = useNow()
    const jobRows = useCollection(jobs)
    const runRows = useCollection(runs)
    const prefRows = useCollection(prefs)
    const mine = prefRows.rows?.[0] ?? DEFAULT_PREFS
    const live = useMemo(() => (runRows.rows ?? []).map((run) => ({ ...run, at: standing(run, now) })), [runRows.rows, now])
    const value = useMemo((): ConsoleState => {
        const jobList = jobRows.rows ?? []
        return {
            jobs: jobList,
            runs: live,
            loading: jobRows.rows === undefined || runRows.rows === undefined,
            error: jobRows.error ?? runRows.error,
            prefs: mine,
            setPrefs: (patch) => prefs.update(mine.id, patch).then(() => undefined),
            me: mine.user ?? 'ada',
            now,
            jobOf: (id) => jobList.find((job) => job.id === id),
            runOf: (id) => live.find((run) => run.id === id),
        }
    }, [jobRows.rows, jobRows.error, runRows.rows, runRows.error, live, mine, now])
    return <Context value={value}>{children}</Context>
}

export function useConsole(): ConsoleState {
    const state = useContext(Context)
    if (state === undefined) throw new Error('useConsole is used outside ConsoleProvider')
    return state
}
