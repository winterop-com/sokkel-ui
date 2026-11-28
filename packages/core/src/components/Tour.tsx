import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle } from './ui/popover'

/** One stop of a tour: the part of the page it points at, and what it says about it. */
export interface TourStep {
    /** The element pointed at, found by this selector when the step opens; without one, the step stands in the middle of the page. */
    target?: string
    title: string
    body: ReactNode
    /** The side of the target the step's card opens on. */
    side?: 'top' | 'bottom' | 'left' | 'right'
}

export interface TourWords {
    /** Where the tour is, by the step and how many there are. */
    progress: (step: number, steps: number) => string
    back: string
    next: string
    done: string
    skip: string
}

export const TOUR_WORDS: TourWords = {
    progress: (step, steps) => `${step.toLocaleString('en-US')} of ${steps.toLocaleString('en-US')}`,
    back: 'Back',
    next: 'Next',
    done: 'Done',
    skip: 'Skip tour',
}

/** Where a catalog holds a tour's words, and the arguments its phrases name. */
export const TOUR_PART: WordsPart<TourWords> = { id: 'tour', words: TOUR_WORDS, args: { progress: 'step steps' } }

/** A tour's phrases as ICU messages in English, for the catalog. */
export const TOUR_MESSAGES: WordMessages<TourWords> = {
    progress: '{step, number} of {steps, number}',
}

export interface TourProps {
    steps: readonly TourStep[]
    /** Whether the tour is showing. */
    open: boolean
    /** Called with false when the tour ends: done, skipped, or dismissed with Escape. */
    onOpenChange: (open: boolean) => void
    /** The step shown, from 0, held from outside with `onStepChange`. */
    step?: number
    onStepChange?: (step: number) => void
    words?: Partial<TourWords>
}

/** The target's box on the page, followed as the page scrolls or resizes. */
function useTargetBox(selector: string | undefined, open: boolean): { element: Element | null; box: DOMRect | null } {
    const [found, setFound] = useState<{ element: Element | null; box: DOMRect | null }>({ element: null, box: null })
    useEffect(() => {
        if (!open || selector === undefined) {
            setFound({ element: null, box: null })
            return
        }
        const element = document.querySelector(selector)
        const measure = () => setFound({ element, box: element?.getBoundingClientRect() ?? null })
        element?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        measure()
        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)
        return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('scroll', measure, true)
        }
    }, [selector, open])
    return found
}

/**
 * A guided tour of a page: one step at a time, each a card beside the part of the page it is about,
 * that part cut out of a dimmed page and ringed, the rest of the page held still under the dim.
 * The card says where the tour is, its title and its words, and moves back and on; the last step's
 * button ends it, as Skip tour and Escape do. A step with no target, or one whose target is not on
 * the page, stands in the middle. The app keeps whether the tour has been seen.
 */
export function Tour({ steps, open, onOpenChange, step, onStepChange, words: given }: TourProps) {
    const words = useWords(TOUR_PART, given)
    const [own, setOwn] = useState(0)
    const at = Math.min(Math.max(0, step ?? own), Math.max(0, steps.length - 1))
    const current = steps.at(at)
    const { element, box } = useTargetBox(current?.target, open)
    const last = at === steps.length - 1

    const go = (next: number) => {
        if (step === undefined) setOwn(next)
        onStepChange?.(next)
    }
    const end = () => {
        onOpenChange(false)
        if (step === undefined) setOwn(0)
    }

    if (!open || current === undefined) return null
    return (
        <>
            <div
                aria-hidden
                data-slot="tour-spotlight"
                className={cn(
                    'pointer-events-auto fixed z-dialog transition-all duration-base motion-reduce:transition-none',
                    box !== null && 'rounded-control outline-2 outline-primary',
                )}
                style={
                    box === null
                        ? { inset: 0, backgroundColor: 'var(--scrim)' }
                        : {
                              left: box.left - 4,
                              top: box.top - 4,
                              width: box.width + 8,
                              height: box.height + 8,
                              boxShadow: '0 0 0 9999px var(--scrim)',
                          }
                }
            />
            <Popover
                open
                modal={false}
                onOpenChange={(next) => {
                    if (!next) end()
                }}
            >
                <PopoverContent
                    anchor={element ?? undefined}
                    side={element === null ? 'bottom' : (current.side ?? 'bottom')}
                    sideOffset={12}
                    data-slot="tour-step"
                    className={element === null ? 'fixed top-1/2 left-1/2 w-80 -translate-1/2' : 'w-80'}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex items-baseline justify-between gap-2">
                            <PopoverTitle>{current.title}</PopoverTitle>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {words.progress(at + 1, steps.length)}
                            </span>
                        </div>
                        <PopoverDescription render={<div />}>{current.body}</PopoverDescription>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={end}>
                                {words.skip}
                            </Button>
                            <span className="flex-1" />
                            {at > 0 && (
                                <Button variant="outline" size="sm" onClick={() => go(at - 1)}>
                                    {words.back}
                                </Button>
                            )}
                            <Button size="sm" autoFocus onClick={last ? end : () => go(at + 1)}>
                                {last ? words.done : words.next}
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </>
    )
}
