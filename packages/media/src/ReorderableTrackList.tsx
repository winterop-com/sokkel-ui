import { SortableGrip, SortableGroup, SortableItem } from '@winterop-com/sokkel-ui/Sortable'
import { useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { TrackList, type Track, type TrackListProps, type TrackListWords, type TrackRowProps } from './TrackList'
import { writeCount } from '@winterop-com/sokkel-ui/lib/numbers'

export type { Track } from './TrackList'

/** The words a reorderable list says beyond a track list's, each with an English default. */
export interface ReorderableTrackListWords extends TrackListWords {
    /** The grip's name: what a drag or the arrow keys on it move. */
    move: (title: string) => string
    /** Said to a screen reader once a row is moved from the keyboard, with its new place counted from 1. */
    moved: (title: string, place: number, count: number) => string
}

export const REORDERABLE_TRACK_LIST_WORDS: Pick<ReorderableTrackListWords, 'move' | 'moved'> = {
    move: (title) => `Move ${title}`,
    moved: (title, place, count) => `${title} moved to ${writeCount(place)} of ${writeCount(count)}`,
}

/** Where a catalog holds a reorderable track list's own words, and the arguments its phrases name. */
export const REORDERABLE_TRACK_LIST_PART: WordsPart<Pick<ReorderableTrackListWords, 'move' | 'moved'>> = {
    id: 'reorderableTrackList',
    words: REORDERABLE_TRACK_LIST_WORDS,
    args: { move: 'title', moved: 'title place count' },
}

/** A reorderable track list's phrases as ICU messages in English, for the catalog. */
export const REORDERABLE_TRACK_LIST_MESSAGES: WordMessages<Pick<ReorderableTrackListWords, 'move' | 'moved'>> = {
    move: 'Move {title}',
    moved: '{title} moved to {place} of {count}',
}

export interface ReorderableTrackListProps extends Omit<TrackListProps, 'words' | 'row' | 'windowed'> {
    /** Moves the track at `from` to `to`, both indexes into `tracks`; the list draws the order it is given. */
    onMove: (from: number, to: number) => void
    /** What a target outside the list takes its rows as, such as a playlist in the rail; each carries its `Track`. Only the list takes them without it. */
    kind?: string
    words?: Partial<ReorderableTrackListWords>
}

const titleOf = (track: Track | undefined) => (typeof track?.title === 'string' ? track.title : '')

/** A row of the list as an item of its sortable group. */
function SortableRow({ track, index: _index, ...props }: TrackRowProps) {
    return <SortableItem {...props} as="li" id={track.id} />
}

/**
 * A track list the listener puts in their own order, such as a playlist or what a queue plays
 * next: a `TrackList` whose rows each end in a grip after their own `actions`. Dragging the grip
 * (a finger holds it a moment first) lifts a copy of the row and moves the rest aside to show
 * where it lands, scrolling the box around it at its edges; letting go calls `onMove(from, to)`,
 * and Escape puts it back. With the grip focused, the up and down arrows move the row one place,
 * the focus following it, and a screen reader is told its new place; Space or Enter picks it up to
 * carry it further. It draws no disc heads, an order of one's own having no discs, and draws every
 * row however long the list, so each can be carried past the rest.
 */
export function ReorderableTrackList({ tracks, onMove, kind, actions, words: given, ...list }: ReorderableTrackListProps) {
    const words = useWords(REORDERABLE_TRACK_LIST_PART, given)
    const byId = new Map(tracks.map((track) => [track.id, track]))
    const flat = tracks.map((track) => (track.disc === undefined ? track : { ...track, disc: undefined }))
    return (
        <SortableGroup
            ids={tracks.map((track) => track.id)}
            onMove={onMove}
            kind={kind}
            label={(id) => titleOf(byId.get(id))}
            value={(id) => byId.get(id)}
            preview={(id) => {
                const track = byId.get(id)
                return track === undefined ? null : (
                    <TrackList
                        {...list}
                        tracks={[{ ...track, disc: undefined }]}
                        follow={false}
                        variant="plain"
                        words={given}
                        actions={() => <span aria-hidden className="size-7" />}
                    />
                )
            }}
            words={{ move: words.move, moved: words.moved }}
        >
            <TrackList
                {...list}
                tracks={flat}
                words={given}
                windowed={false}
                row={SortableRow}
                actions={(track) => (
                    <>
                        {actions?.(track)}
                        <SortableGrip />
                    </>
                )}
            />
        </SortableGroup>
    )
}
