import { createContext, useContext, useId, useMemo } from 'react'

import { DragDrop, DragGrip, useDragItem, type DragData, type DragHandleProps } from '@winterop-com/sokkel-ui/DragDrop'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { TrackList, type Track, type TrackListProps, type TrackListWords, type TrackRowProps } from './TrackList'

export type { Track } from './TrackList'

/** The words a draggable list says beyond a track list's, each with an English default. */
export interface DraggableTrackListWords extends TrackListWords {
    /** The grip's name: what a drag from it, or from the keyboard, carries. */
    drag: (title: string) => string
}

const WORDS: Pick<DraggableTrackListWords, 'drag'> = { drag: (title) => `Drag ${title}` }

export interface DraggableTrackListProps extends Omit<TrackListProps, 'words' | 'row'> {
    /**
     * What a target elsewhere on the page takes the rows as, such as a playlist in the rail that
     * `accepts` this kind; each row's drag carries its `Track` as its value.
     */
    kind: string
    words?: Partial<DraggableTrackListWords>
}

interface RowScope {
    /** The list's own mark, so the same track in two lists on a page drags as two things. */
    list: string
    kind: string
    words: Pick<DraggableTrackListWords, 'drag'>
}

const ScopeContext = createContext<RowScope | null>(null)
const HandleContext = createContext<DragHandleProps | null>(null)

const titleOf = (track: Track | undefined) => (typeof track?.title === 'string' ? track.title : '')

/** A row that drags as a whole by a mouse or a finger, its grip carrying it from the keyboard. */
function DragRow({ track, index: _index, className, ...props }: TrackRowProps) {
    const scope = useContext(ScopeContext)
    const data = useMemo<DragData>(() => ({ kind: scope?.kind ?? '', label: titleOf(track), value: track, compact: true }), [scope, track])
    const { ref, handle, dragging } = useDragItem({ id: `${scope?.list ?? ''}\u0000${track.id}`, data })
    return (
        <HandleContext.Provider value={handle}>
            <li
                {...props}
                ref={(element) => {
                    ref(element)
                    const given = props.ref
                    if (typeof given === 'function') given(element)
                    else if (given != null) given.current = element
                }}
                onPointerDown={handle.onPointerDown}
                onTouchStart={handle.onTouchStart}
                className={cn(className, dragging && 'opacity-40')}
            />
        </HandleContext.Provider>
    )
}

function RowGrip({ title }: { title: string }) {
    const handle = useContext(HandleContext)
    const words = useContext(ScopeContext)?.words ?? WORDS
    if (handle === null) return null
    // A narrow list folds the grip away for the title's room; a phone's targets wait in a drawer, and a finger drags the row itself.
    return <DragGrip handle={handle} label={words.drag(title)} className="@max-md:hidden" />
}

/**
 * A track list whose rows are dragged elsewhere on the page, such as a song onto a playlist in the
 * rail: a `TrackList` whose rows drag as a whole once a mouse moves a few pixels or a finger holds
 * still a moment, the title on a small card following the pointer, and whose grip at each row's end picks
 * the row up from the keyboard, the arrows carrying it to a target and Space or Enter dropping it.
 * A press still plays the row. Each row's drag is of `kind`, carrying its `Track`; the target is
 * the app's, inside the same `DragDrop` the app draws around the page. The list keeps its own order.
 */
export function DraggableTrackList({ kind, actions, words: given, ...list }: DraggableTrackListProps) {
    const words = { ...WORDS, ...given }
    const mark = useId()
    const scope: RowScope = {
        list: mark,
        kind,
        words,
    }
    return (
        <DragDrop>
            <ScopeContext.Provider value={scope}>
                <TrackList
                    {...list}
                    words={given}
                    row={DragRow}
                    actions={(track) => (
                        <>
                            {actions?.(track)}
                            <RowGrip title={titleOf(track)} />
                        </>
                    )}
                />
            </ScopeContext.Provider>
        </DragDrop>
    )
}
