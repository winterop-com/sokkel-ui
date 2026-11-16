import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useFrame } from 'tidevann-shared/frame'

import { TasksDemo } from './Tasks'
import { CARRIED } from './themes'

/** The Tasks example: one page, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <TasksDemo frame={frame} />
            {frame.dialogs}
        </TooltipProvider>
    )
}
