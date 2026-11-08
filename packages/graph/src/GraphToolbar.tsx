import { CircleAlert, CircleCheck, Maximize, Minus, Network, Plus, Redo2, Undo2 } from 'lucide-react'
import { Children, type ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useGraphControls } from './context'

/** The words a graph toolbar says. */
export interface GraphToolbarWords {
    /** The toolbar's accessible name. */
    label: string
    undo: string
    redo: string
    /** Lays the graph out again. */
    layout: string
    zoomIn: string
    zoomOut: string
    fit: string
    /** How many things have a problem. */
    issues: (count: number) => string
    /** What it says when nothing has one. */
    clean: string
}

/** The keys an undo and a redo take on this machine. */
function shortcut(redo: boolean): string {
    const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    if (mac) return redo ? 'Shift+Cmd+Z' : 'Cmd+Z'
    return redo ? 'Shift+Ctrl+Z' : 'Ctrl+Z'
}

export const GRAPH_TOOLBAR_WORDS: GraphToolbarWords = {
    label: 'Graph tools',
    undo: 'Undo',
    redo: 'Redo',
    layout: 'Tidy up the layout',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit the graph',
    issues: (count) => `${String(count)} to fix`,
    clean: 'No problems',
}

const BUTTON =
    'flex size-7 shrink-0 items-center justify-center rounded-chip text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5'

export interface GraphToolbarButtonProps {
    label: string
    onClick?: () => void
    disabled?: boolean
    children: ReactNode
}

/** A button of the app's in a graph toolbar, drawn as the toolbar's own: a glyph, named by `label`. */
export function GraphToolbarButton({ label, onClick, disabled, children }: GraphToolbarButtonProps) {
    return (
        <button type="button" className={BUTTON} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
            {children}
        </button>
    )
}

function Divider() {
    return <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
}

export interface GraphToolbarProps {
    onUndo?: () => void
    onRedo?: () => void
    canUndo?: boolean
    canRedo?: boolean
    /** Lays the graph out again; no button without it. */
    onLayout?: () => void
    /** How many things have a problem; the count is not shown without it. */
    issues?: number
    /** The count was pressed, to go to the first problem. */
    onIssues?: () => void
    /** The app's own buttons, after the tools. */
    children?: ReactNode
    words?: Partial<GraphToolbarWords>
    className?: string
}

/**
 * The tools of a graph editor in one bar: undo and redo, a tidy layout, the view's zoom and fit,
 * and how many steps have a problem, with the app's own buttons after them. Each group shows only
 * when it is given something to do; zoom and fit show when the bar is drawn over a canvas, as its
 * `toolbar`, and the canvas's own zoom buttons can then be hidden with `controls={false}`.
 */
export function GraphToolbar({
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    onLayout,
    issues,
    onIssues,
    children,
    words: given,
    className,
}: GraphToolbarProps) {
    const words = { ...GRAPH_TOOLBAR_WORDS, ...given }
    const controls = useGraphControls()
    const history = onUndo !== undefined || onRedo !== undefined
    const view = controls !== null
    const groups: ReactNode[] = []
    if (history)
        groups.push(
            <span key="history" className="flex items-center">
                <button
                    type="button"
                    className={BUTTON}
                    aria-label={words.undo}
                    title={`${words.undo} (${shortcut(false)})`}
                    disabled={!canUndo}
                    onClick={onUndo}
                >
                    <Undo2 aria-hidden />
                </button>
                <button
                    type="button"
                    className={BUTTON}
                    aria-label={words.redo}
                    title={`${words.redo} (${shortcut(true)})`}
                    disabled={!canRedo}
                    onClick={onRedo}
                >
                    <Redo2 aria-hidden />
                </button>
            </span>,
        )
    if (onLayout !== undefined || view)
        groups.push(
            <span key="view" className="flex items-center">
                {onLayout !== undefined && (
                    <button
                        type="button"
                        className={BUTTON}
                        aria-label={words.layout}
                        title={words.layout}
                        disabled={controls?.empty === true}
                        onClick={onLayout}
                    >
                        <Network aria-hidden />
                    </button>
                )}
                {view && (
                    <>
                        <button
                            type="button"
                            className={BUTTON}
                            aria-label={words.zoomOut}
                            title={words.zoomOut}
                            disabled={controls.empty}
                            onClick={controls.zoomOut}
                        >
                            <Minus aria-hidden />
                        </button>
                        <button
                            type="button"
                            className={BUTTON}
                            aria-label={words.zoomIn}
                            title={words.zoomIn}
                            disabled={controls.empty}
                            onClick={controls.zoomIn}
                        >
                            <Plus aria-hidden />
                        </button>
                        <button
                            type="button"
                            className={BUTTON}
                            aria-label={words.fit}
                            title={words.fit}
                            disabled={controls.empty}
                            onClick={controls.fit}
                        >
                            <Maximize aria-hidden />
                        </button>
                    </>
                )}
            </span>,
        )
    if (issues !== undefined)
        groups.push(
            issues > 0 ? (
                <button
                    key="issues"
                    type="button"
                    onClick={onIssues}
                    data-slot="graph-issues"
                    className="flex h-7 shrink-0 items-center gap-1.5 rounded-chip px-1.5 text-xs font-medium text-critical-ink outline-none hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                    <CircleAlert className="size-3.5" aria-hidden />
                    {words.issues(issues)}
                </button>
            ) : (
                <span
                    key="issues"
                    data-slot="graph-issues"
                    className="flex h-7 shrink-0 items-center gap-1.5 px-1.5 text-xs text-muted-foreground"
                >
                    <CircleCheck className="size-3.5" aria-hidden />
                    {words.clean}
                </span>
            ),
        )
    if (Children.toArray(children).length > 0)
        groups.push(
            <span key="app" className="flex items-center gap-1">
                {children}
            </span>,
        )
    return (
        <div
            role="toolbar"
            aria-label={words.label}
            data-slot="graph-toolbar"
            className={cn(
                'flex max-w-full items-center gap-0.5 overflow-x-auto rounded-control border border-border bg-card p-0.5 shadow-node',
                className,
            )}
        >
            {groups.flatMap((group, index) => (index === 0 ? [group] : [<Divider key={`divider-${String(index)}`} />, group]))}
        </div>
    )
}
