import { useLayoutEffect, useState, type RefObject } from 'react'

import { cn } from '../lib/cn'
import type { IssueEntry } from './IssueMark'

/** Where each issue's field sits down its scroll area, from 0 at the top to 1 at the bottom. */
interface Place {
    entry: IssueEntry
    at: number
}

/** Each entry's field placed down the scroller's full height, or none when it does not scroll. */
function measure(scroller: HTMLElement, list: readonly IssueEntry[]): Place[] {
    const height = scroller.scrollHeight
    if (height <= scroller.clientHeight + 1) return []
    const top = scroller.getBoundingClientRect().top - scroller.scrollTop
    const places: Place[] = []
    for (const entry of list) {
        if (entry.target === undefined) continue
        const element = document.getElementById(entry.target)
        if (element === null) continue
        const box = element.getBoundingClientRect()
        places.push({ entry, at: Math.min(1, Math.max(0, (box.top - top + box.height / 2) / height)) })
    }
    return places
}

const TONE = { critical: 'bg-critical', warning: 'bg-warning' } as const

/**
 * A strip beside a long form's scroll area with a mark for each issue at its field's place down
 * the whole form, so a glance shows where the issues are and pressing one goes there. It reads the
 * entries' `target` ids (`SchemaForm`'s list carries them) and draws nothing while the area does
 * not scroll. Put it beside the scrolling element, in a row that gives it the scroller's height.
 */
export function IssueMarks({
    scroller,
    list,
    label = 'Issues in this form',
    className,
}: {
    /** The element that scrolls the form. */
    scroller: RefObject<HTMLElement | null>
    list: readonly IssueEntry[]
    /** The strip's accessible name. */
    label?: string
    className?: string
}) {
    const [places, setPlaces] = useState<Place[]>([])
    useLayoutEffect(() => {
        const element = scroller.current
        if (element === null) return
        const update = () => setPlaces(measure(element, list))
        update()
        const observer = new ResizeObserver(update)
        observer.observe(element)
        for (const child of Array.from(element.children)) observer.observe(child)
        return () => observer.disconnect()
    }, [scroller, list])
    if (places.length === 0) return null
    return (
        <div
            role="group"
            aria-label={label}
            data-slot="issue-marks"
            className={cn('relative w-3 shrink-0 border-l border-border bg-muted/40', className)}
        >
            {places.map(({ entry, at }, index) => (
                <button
                    key={index}
                    type="button"
                    aria-label={`${entry.label}: ${entry.issue.text}`}
                    title={`${entry.label}: ${entry.issue.text}`}
                    onClick={entry.onGo}
                    className={cn(
                        'absolute inset-x-0.5 h-2 -translate-y-1/2 rounded-sm outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring/60',
                        TONE[entry.issue.tone],
                    )}
                    style={{ top: `${String(at * 100)}%` }}
                />
            ))}
        </div>
    )
}
