import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

import { cn } from '../lib/cn'
import { formatTime, type TimeFormat } from '../lib/dates'
import { FRAME_BUTTON } from './entry'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** Whether a picker is open: on its own from `defaultOpen`, or held from outside by `open` with `onOpenChange`. */
export function useOpen(
    open: boolean | undefined,
    defaultOpen = false,
    onOpenChange?: (open: boolean) => void,
): [boolean, (open: boolean) => void] {
    const [own, setOwn] = useState(defaultOpen)
    return [
        open ?? own,
        (next) => {
            if (open === undefined) setOwn(next)
            onOpenChange?.(next)
        },
    ]
}

export interface PickerProps {
    /** What the button does, said by it and by the popup. */
    label: string
    icon: ReactNode
    /** The field's frame, which the popup opens under. */
    anchor: RefObject<HTMLDivElement | null>
    open: boolean
    onOpenChange: (open: boolean) => void
    className?: string
    children: ReactNode
}

/** A field's picker: a button at the end of its frame that opens a popup under the frame. */
export function Picker({ label, icon, anchor, open, onOpenChange, className, children }: PickerProps) {
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger render={<button type="button" aria-label={label} title={label} className={FRAME_BUTTON} />}>
                {icon}
            </PopoverTrigger>
            <PopoverContent
                anchor={anchor}
                align="start"
                initialFocus={false}
                aria-label={label}
                className={cn('w-auto gap-0 p-0', className)}
            >
                {children}
            </PopoverContent>
        </Popover>
    )
}

export interface TimeListProps {
    /** The chosen time, as `HH:mm` or `HH:mm:ss`. */
    value: string | null
    /** The times offered, as `HH:mm`. */
    times: readonly string[]
    format?: TimeFormat
    /** Times that are offered but cannot be picked, such as those before a bound on its day. */
    disabled?: (time: string) => boolean
    onPick: (time: string) => void
    label: string
    /** Focuses the chosen time when the list is drawn. */
    autoFocus?: boolean
    className?: string
}

/**
 * A list of times to pick one from, scrolled to the chosen time, or to the first after it when it
 * is not offered. Up and down move between the times, Home and End go to the first and the last.
 */
export function TimeList({ value, times, format, disabled, onPick, label, autoFocus = false, className }: TimeListProps) {
    const list = useRef<HTMLDivElement>(null)
    const chosen = value?.slice(0, 5) ?? null
    const open = (time: string) => disabled?.(time) !== true
    const reached =
        (chosen !== null && times.includes(chosen) && open(chosen) ? chosen : undefined) ??
        times.find((time) => open(time) && (chosen === null || time >= chosen)) ??
        times.find(open)
    useEffect(() => {
        const at = list.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')
        if (list.current === null || at === null || at === undefined) return
        list.current.scrollTop = at.offsetTop - (list.current.clientHeight - at.offsetHeight) / 2
        if (autoFocus) at.focus({ preventScroll: true })
        // The list scrolls to the chosen time when it opens, not each time it changes.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [])
    const move = (event: KeyboardEvent<HTMLDivElement>) => {
        const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: buttons.length - 1 }[event.key]
        if (to === undefined) return
        event.preventDefault()
        buttons[Math.max(0, Math.min(buttons.length - 1, to))]?.focus()
    }
    return (
        <div
            ref={list}
            role="listbox"
            aria-label={label}
            onKeyDown={move}
            className={cn('relative flex flex-col gap-0.5 overflow-y-auto p-1.5', className)}
        >
            {times.map((time) => (
                <button
                    key={time}
                    type="button"
                    role="option"
                    aria-selected={time === chosen}
                    tabIndex={time === reached ? 0 : -1}
                    disabled={!open(time)}
                    onClick={() => onPick(time)}
                    className={cn(
                        'flex h-8 w-full shrink-0 items-center rounded-md px-2 text-left text-sm tabular-nums outline-none hover:bg-hover focus-visible:outline-focus focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-disabled',
                        time === chosen && 'bg-secondary font-medium',
                    )}
                >
                    {formatTime(time, { ...format, seconds: false })}
                </button>
            ))}
        </div>
    )
}
