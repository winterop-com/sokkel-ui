import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

import { useFrame } from 'tidevann-shared/frame'
import { Home } from './Home'
import { CARRIED } from './themes'

/** The Network watch example: Tidevann's watch over a machine's connections, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <Toaster>
                <Home frame={frame} />
            </Toaster>
            {frame.dialogs}
        </TooltipProvider>
    )
}
