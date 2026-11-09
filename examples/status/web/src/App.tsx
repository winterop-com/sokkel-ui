import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect, useRef } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { go } from 'tidevann-shared/router'
import { Board } from './Board'
import { type Incident, SERVICE_IDS, SITE_BY_ID, SITES } from './data'
import { live, startLive } from './live'
import { notices } from './notices'
import { PublicPage } from './pages/PublicPage'
import { RowsProvider, useRows } from './rows'
import { DEFAULT_SETTINGS, settings } from './settings'
import { type Health, STATUSES } from './status'

const SAID: Record<Health, string> = {
    operational: 'is operational again',
    degraded: 'is degraded',
    outage: 'is down',
    maintenance: 'is in maintenance',
}

const KIND: Record<Health, 'success' | 'warning' | 'error' | 'info'> = {
    operational: 'success',
    degraded: 'warning',
    outage: 'error',
    maintenance: 'info',
}

const notify = () => ({ ...DEFAULT_SETTINGS, ...settings.get() }).notify

/** Tells a change of a service's or a site's state, as the settings ask. */
function tellChange(name: string, from: Health, to: Health, path: string): void {
    const level = notify()
    if (level === 'off' || (level === 'outages' && to !== 'outage' && from !== 'outage')) return
    notices.add({
        title: `${name} ${SAID[to]}`,
        description: `It was ${from}.`,
        type: KIND[to],
        timeout: 6000,
        actionProps: { children: 'Open', onClick: () => go(path) },
    })
}

/** Watches the live world and the incidents, and tells what changes in a notice. */
function Notices() {
    useEffect(() => {
        let before = live.get()
        return live.subscribe(() => {
            const now = live.get()
            for (const id of SERVICE_IDS) {
                if (now.health[id] !== before.health[id]) tellChange(id, before.health[id], now.health[id], `/services/${id}`)
            }
            for (const site of SITES) {
                const from = before.siteHealth[site.id]
                const to = now.siteHealth[site.id]
                if (from !== undefined && to !== undefined && from !== to)
                    tellChange(SITE_BY_ID[site.id]?.city ?? site.id, from, to, '/regions')
            }
            before = now
        })
    }, [])

    const { incidents } = useRows()
    const seen = useRef<Map<string, Incident['state']> | null>(null)
    useEffect(() => {
        if (incidents === undefined) return
        const last = seen.current
        seen.current = new Map(incidents.map((row) => [row.id, row.state]))
        if (last === null || notify() === 'off') return
        for (const row of incidents) {
            const was = last.get(row.id)
            const open = () => go(`/incidents/${row.id}`)
            if (was === undefined && row.state !== 'resolved') {
                notices.add({
                    title: `${row.code} opened`,
                    description: row.title,
                    type: row.severity === 'minor' ? 'warning' : 'error',
                    timeout: 8000,
                    actionProps: { children: 'Open', onClick: open },
                })
            } else if (was !== undefined && was !== 'resolved' && row.state === 'resolved') {
                notices.add({
                    title: `${row.code} resolved`,
                    description: row.title,
                    type: 'success',
                    timeout: 6000,
                    actionProps: { children: 'Open', onClick: open },
                })
            }
        }
    }, [incidents])
    return null
}

/** The Status example: the board inside the shell, and the public status page on its own. */
export function App() {
    const frame = useFrame()
    useEffect(() => startLive(), [])
    return (
        <TooltipProvider>
            <StatusProvider statuses={STATUSES}>
                <RowsProvider>
                    <Toaster toastManager={notices}>
                        <Notices />
                        {frame.route[0] === 'public' ? <PublicPage frame={frame} /> : <Board frame={frame} />}
                    </Toaster>
                </RowsProvider>
            </StatusProvider>
        </TooltipProvider>
    )
}
