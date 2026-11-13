import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { RUN_STATUS_MAP } from '@winterop-com/sokkel-ui/lib/status'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

import { useFrame } from 'tidevann-shared/frame'
import { Home } from './Home'
import { CARRIED } from './themes'

/** The Dashboard example: Tidevann's home of live dashboards, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <StatusProvider statuses={RUN_STATUS_MAP}>
                <Toaster>
                    <Home frame={frame} />
                </Toaster>
            </StatusProvider>
        </TooltipProvider>
    )
}
