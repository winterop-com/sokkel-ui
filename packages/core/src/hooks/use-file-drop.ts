import { useRef, useState, type DragEvent } from 'react'

/** Whether a drag carries files from the desktop, rather than text or an element of the page. */
export function carriesFiles(event: DragEvent): boolean {
    return [...event.dataTransfer.types].includes('Files')
}

/** The handlers an element that takes dropped files spreads on itself. */
export interface FileDropHandlers {
    onDragEnter: (event: DragEvent<HTMLElement>) => void
    onDragOver: (event: DragEvent<HTMLElement>) => void
    onDragLeave: (event: DragEvent<HTMLElement>) => void
    onDrop: (event: DragEvent<HTMLElement>) => void
}

/**
 * Files dragged onto an element from the desktop: whether they are over it, held while the pointer
 * crosses its children by keeping the elements entered and not yet left, and the drop handed to
 * `onFiles`. An element entered that is gone from the page, such as a child the drop's own look
 * replaced, counts as left, as no leave comes from it. Off (`enabled` false) it takes nothing, so
 * the browser does what it would.
 */
export function useFileDrop(onFiles: (files: File[]) => void, enabled = true): { over: boolean; handlers: FileDropHandlers } {
    const [over, setOver] = useState(false)
    const entered = useRef(new Set<EventTarget>())
    const takes = (event: DragEvent) => enabled && carriesFiles(event)
    return {
        over: enabled && over,
        handlers: {
            onDragEnter: (event) => {
                if (!takes(event)) return
                event.preventDefault()
                entered.current.add(event.target)
                setOver(true)
            },
            onDragOver: (event) => {
                if (!takes(event)) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
            },
            onDragLeave: (event) => {
                if (!takes(event)) return
                const within = event.currentTarget
                entered.current.delete(event.target)
                for (const element of entered.current) {
                    if (!(element instanceof Node) || !element.isConnected || !within.contains(element)) entered.current.delete(element)
                }
                if (entered.current.size === 0) setOver(false)
            },
            onDrop: (event) => {
                if (!takes(event)) return
                event.preventDefault()
                entered.current.clear()
                setOver(false)
                const files = [...event.dataTransfer.files]
                if (files.length > 0) onFiles(files)
            },
        },
    }
}
