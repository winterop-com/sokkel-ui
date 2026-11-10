import { Maximize2, X } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { enterFullscreen, exitFullscreen } from '../lib/fullscreen'
import { IconButton } from './IconButton'
import { Surface } from './Section'
import { SplitPane } from './SplitPane'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

export interface WindowedPaneWords {
    /** The expand button's label. */
    expand: string
    /** The window's close button's label. */
    close: string
    /** Said in the pane's place while its content is in the window. */
    away: string
}

export const WINDOWED_PANE_WORDS: WindowedPaneWords = {
    expand: 'Expand',
    close: 'Close',
    away: 'Shown in a window.',
}

interface Windowed {
    /** Whether the content is drawn in the window now. */
    windowed: boolean
    setOpen: (open: boolean) => void
    words: WindowedPaneWords
}

const WindowedContext = createContext<Windowed | null>(null)

/** Whether the content around is drawn in a `WindowedPane`'s window, and the way to open or close it. */
export function useWindowedPane(): Windowed | null {
    return useContext(WindowedContext)
}

export interface WindowedPaneButtonProps {
    className?: string
}

/**
 * The expand button of the `WindowedPane` around it, for a pane that sets it in a toolbar of its
 * own (with `button="none"` on the pane). Draws nothing outside a pane or inside the window.
 */
export function WindowedPaneButton({ className }: WindowedPaneButtonProps) {
    const pane = useWindowedPane()
    if (pane === null || pane.windowed) return null
    return (
        <IconButton label={pane.words.expand} size="icon-xs" onClick={() => pane.setOpen(true)} className={className}>
            <Maximize2 />
        </IconButton>
    )
}

/** Where a `WindowedPane`'s content is drawn: in the pane in its place, or in the window. */
export type WindowedPaneWhere = 'pane' | 'window'

export interface WindowedPaneProps {
    /** The window's title, and the name of what the pane holds. */
    title: ReactNode
    /** The content, or a function of where it is drawn for content that differs between the pane and the window. */
    children: ReactNode | ((where: WindowedPaneWhere) => ReactNode)
    /**
     * A part drawn beside the content in the window only, such as a reference beside an editor: the
     * window splits, resizable, and stacks it under the content when the window is narrow.
     */
    aside?: ReactNode
    /**
     * The pane keeps its content while the window is open, and the window draws a copy of its own,
     * so the pane stays in place showing the same thing; editors over one `SharedDocument` then
     * edit it live in both. By default the content moves into the window and back.
     */
    keepPane?: boolean
    /** `inset` draws the pane inset on the page's ground with a hairline edge, as `Surface`'s `inset` tone does. */
    frame?: 'none' | 'inset'
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /**
     * `corner`: the pane draws the expand button over its top right corner; `sticky`: the same, held
     * at the top of the pane's visible part while a long pane scrolls; `none`: the content does.
     */
    button?: 'corner' | 'sticky' | 'none'
    /**
     * Opening the window also takes the screen: the page goes full screen through `lib/fullscreen`
     * (the browser's, or a desktop shell's own once the app hands it over), and leaves it as the
     * window closes.
     */
    fullscreen?: boolean
    className?: string
    words?: Partial<WindowedPaneWords>
}

/**
 * Any pane, with a way to open the same content near full screen: an expand button at its top
 * right corner (shown while the pointer is over it, always on touch) opens a window with a margin
 * all round, a title and a close button; Escape closes it too. It opens with its content focused,
 * not the close button, so one Escape closes it however it was opened. While the content is in the
 * window, the pane keeps its height in place and says so, and the content comes back when the
 * window closes. The content is drawn once, in one place or the other, so it fills the room it is
 * given; `keepPane` draws it in both instead, the pane keeping its own while the window shows a copy.
 * `aside` sets a part beside the content in the window only.
 *
 * `button="none"` leaves the button to the content, which places `WindowedPaneButton` in its own
 * toolbar; `useWindowedPane` tells it whether it is in the window. Open or closed is held by the
 * pane unless `open` and `onOpenChange` hold it. `fullscreen` puts the page in full screen while
 * the window is open, so the window fills the screen less its margin. `button="sticky"` keeps the
 * corner button reachable down a long pane, and `frame="inset"` sets the pane inset on the page.
 */
