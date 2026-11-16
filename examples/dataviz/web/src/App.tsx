import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useFrame } from 'tidevann-shared/frame'

import { Visualizer } from './Visualizer'
import { CARRIED } from './themes'

/** The Dataviz example: datasets, charts and boards, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <Visualizer frame={frame} />
            {frame.dialogs}
        </TooltipProvider>
    )
}
