/** A music page: an album's tracks, and the player bar along the foot with a cover drawn from the album's name. */

import './styles.css'

import { AccountMenu } from '@winterop-com/sokkel-ui/AccountMenu'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { TopBar } from '@winterop-com/sokkel-ui/TopBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { TrackList, type Track } from '@winterop-com/sokkel-ui-media/TrackList'
import { Disc3, ListMusic } from 'lucide-react'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

const GROUPS: RailGroup[] = [
    {
        id: 'listen',
        entries: [
            { id: 'albums', label: 'Albums', icon: Disc3, href: '#', active: true },
            { id: 'queue', label: 'Queue', icon: ListMusic, href: '#' },
        ],
    },
]

const ALBUM = 'Slack water'

const TRACKS: Track[] = [
    { id: 't1', number: 1, title: 'Low tide', duration: 214 },
    { id: 't2', number: 2, title: 'Harbor lights', duration: 187 },
    { id: 't3', number: 3, title: 'The long quay', duration: 242 },
    { id: 't4', number: 4, title: 'Turning', duration: 198 },
]

function App() {
    const [current, setCurrent] = useState(TRACKS[0])
    const [playing, setPlaying] = useState(false)
    const [position, setPosition] = useState(0)
    const [volume, setVolume] = useState(0.7)
    const step = (by: number) => {
        setCurrent(TRACKS[(TRACKS.indexOf(current) + by + TRACKS.length) % TRACKS.length])
        setPosition(0)
    }
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail name="Tidevann" groups={GROUPS} foot={<AccountMenu name="ada" where="tidevann.example.org" />} />}
                top={<TopBar trail={[{ label: 'Albums', href: '#' }, { label: ALBUM }]} />}
                bottom={
                    <MediaBar
                        title={current.title}
                        album={ALBUM}
                        placeholderSeed={ALBUM}
                        playing={playing}
                        onPlayingChange={setPlaying}
                        position={position}
                        duration={current.duration}
                        onSeek={setPosition}
                        volume={volume}
                        onVolumeChange={setVolume}
                        onPrevious={() => step(-1)}
                        onNext={() => step(1)}
                    />
                }
            >
                <Page>
                    <PageHeader title={ALBUM} count={`${String(TRACKS.length)} tracks`} />
                    <TrackList
                        tracks={TRACKS}
                        current={current.id}
                        onPlay={(track) => {
                            setCurrent(track)
                            setPosition(0)
                            setPlaying(true)
                        }}
                    />
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

const root = document.getElementById('root')
if (root === null) throw new Error('No #root element')
createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
