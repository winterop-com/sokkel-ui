import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { RUN_STATUS_MAP } from '@winterop-com/sokkel-ui/lib/status'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { ActionsProvider } from './actions'
import { startEngine } from './backend'
import { Console } from './Console'
import { SignInPage } from './SignInPage'
import { ConsoleProvider, useConsole } from './state'

/** The run states, and a job's paused schedule. */
const STATUSES = { ...RUN_STATUS_MAP, paused: { color: 'warning' as const } }

function Door() {
    const frame = useFrame()
    const { prefs } = useConsole()
    if (prefs.user === null) return <SignInPage frame={frame} />
    return (
        <ActionsProvider>
            <Console frame={frame} />
        </ActionsProvider>
    )
}

/** The Runs example: Tidevann's jobs console, in a browser or either desktop shell. */
export function App() {
    useEffect(startEngine, [])
    return (
        <TooltipProvider>
            <StatusProvider statuses={STATUSES}>
                <Toaster>
                    <ConsoleProvider>
                        <Door />
                    </ConsoleProvider>
                </Toaster>
            </StatusProvider>
        </TooltipProvider>
    )
}
