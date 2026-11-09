import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useFrame } from 'tidevann-shared/frame'

import { Visualizer } from './Visualizer'

/** The Dataviz example: datasets, charts and boards, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    return (
        <TooltipProvider>
            <Visualizer frame={frame} />
        </TooltipProvider>
    )
}
