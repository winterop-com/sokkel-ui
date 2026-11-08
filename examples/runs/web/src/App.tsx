import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useFrame } from 'tidevann-shared/frame'

import { RunsDemo } from './Runs'

/** The Runs example: one page, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    return (
        <TooltipProvider>
            <RunsDemo frame={frame} />
        </TooltipProvider>
    )
}
