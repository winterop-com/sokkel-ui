import { useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
} from './ui/dropdown-menu'

/** A point on the screen, in client pixels, such as where a right click landed. */
export interface MenuPoint {
    x: number
    y: number
}

/** One thing a point menu offers, or a line between groups of them. */
export type PointMenuItem =
    | {
          id: string
          label: ReactNode
          icon?: ReactNode
          /** The key that does the same, drawn at the row's end, such as `shortcutLabel('d')`. */
          shortcut?: string
          /** For an action that destroys: drawn in the critical tone. */
          destructive?: boolean
          disabled?: boolean
          onSelect: () => void
      }
    | { id: string; separator: true }

export interface PointMenuProps {
    /** Where the menu opens, its top-left corner at the point unless the edge of the screen turns it; null keeps it shut. */
    at: MenuPoint | null
    /** Called when the menu closes: a row was chosen, Escape, or a press outside. */
    onClose: () => void
    items: readonly PointMenuItem[]
    /** A line over the rows in the code face, naming what the menu acts on, such as a step's code. */
    head?: ReactNode
    /** The menu's accessible name, where `head` does not give one. */
    label?: string
    className?: string
}

/** The edges of a box on the screen, as an element's `getBoundingClientRect` gives them. */
export interface MenuBox {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
    right: number
    bottom: number
}

/** A point on the screen as the box of no size a menu opens beside. */
export function pointAnchor(at: MenuPoint): { getBoundingClientRect: () => MenuBox } {
    const box = { x: at.x, y: at.y, width: 0, height: 0, top: at.y, left: at.x, right: at.x, bottom: at.y }
    return { getBoundingClientRect: () => box }
}

/**
 * Where a right click opens a menu: the pointer, or for one from the menu key, which has no point,
 * the bottom-left corner of the element it was given to.
 */
export function menuPoint(event: { clientX: number; clientY: number; currentTarget?: unknown }): MenuPoint {
    const target = event.currentTarget as { getBoundingClientRect?: () => MenuBox } | null | undefined
    if (event.clientX === 0 && event.clientY === 0 && typeof target?.getBoundingClientRect === 'function') {
        const box = target.getBoundingClientRect()
        return { x: box.left, y: box.bottom }
    }
    return { x: event.clientX, y: event.clientY }
}

/**
 * A menu opened at a point rather than from a trigger: where a right click landed on a canvas, a
 * row or a drawing. It takes its rows as data (a label, an icon, a shortcut, destructive, disabled,
 * and separators between groups) and an optional `head` in the code face naming what it acts on.
 * It is as wide as its longest row, keeps to the screen, and closes when a row is chosen, on
 * Escape or on a press outside, calling `onClose`; it holds its place while it fades.
 */
export function PointMenu({ at, onClose, items, head, label, className }: PointMenuProps) {
    // The point the menu last opened at, kept while it closes so it fades where it stood.
    const [kept, setKept] = useState<MenuPoint | null>(at)
    if (at !== null && at !== kept) setKept(at)
    const point = at ?? kept
    const rows = items.map((item) =>
        'separator' in item ? (
            <DropdownMenuSeparator key={item.id} />
        ) : (
            <DropdownMenuItem
                key={item.id}
                variant={item.destructive === true ? 'destructive' : 'default'}
                disabled={item.disabled}
                onClick={item.onSelect}
            >
                {item.icon}
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.shortcut !== undefined && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
            </DropdownMenuItem>
        ),
    )
    return (
        <DropdownMenu
            open={at !== null}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
        >
            <DropdownMenuContent
                anchor={point === null ? undefined : pointAnchor(point)}
                side="bottom"
                align="start"
                sideOffset={2}
                aria-label={label}
                className={cn('min-w-44', className)}
            >
                {head === undefined ? (
                    rows
                ) : (
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="truncate font-mono">{head}</DropdownMenuLabel>
                        {rows}
                    </DropdownMenuGroup>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
