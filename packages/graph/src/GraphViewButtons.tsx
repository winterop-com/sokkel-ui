import { Scan, ZoomIn, ZoomOut } from 'lucide-react'
import { Children, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useGraphControls, type GraphControls } from './context'

/** The words the view's buttons say. */
export interface GraphViewWords {
    zoomIn: string
    zoomOut: string
    fit: string
    /** What the zoom-in button's tooltip says in place of its name, such as how else the canvas zooms. */
    zoomInHint?: string
    /** What the zoom-out button's tooltip says in place of its name. */
    zoomOutHint?: string
    /** What the fit button's tooltip says in place of its name. */
    fitHint?: string
}

export const GRAPH_VIEW_WORDS: GraphViewWords = {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the graph',
}

const BUTTON =
    'flex size-7 shrink-0 items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5'

export interface GraphControlButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'title'> {
    /** What the button does: its accessible name, and its tooltip without `tooltip`. */
    label: string
    /** What the tooltip says in place of the label, where the short name needs more said. */
    tooltip?: ReactNode
    /** Which side the tooltip opens on; above by default. */
    side?: 'top' | 'bottom' | 'left' | 'right'
    children: ReactNode
}

/**
 * A button of the app's in the view's cluster, drawn flush as the zoom buttons are: a glyph, named by
 * `label`, with no corners of its own, and a tooltip saying the label, or `tooltip` in its place. It
 * takes a ref and any button attribute, so it can be a menu's trigger. Hand it to a canvas's
 * `extraControls` or to `GraphViewButtons` as a child.
 */
export function GraphControlButton({ label, tooltip, side = 'top', className, children, ...rest }: GraphControlButtonProps) {
    const said = tooltip === undefined || tooltip === '' ? label : tooltip
    return (
        <Tooltip>
            <TooltipTrigger render={<button type="button" {...rest} className={cn(BUTTON, className)} aria-label={label} />}>
                {children}
            </TooltipTrigger>
            <TooltipContent side={side}>{said}</TooltipContent>
        </Tooltip>
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
 * from the controls `onControls` hands it. Each button's tooltip says its name, or its hint from
 * `words` (`zoomInHint`, `zoomOutHint`, `fitHint`) where one is given; a canvas hands its own
 * cluster the same words.
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
    // Beside a column, as in a canvas's corner, the tooltips open to the left, clear of the buttons below.
    const side = orientation === 'column' ? 'left' : 'top'
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
                    <GraphControlButton
                        label={words.zoomIn}
                        tooltip={words.zoomInHint}
                        side={side}
                        disabled={idle}
                        onClick={controls?.zoomIn}
                    >
                        <ZoomIn aria-hidden />
                    </GraphControlButton>
                    <GraphControlButton
                        label={words.zoomOut}
                        tooltip={words.zoomOutHint}
                        side={side}
                        disabled={idle}
                        onClick={controls?.zoomOut}
                    >
                        <ZoomOut aria-hidden />
                    </GraphControlButton>
                    <GraphControlButton label={words.fit} tooltip={words.fitHint} side={side} disabled={idle} onClick={controls?.fit}>
                        <Scan aria-hidden />
                    </GraphControlButton>
                </>
            )}
            {children}
        </div>
    )
}
