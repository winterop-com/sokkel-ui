import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { settleDownloads } from './clips'
import { downloads } from './data'
import { DialogsProvider } from './dialogs'
import { Site } from './Site'

/** The Video example: Tidevann's video site, whose every video is made in the browser, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    // Downloads put back by a reset of the demo data leave their kept clips free to go.
    useEffect(() => {
        void downloads.list().then((rows) => settleDownloads(rows.map((row) => row.id)))
    }, [])
    return (
        <TooltipProvider>
            <Toaster>
                <DialogsProvider>
                    <Site frame={frame} />
                </DialogsProvider>
            </Toaster>
        </TooltipProvider>
    )
}
