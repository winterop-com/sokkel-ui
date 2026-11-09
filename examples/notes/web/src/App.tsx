import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

import { useFrame } from 'tidevann-shared/frame'
import { Notes } from './Notes'
import { VaultProvider } from './state'

/** The Notes example: a vault of linked notes, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    return (
        <TooltipProvider>
            <Toaster>
                <VaultProvider>
                    <Notes frame={frame} />
                </VaultProvider>
            </Toaster>
        </TooltipProvider>
    )
}
