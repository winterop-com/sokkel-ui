/** What the fake server keeps: the preferences, the alerts raised, and what is already known. */

import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, type Alert, type Known, type Prefs } from './model'

const MINUTE = 60_000

export const prefs = collection<Prefs>('prefs', () => [{ id: 'prefs', ...DEFAULT_PREFS }])

/** A few alerts from earlier, already acknowledged, so the list starts with a past. */
export const alerts = collection<Alert>('alerts', () => {
    const now = Date.now()
    return [
        {
            id: 'alert-seed-1',
            kind: 'spike',
            title: 'updater received 6.4 MB/s',
            detail: 'Over the 5 MB/s limit for receiving, from one host.',
            at: now - 95 * MINUTE,
            acknowledged: true,
            acknowledgedAt: now - 90 * MINUTE,
            process: 'updater',
        },
        {
            id: 'alert-seed-2',
            kind: 'spike',
            title: 'backup sent 3.1 MB/s',
            detail: 'Over the 2.5 MB/s limit for sending, to one host.',
            at: now - 3 * 60 * MINUTE,
            acknowledged: true,
            acknowledgedAt: now - 3 * 60 * MINUTE + 4 * MINUTE,
            process: 'backup',
        },
    ]
})

export const known = collection<Known>('known', () => [])