export function WindowedPane({
    title,
    children,
    aside,
    keepPane = false,
    frame = 'none',
    open: heldOpen,
    defaultOpen = false,
    onOpenChange,
    button = 'corner',
    fullscreen = false,
    className,
    words: given,
}: WindowedPaneProps) {
    const words = { ...WINDOWED_PANE_WORDS, ...given }
    const [ownOpen, setOwnOpen] = useState(defaultOpen)
    const open = heldOpen ?? ownOpen
    // The whole page takes the screen, so whatever the window's content opens over it still shows.
    useEffect(() => {
        if (!open || !fullscreen) return
        const page = document.documentElement
        enterFullscreen(page)
        return () => exitFullscreen(page)
    }, [open, fullscreen])
    const place = useRef<HTMLDivElement>(null)
    const body = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState<number | undefined>(undefined)
    const setOpen = (next: boolean) => {
        if (next && place.current !== null) {
            // The content's own height, inside whatever padding the pane was given.
            const style = getComputedStyle(place.current)
            setHeight(place.current.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom))
        }
        if (heldOpen === undefined) setOwnOpen(next)
        onOpenChange?.(next)
    }
    const content = (where: WindowedPaneWhere) => (typeof children === 'function' ? children(where) : children)
    const inPane = !open || keepPane ? content('pane') : null
    const corner = (
        <span className="pointer-events-auto absolute top-2 right-2 z-10 rounded-md bg-background opacity-0 ring-1 ring-foreground/10 transition-opacity group-focus-within/windowed:opacity-100 group-hover/windowed:opacity-100 pointer-coarse:opacity-100">
            <WindowedPaneButton />
        </span>
    )
    const windowBody = (
        <div ref={body} tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-auto p-4 outline-none">
            {open && content('window')}
        </div>
    )
    return (
        <>
            <WindowedContext.Provider value={{ windowed: false, setOpen, words }}>
                <div ref={place} data-slot="windowed-pane" className={cn('group/windowed relative min-h-0 min-w-0', className)}>
                    {/* A row of no height that sticks to the top of what scrolls the pane, the button hanging from it. */}
                    {button === 'sticky' && (!open || keepPane) && (
                        <div data-slot="windowed-pane-sticky" className="pointer-events-none sticky top-0 z-10 h-0">
                            {corner}
                        </div>
                    )}
                    {inPane === null ? (
                        <div
                            className="flex h-full min-h-24 items-center justify-center rounded-surface border border-dashed border-border px-4 text-center text-sm text-muted-foreground"
                            style={height === undefined ? undefined : { height }}
                        >
                            {words.away}
                        </div>
                    ) : frame === 'inset' ? (
                        <Surface tone="inset" className="h-full min-h-0 min-w-0">
                            {inPane}
                        </Surface>
                    ) : (
                        inPane
                    )}
                    {button === 'corner' && (!open || keepPane) && corner}
                </div>
            </WindowedContext.Provider>
            <Dialog open={open} onOpenChange={setOpen}>
                {/* The window opens on its content, not its close button, whose tooltip would take the first Escape. */}
                <DialogContent
                    showCloseButton={false}
                    initialFocus={body}
                    className="inset-3 flex w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 p-0 sm:inset-6 sm:max-w-none"
                >
                    <div className="flex min-h-(--density-panel-head) shrink-0 items-center gap-2 border-b border-border px-(--density-panel-pad)">
                        <DialogTitle className="min-w-0 flex-1 truncate text-section-title">{title}</DialogTitle>
                        <IconButton label={words.close} size="icon-sm" onClick={() => setOpen(false)}>
                            <X />
                        </IconButton>
                    </div>
                    <WindowedContext.Provider value={{ windowed: true, setOpen, words }}>
                        {aside === undefined ? (
                            windowBody
                        ) : (
                            <SplitPane
                                defaultShare={0.7}
                                narrowBelow={720}
                                className="overflow-hidden rounded-b-[inherit]"
                                first={windowBody}
                                second={
                                    <aside data-slot="windowed-pane-aside" className="min-h-0 bg-panel-ground p-(--density-panel-pad)">
                                        {aside}
                                    </aside>
                                }
                            />
                        )}
                    </WindowedContext.Provider>
                </DialogContent>
            </Dialog>
        </>
    )
}
