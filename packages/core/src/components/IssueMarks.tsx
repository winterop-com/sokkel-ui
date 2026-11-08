import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

import { cn } from '../lib/cn'
import type { IssueEntry } from './IssueMark'

/** Where each issue's field sits down its scroll area, from 0 at the top to 1 at the bottom. */
interface Place {
    entry: IssueEntry
    at: number
}

/** Where the strip goes, relative to its anchor, and the issues on it. */
interface Layout {
    top: number
    left: number
    height: number
    places: Place[]
}

const WIDTH = 12

/** The nearest ancestor that scrolls up and down, or the page. */
function scrollerOf(element: HTMLElement): HTMLElement {
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node)
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) return node
    }
    return document.documentElement
}

/** The scroller's visible box in the viewport, and how far down it has scrolled. */
function frameOf(scroller: HTMLElement) {
    if (scroller === document.documentElement) {
        return { top: 0, left: 0, width: scroller.clientWidth, height: window.innerHeight, scrolled: window.scrollY }
    }
    const box = scroller.getBoundingClientRect()
    return {
        top: box.top + scroller.clientTop,
        left: box.left + scroller.clientLeft,
        width: scroller.clientWidth,
        height: scroller.clientHeight,
        scrolled: scroller.scrollTop,
    }
}

function measure(anchor: HTMLElement, scroller: HTMLElement, list: readonly IssueEntry[]): Layout | null {
    const total = scroller.scrollHeight
    const frame = frameOf(scroller)
    if (total <= frame.height + 1) return null
    const origin = frame.top - frame.scrolled
    const places: Place[] = []
    for (const entry of list) {
        if (entry.target === undefined) continue
        const element = document.getElementById(entry.target)
        if (element === null) continue
        const box = element.getBoundingClientRect()
        places.push({ entry, at: Math.min(1, Math.max(0, (box.top - origin + box.height / 2) / total)) })
    }
    if (places.length === 0) return null
    const here = anchor.getBoundingClientRect()
    return { top: frame.top - here.top, left: frame.left + frame.width - WIDTH - here.left, height: frame.height, places }
}

const TONE = { critical: 'bg-critical', warning: 'bg-warning' } as const

export interface IssueMarksProps {
    list: readonly IssueEntry[]
    /** The element that scrolls the form, when not the nearest one that does. */
    scroller?: RefObject<HTMLElement | null>
    /** The strip's accessible name. */
    label?: string
    className?: string
}

/**
 * A strip along the right edge of a long form's scroll area with a mark for each issue at its
 * field's place down the whole form, so a glance shows where the issues are and pressing one goes
 * there. Drop it anywhere inside the form: it finds the nearest area that scrolls (or the page),
 * holds itself to that area's visible edge, and draws nothing while the area does not scroll.
 * `SchemaForm` draws it on its own; a hand-built form gives each entry the `target` id of its
 * field's control.
 */
export function IssueMarks({ list, scroller: given, label = 'Issues in this form', className }: IssueMarksProps) {
    const anchor = useRef<HTMLDivElement>(null)
    const [layout, setLayout] = useState<Layout | null>(null)
    useLayoutEffect(() => {
        const here = anchor.current
        if (here === null || list.length === 0) {
            setLayout(null)
            return
        }
        const scroller = given?.current ?? scrollerOf(here)
        let frame = 0
        const update = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => setLayout(measure(here, scroller, list)))
        }
        setLayout(measure(here, scroller, list))
        const target: HTMLElement | Window = scroller === document.documentElement ? window : scroller
        target.addEventListener('scroll', update, { passive: true })
        window.addEventListener('resize', update)
        const observer = new ResizeObserver(update)
        observer.observe(scroller)
        for (const child of Array.from(scroller.children)) observer.observe(child)
        return () => {
            cancelAnimationFrame(frame)
            target.removeEventListener('scroll', update)
            window.removeEventListener('resize', update)
            observer.disconnect()
        }
    }, [given, list])
    return (
        <div ref={anchor} data-slot="issue-marks" className="relative h-0 w-full">
            {layout !== null && (
                <div
                    role="group"
                    aria-label={label}
                    className={cn('absolute z-10 w-3 border-l border-border bg-muted/60', className)}
                    style={{ top: layout.top, left: layout.left, height: layout.height }}
                >
                    {layout.places.map(({ entry, at }, index) => (
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
            )}
        </div>
    )
}
