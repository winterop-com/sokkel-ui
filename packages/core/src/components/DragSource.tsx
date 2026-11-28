import { GripVertical } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import type { DragData, DragHandleProps } from './DragDrop'
import { IconButton, type IconButtonProps } from './IconButton'

export type DragGripProps = Omit<IconButtonProps, 'children'> & {
    /** The handlers from `useDragItem`'s `handle`, or a sortable item's. */
    handle: DragHandleProps
}

/** The grip a thing is dragged by: a quiet button with the grip glyph, named for what it moves. */
export function DragGrip({ handle, className, ...props }: DragGripProps) {
    const { ref, ...rest } = handle
    return (
        <IconButton {...props} {...(rest as object)} ref={ref} className={cn('cursor-grab touch-none active:cursor-grabbing', className)}>
            <GripVertical aria-hidden />
        </IconButton>
    )
}

/** The group a thing that drags is, so its grip shows while the thing is pointed at or focused. */
export const DRAG_GROUP = 'group/drag'

/**
 * A grip shown only while its thing (a `DRAG_GROUP`) is pointed at or holds the focus; a finger,
 * which drags the thing itself, never sees it.
 */
export const GRIP_ON_HOVER =
    'pointer-coarse:hidden pointer-fine:opacity-0 pointer-fine:group-hover/drag:opacity-100 pointer-fine:group-focus-within/drag:opacity-100'

/** What a thing that drags spreads on itself, from `DragSource`. */
export interface DragSourceState {
    /** Goes on the element that drags; undefined while it does not drag. */
    ref?: (element: HTMLElement | null) => void
    /** The press and touch handlers to spread on what drags as a whole. */
    press: Pick<DragHandleProps, 'onPointerDown' | 'onTouchStart'>
    /** What `DragSourceGrip` spreads: the grip the keyboard picks the thing up by; undefined until the engine is here. */
    grip?: DragHandleProps
    /** Whether it is being dragged now, to fade it in its place. */
    dragging: boolean
    /** Whether it drags at all: given a `drag`, inside a `DragDrop`. */
    enabled: boolean
}

const IDLE: DragSourceState = { press: {}, dragging: false, enabled: false }

export interface DragSourceProps {
    /** What it carries, and what a target takes it as; without it nothing drags and the drag engine is never loaded. */
    drag?: DragData
    /** Draws the thing with what makes it drag. */
    children: (source: DragSourceState) => ReactNode
}

/**
 * A thing dragged to a target elsewhere on the page, such as a message onto a folder in the rail:
 * it drags as a whole once a mouse moves a few pixels or a finger holds still a moment, and from
 * the keyboard by its `DragSourceGrip`, the arrows carrying it to a target and Space or Enter
 * dropping it. It drags inside a `DragDrop` the app draws around it and the targets, such as
 * `RailDrops`; the engine is loaded the first time one is drawn with a `drag`, so a part that
 * drags nothing never carries it.
 */
export function DragSource({ drag, children }: DragSourceProps) {
    const id = useId()
    const layer = useDragSourceLayer(drag !== undefined)
    if (drag === undefined) return children(IDLE)
    if (layer === undefined) return children({ ...IDLE, enabled: true })
    return (
        <layer.DragSourceItem id={`drag-source:${id}`} drag={drag}>
            {children}
        </layer.DragSourceItem>
    )
}

export type DragSourceGripProps = Omit<DragGripProps, 'handle'> & {
    source: DragSourceState
}

/** The grip of a `DragSource`, drawn the same before the engine is here; nothing for one that does not drag. */
export function DragSourceGrip({ source, ...props }: DragSourceGripProps) {
    if (!source.enabled) return null
    return <DragGrip data-no-drag={source.grip === undefined || undefined} {...props} handle={source.grip ?? {}} />
}

type DragSourceLayer = typeof import('./drag-source-layer')
let dragSourceLayer: DragSourceLayer | undefined
let dragSourceLoad: Promise<DragSourceLayer> | undefined

/** The drag engine's side of a `DragSource`, fetched the first time one is drawn with a drag. */
function useDragSourceLayer(wanted: boolean): DragSourceLayer | undefined {
    const [loaded, setLoaded] = useState(dragSourceLayer)
    useEffect(() => {
        if (!wanted || loaded !== undefined) return
        let live = true
        dragSourceLoad ??= import('./drag-source-layer').then(
            (module) => (dragSourceLayer = module),
            (error: unknown) => {
                dragSourceLoad = undefined
                throw error
            },
        )
        dragSourceLoad.then(
            (module) => {
                if (live) setLoaded(module)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [wanted, loaded])
    return wanted ? (loaded ?? dragSourceLayer) : undefined
}
