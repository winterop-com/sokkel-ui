import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { Console } from './Console'
import { startFeed } from './feed'
import { CARRIED } from './themes'

/** The Flight watch example: the console inside the shell, over a feed that runs while the page is open. */
export function App() {
    const frame = useFrame(CARRIED)
    useEffect(() => startFeed(), [])
    return (
        <TooltipProvider>
            <Toaster>
                <Console frame={frame} />
            </Toaster>
            {frame.dialogs}
        </TooltipProvider>
    )
}
