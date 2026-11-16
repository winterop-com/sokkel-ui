import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

import { useFrame } from 'tidevann-shared/frame'
import { Podcasts } from './Podcasts'
import { PodcastProvider } from './state'
import { CARRIED } from './themes'

/** The Podcasts example: shows, episodes that really play, the queue and the rest, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    return (
        <TooltipProvider>
            <Toaster>
                <PodcastProvider>
                    <Podcasts frame={frame} />
                </PodcastProvider>
            </Toaster>
            {frame.dialogs}
        </TooltipProvider>
    )
}
