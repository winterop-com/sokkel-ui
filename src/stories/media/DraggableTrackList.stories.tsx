import type { Meta, StoryObj } from '@storybook/react-vite'
import { Disc3, ListMusic } from 'lucide-react'
import { useState } from 'react'

import type { DragData } from '@winterop-com/sokkel-ui/DragDrop'
import { RailDrops } from '@winterop-com/sokkel-ui/RailDrops'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { DraggableTrackList, type Track } from '@winterop-com/sokkel-ui-media/DraggableTrackList'
import { TidevannMark } from '../fixtures/TidevannMark'

interface Song {
    id: string
    title: string
    duration: number
}

const ALBUM: Song[] = [
    { id: 'a', title: 'Harbor at Dusk', duration: 312 },
    { id: 'b', title: 'Low Tide', duration: 244 },
    { id: 'c', title: 'Breakwater', duration: 281 },
    { id: 'd', title: 'Lantern Rock', duration: 287 },
    { id: 'e', title: 'Sea Glass', duration: 198 },
]

const asTrack = (song: Song, index: number): Track => ({
    id: song.id,
    title: song.title,
    number: index + 1,
    duration: song.duration,
})

const SONG = 'song'

const meta: Meta = {
    title: 'Media/Draggable track list',
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/**
 * An album's songs dragged onto a playlist in the rail: a row drags as a whole once the mouse moves
 * (a finger holds it a moment first), the playlist under it ringed, and letting go there adds the
 * song, its count going up. From the keyboard a row's grip picks it up, the arrows carry it to a
 * playlist and Space drops it. A press on a row still plays it.
 */
export const OntoPlaylist: StoryObj = {
    name: 'Onto a playlist',
    render: function Render() {
        const [lists, setLists] = useState<Record<string, string[]>>({ morning: ['a'], focus: [], drive: ['c', 'd'] })
        const [playing, setPlaying] = useState<string | undefined>(undefined)
        const takesSong = (drag: DragData) => drag.kind === SONG
        const add = (list: string) => (drag: DragData) => {
            const track = drag.value as Track
            setLists((now) => (now[list].includes(track.id) ? now : { ...now, [list]: [...now[list], track.id] }))
        }
        const groups: RailGroup[] = [
            { id: 'library', entries: [{ id: 'album', label: 'Open Water', icon: Disc3, href: '#', active: true }] },
            {
                id: 'playlists',
                title: 'Playlists',
                entries: Object.entries(lists).map(([id, songs]) => ({
                    id,
                    label: id.charAt(0).toUpperCase() + id.slice(1),
                    icon: ListMusic,
                    href: '#',
                    count: songs.length,
                    drop: { accepts: takesSong, onDrop: add(id) },
                })),
            },
        ]
        return (
            <RailDrops>
                <Row gap="none" align="stretch" className="h-svh bg-background">
                    <Rail mark={<TidevannMark />} name="Music" groups={groups} />
                    <Stack gap="md" className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
                        <PageHeader title="Open Water" />
                        <DraggableTrackList
                            kind={SONG}
                            tracks={ALBUM.map(asTrack)}
                            current={playing}
                            playing={playing !== undefined}
                            onPlay={(track) => setPlaying(track.id)}
                        />
                    </Stack>
                </Row>
            </RailDrops>
        )
    },
}
