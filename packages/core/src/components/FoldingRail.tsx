import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { usePanelSize } from '../hooks/use-panel-size'
import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { PaneHeader } from './PaneHeader'
import { ResizeHandle } from './ResizeHandle'

/** The words a folding rail says. */
export interface FoldingRailWords {
    /** The head's button that folds the rail to its strip. */
    fold: string
    /** The strip's name, said with the rail's title, for the press that unfolds it. */
    unfold: string
    resize: string
}

const WORDS: FoldingRailWords = { fold: 'Fold', unfold: 'Unfold', resize: 'Resize' }

export interface FoldingRailProps {
    /** The rail's name: its head's title, and written down the strip it folds to. */
    title: string
    /** What the rail holds, scrolling under its head. */
    rail: ReactNode
    /** The main content beside the rail, such as an editor. */
    children: ReactNode
    /** Which side of the main content the rail stands on; the end when not given. */
    side?: 'start' | 'end'
    /** Controls in the rail's head before its fold button. */
    actions?: ReactNode
    /** Whether the rail is folded to its strip, held from outside with `onFoldedChange`. */
    folded?: boolean
    /** Whether the rail starts folded, when `folded` is not given. */
    defaultFolded?: boolean
    onFoldedChange?: (folded: boolean) => void
    /** The rail's width in pixels, held from outside with `onSizeChange`. */
    size?: number
    onSizeChange?: (size: number) => void
    /** Whether the rail's inner edge drags to resize it. */
    resizable?: boolean
    minSize?: number
    maxSize?: number
    /** The width in pixels the rail starts at and a double click on its edge returns to. */
    defaultSize?: number
    className?: string
    words?: Partial<FoldingRailWords>
}

/**
 * Main content with a rail beside it that resizes and folds: runnable examples beside an editor, a
 * request builder's presets. The rail's head names it and holds its fold button; folded, it is a
 * narrow strip with its title written down it, and a press anywhere on the strip unfolds it. Its
 * inner edge drags to resize it and a double click puts it back.
 *
 * Left to itself the rail holds its own width from `defaultSize` and whether it is folded from
 * `defaultFolded`; `size` with `onSizeChange` and `folded` with `onFoldedChange` hold them from
 * outside, and `resizable={false}` keeps the width fixed. In a container too narrow for both the
 * rail goes under the main content at its full width, folding to a bar with its title.
 */
export function FoldingRail({
    title,
    rail,
    children,
    side = 'end',
    actions,
    folded,
    defaultFolded = false,
    onFoldedChange,
    size,
    onSizeChange,
    resizable = true,
    minSize = 220,
    maxSize = 480,
    defaultSize = 288,
    className,
    words: given,
}: FoldingRailProps) {
    const words = { ...WORDS, ...given }
    const [own, setOwn] = useState(defaultFolded)
    const shut = folded ?? own
    const fold = (next: boolean) => {
        if (folded === undefined) setOwn(next)
        onFoldedChange?.(next)
    }
    const panel = useRef<HTMLElement>(null)
    const held = usePanelSize({ size, onSizeChange, rest: defaultSize, fallback: defaultSize, min: minSize, max: maxSize })
    const end = side === 'end'
    const Fold = end ? PanelRightClose : PanelLeftClose
    const Unfold = end ? PanelRightOpen : PanelLeftOpen
    const aside = (
        <aside
            ref={panel}
            style={shut ? undefined : { width: held.style }}
            className={cn(
                'flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card @max-3xl:w-full!',
                shut && '@3xl:w-9',
            )}
        >
            {shut ? (
                <button
                    type="button"
                    aria-label={`${words.unfold} ${title}`}
                    aria-expanded={false}
                    onClick={() => fold(false)}
                    className="flex min-h-10 flex-1 items-center gap-2 px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-focus focus-visible:-outline-offset-focus focus-visible:outline-ring focus-visible:outline-solid @3xl:flex-col @3xl:px-0 @3xl:py-2"
                >
                    <Unfold className="size-4 shrink-0" aria-hidden />
                    <span className="truncate @3xl:[writing-mode:vertical-rl]">{title}</span>
                </button>
            ) : (
                <>
                    <PaneHeader
                        title={title}
                        variant="panel"
                        actions={
                            <>
                                {actions}
                                <IconButton label={words.fold} size="icon-xs" onClick={() => fold(true)}>
                                    <Fold />
                                </IconButton>
                            </>
                        }
                    />
                    <div className="min-h-0 flex-1 overflow-y-auto">{rail}</div>
                </>
            )}
        </aside>
    )
    const handle = !shut && resizable && held.changeable && (
        <ResizeHandle
            target={panel}
            size={held.size}
            onSize={held.set}
            onReset={held.reset}
            min={minSize}
            max={maxSize}
            grows={end ? -1 : 1}
            label={words.resize}
            className="@max-3xl:hidden"
        />
    )
    return (
        <div className={cn('@container flex min-w-0 flex-col', className)}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 @3xl:flex-row @3xl:items-stretch @3xl:gap-2">
                {!end && aside}
                {!end && handle}
                <div className="flex min-w-0 flex-1 flex-col">{children}</div>
                {end && handle}
                {end && aside}
            </div>
        </div>
    )
}
