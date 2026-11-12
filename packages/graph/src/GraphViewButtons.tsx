import { Scan, ZoomIn, ZoomOut } from 'lucide-react'
import { Children, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useGraphControls, type GraphControls } from './context'

/** The words the view's buttons say. */
export interface GraphViewWords {
    zoomIn: string
    zoomOut: string
    fit: string
}

export const GRAPH_VIEW_WORDS: GraphViewWords = {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the graph',
}

const BUTTON =
    'flex size-7 shrink-0 items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5'

export interface GraphControlButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
    label: string
    children: ReactNode
}

/**
 * A button of the app's in the view's cluster, drawn flush as the zoom buttons are: a glyph, named by
 * `label`, with no corners of its own. It takes a ref and any button attribute, so it can be a menu's
 * trigger. Hand it to a canvas's `extraControls` or to `GraphViewButtons` as a child.
 */
export function GraphControlButton({ label, className, children, ...rest }: GraphControlButtonProps) {
    return (
        <button type="button" {...rest} className={cn(BUTTON, className)} aria-label={label} title={rest.title ?? label}>
            {children}
        </button>
    )
}

export interface GraphViewButtonsProps {
    /**
     * What the buttons move: the `GraphControls` a canvas hands `onControls`. Left out, the canvas
     * this is drawn over; with neither, or on an empty canvas, the zoom buttons are disabled.
     */
    controls?: GraphControls | null
    /** `column` stands the buttons one over another, as in a canvas's corner; `row` by default. */
    orientation?: 'row' | 'column'
    /** `hide` leaves the zoom buttons out while the canvas has nothing on it, rather than disabling them. */
    whenEmpty?: 'disable' | 'hide'
    /** The app's own buttons after the zoom buttons, such as `GraphControlButton`s. */
    children?: ReactNode
    words?: Partial<GraphViewWords>
    className?: string
}

/**
 * Zoom in, zoom out and fit in one flush cluster, with the app's own buttons after them: the
 * cluster a canvas draws in its corner, for an app to draw in a panel's head or a window's corner
 * from the controls `onControls` hands it.
 */
export function GraphViewButtons({
    controls: given,
    orientation = 'row',
    whenEmpty = 'disable',
    children,
    words: told,
    className,
}: GraphViewButtonsProps) {
    const words = { ...GRAPH_VIEW_WORDS, ...told }
    const near = useGraphControls()
    const controls = given === undefined ? near : given
    const idle = controls === null || controls.empty
    const zoom = !(idle && whenEmpty === 'hide')
    const extra = Children.toArray(children).length > 0
    if (!zoom && !extra) return null
    return (
        <div
            role="group"
            data-slot="graph-view-buttons"
            className={cn(
                'flex w-max overflow-hidden rounded-control border border-border bg-card shadow-node',
                orientation === 'column' ? 'flex-col divide-y divide-border' : 'divide-x divide-border',
                className,
            )}
        >
            {zoom && (
                <>
                    <GraphControlButton label={words.zoomIn} disabled={idle} onClick={controls?.zoomIn}>
                        <ZoomIn aria-hidden />
                    </GraphControlButton>
                    <GraphControlButton label={words.zoomOut} disabled={idle} onClick={controls?.zoomOut}>
                        <ZoomOut aria-hidden />
                    </GraphControlButton>
                    <GraphControlButton label={words.fit} disabled={idle} onClick={controls?.fit}>
                        <Scan aria-hidden />
                    </GraphControlButton>
                </>
            )}
            {children}
        </div>
    )
}
