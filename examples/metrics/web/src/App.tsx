import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useFrame } from 'tidevann-shared/frame'

import { MetricsApp } from './Metrics'

/** The Metrics example: live dashboards and alerts, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    return (
        <TooltipProvider>
            <MetricsApp frame={frame} />
        </TooltipProvider>
    )
}
