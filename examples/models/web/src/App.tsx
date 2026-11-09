import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { RUN_STATUS_MAP } from '@winterop-com/sokkel-ui/lib/status'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { settleCutOff } from './engine/chat'
import { startDownloadEngine } from './engine/downloads'
import { startRunnerEngine } from './engine/runner'
import { ModelsApp } from './ModelsApp'
import { AppDataProvider } from './state'

/** The states the app's chips say beside the run states: a pull's, a model's in memory, the runner's. */
const STATUSES = {
    ...RUN_STATUS_MAP,
    paused: { color: 'warning' as const },
    done: { color: 'succeeded' as const },
    loading: { color: 'running' as const },
    ready: { color: 'good' as const },
    up: { color: 'good' as const },
    down: { color: 'critical' as const },
    starting: { color: 'running' as const },
    stopping: { color: 'warning' as const },
}

/** The Models example: a local library of language models with a chat, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    useEffect(() => {
        settleCutOff()
        const stopRunner = startRunnerEngine()
        const stopDownloads = startDownloadEngine()
        return () => {
            stopRunner()
            stopDownloads()
        }
    }, [])
    return (
        <TooltipProvider>
            <StatusProvider statuses={STATUSES}>
                <Toaster>
                    <AppDataProvider>
                        <ModelsApp frame={frame} />
                    </AppDataProvider>
                </Toaster>
            </StatusProvider>
        </TooltipProvider>
    )
}
