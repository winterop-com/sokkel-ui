import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Toaster } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect, useState } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { go } from 'tidevann-shared/router'
import { knowStations } from './catalog'
import { loadKept, settings, stations } from './data'
import { resumeDownloads } from './downloads'
import { Music } from './Music'
import { Dialogs } from './parts/dialogs'
import { currentSong, player, restore, stop } from './player'
import { CARRIED } from './themes'

/** Reads what the backend kept, then picks the player up where it was left. */
function useStart(): boolean {
    const [ready, setReady] = useState(false)
    useEffect(() => {
        let live = true
        const follow = stations.store.subscribe(() => knowStations(stations.store.get() ?? []))
        void stations.source
            .list()
            .then((rows) => {
                knowStations(rows)
                return loadKept()
            })
            .then((row) => {
                if (!live) return
                restore(row, settings.get().resume)
                setReady(true)
            })
        const stopDownloads = resumeDownloads()
        window.addEventListener('pagehide', stop)
        return () => {
            live = false
            follow()
            stopDownloads()
            window.removeEventListener('pagehide', stop)
        }
    }, [])
    return ready
}

/** The window's title: what plays, or the app's name. */
function useTitle(): void {
    useEffect(() => {
        const tell = () => {
            const song = currentSong(player.get())
            document.title = song === undefined ? 'Music' : `${song.title} · Music`
        }
        tell()
        return player.subscribe(tell)
    }, [])
}

/** The Music example: a player that really plays, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame(CARRIED)
    const ready = useStart()
    useTitle()
    useEffect(() => {
        if (frame.route.length === 0) go('/albums')
    }, [frame.route.length])
    return (
        <TooltipProvider>
            <Toaster>
                {ready ? (
                    <>
                        <Music frame={frame} />
                        <Dialogs />
                    </>
                ) : (
                    <PageState loading>{null}</PageState>
                )}
            </Toaster>
        </TooltipProvider>
    )
}
