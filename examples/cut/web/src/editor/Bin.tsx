import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Waveform } from '@winterop-com/sokkel-ui/primitives/waveform'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { ArrowRightToLine, Plus, Type } from 'lucide-react'

import { peaksOf, posterOf, SOURCES, type Source } from '../media'
import { lengthText } from '../model'

/** How many bars a sound's card draws. */
const BARS = 48

/** A sound's peaks gathered into `BARS` bars, the loudest of each run. */
function barsOf(source: Source): number[] {
    const peaks = peaksOf(source)
    const each = Math.max(1, Math.floor(peaks.length / BARS))
    return Array.from({ length: Math.min(BARS, peaks.length) }, (_, index) => Math.max(...peaks.slice(index * each, (index + 1) * each), 0))
}

function SourceCard({ source, onAdd, onAppend }: { source: Source; onAdd: () => void; onAppend: () => void }) {
    return (
        <MediaCard
            shape="wide"
            title={source.name}
            subtitle={source.place}
            titleLines={1}
            badge={lengthText(source.duration)}
            cover={
                source.kind === 'video' ? (
                    <Artwork src={posterOf(source)} seed={source.id} wide />
                ) : (
                    <Waveform
                        data={barsOf(source)}
                        height="100%"
                        barWidth={2}
                        barGap={1}
                        fadeEdges={false}
                        className="size-full px-2 text-primary"
                    />
                )
            }
            onSelect={onAdd}
            menu={
                <>
                    <DropdownMenuItem onClick={onAdd}>
                        <Plus aria-hidden />
                        Add at the playhead
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onAppend}>
                        <ArrowRightToLine aria-hidden />
                        Add at the end
                    </DropdownMenuItem>
                </>
            }
        />
    )
}

/**
 * The media bin: the pictures and sounds to cut from, each placed at the playhead when pressed or
 * at the end of its track from its menu, and a title added at the playhead.
 */
export function Bin({
    onAdd,
    onAppend,
    onTitle,
}: {
    onAdd: (source: Source) => void
    onAppend: (source: Source) => void
    onTitle: () => void
}) {
    const pictures = SOURCES.filter((source) => source.kind === 'video')
    const sounds = SOURCES.filter((source) => source.kind === 'audio')
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PaneHeader
                title="Media"
                variant="panel"
                actions={
                    <Button size="xs" variant="outline" onClick={onTitle}>
                        <Type aria-hidden />
                        Title
                    </Button>
                }
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <Stack gap="lg">
                    <Stack gap="sm">
                        <GroupLabel>Pictures</GroupLabel>
                        <MediaGrid shape="wide" min="7.5rem" label="Pictures">
                            {pictures.map((source) => (
                                <SourceCard key={source.id} source={source} onAdd={() => onAdd(source)} onAppend={() => onAppend(source)} />
                            ))}
                        </MediaGrid>
                    </Stack>
                    <Stack gap="sm">
                        <GroupLabel>Sound</GroupLabel>
                        <MediaGrid shape="wide" min="7.5rem" label="Sound">
                            {sounds.map((source) => (
                                <SourceCard key={source.id} source={source} onAdd={() => onAdd(source)} onAppend={() => onAppend(source)} />
                            ))}
                        </MediaGrid>
                    </Stack>
                </Stack>
            </div>
        </div>
    )
}
