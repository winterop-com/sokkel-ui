import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect } from 'react'
import { useFrame } from 'tidevann-shared/frame'

import { Console } from './Console'
import { record } from './history'
import { engine, startControl } from './store'
import { CARRIED } from './themes'

/** The states the site's chips and dots say: a source's status, and an incident's severity. */
const STATUSES = {
    up: { color: 'good' },
    degraded: { color: 'warning' },
    down: { color: 'critical', live: true },
    unknown: { color: 'neutral' },
    minor: { color: 'neutral' },
    moderate: { color: 'info' },
    severe: { color: 'warning' },
    extreme: { color: 'critical' },
} as const

/** The Control site example: one state shared by every window of it, read by the wall, the operator's console and the sources. */
export function App() {
    const frame = useFrame(CARRIED)
    useEffect(() => {
        startControl()
        record(Date.now())
        return engine.subscribe(() => record(Date.now()))
    }, [])
    return (
        <StatusProvider statuses={STATUSES}>
            <TooltipProvider>
                <Toaster>
                    <Console frame={frame} />
                </Toaster>
                {frame.dialogs}
            </TooltipProvider>
        </StatusProvider>
    )
}
