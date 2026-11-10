import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

import { useFrame } from 'tidevann-shared/frame'
import { CARRIED } from './Settings'
import { StudioProvider } from './state'
import { Studio } from './Studio'

/** The Studio example: pipelines, schemas and queries edited and run, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <Toaster>
                <StudioProvider>
                    <Studio frame={frame} />
                </StudioProvider>
            </Toaster>
        </TooltipProvider>
    )
}
