import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useFrame } from 'tidevann-shared/frame'

import { TasksDemo } from './Tasks'

/** The Tasks example: one page, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    return (
        <TooltipProvider>
            <TasksDemo frame={frame} />
        </TooltipProvider>
    )
}
