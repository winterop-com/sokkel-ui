import { Play } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useClamped } from '@winterop-com/sokkel-ui/hooks/use-clamped'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Artwork } from './Artwork'

/** The words the part says, each with an English default. */
export interface UpNextWords {
    /** Said over the title. */
    heading: string
    playNow: string
    cancel: string
    /** Says how long until it plays by itself. */
    playingIn: (seconds: number) => string
}

export const UP_NEXT_WORDS: UpNextWords = {
    heading: 'Up next',
    playNow: 'Play now',
    cancel: 'Cancel',
    playingIn: (seconds) => `Playing in ${String(seconds)} s`,
}

/** A control drawn over the picture, light on dark in either scheme, as the player's own are. */
const ON_PICTURE =
    'text-terminal-foreground hover:bg-terminal-foreground/15 hover:text-terminal-foreground dark:hover:bg-terminal-foreground/15'

export interface UpNextProps {
    /** What plays next. */
    title: string
    /** Which episode it is, or who made it. */
    subtitle?: ReactNode
    /** Its artwork, which fills a wide frame; without it a cover is drawn from `placeholderSeed`. */
    cover?: ReactNode
    /** A stable id, such as the record's, that the drawn cover is chosen from when there is no `cover`; the title by default. */
    placeholderSeed?: string
    /**
     * Seconds until it plays by itself, counted down where the viewer sees it, `onPlay` called at
     * zero. Without it the part waits for a press, as when the app's autoplay is off. A new value, or
     * a new title, counts again from the start.
     */
    countdown?: number
    /** Holds the countdown where it is, as while a menu over it is open. */
    paused?: boolean
    /** Play now was pressed, or the countdown ran out. */
    onPlay: () => void
    /** Cancel was pressed: the viewer stays. The button shows only when this is given. */
    onCancel?: () => void
    words?: Partial<UpNextWords>
    className?: string
}

/**
 * What plays next, offered over the picture as a video ends: its artwork, its title and a line
 * under it, a countdown to playing it by itself, Play now and Cancel. It is drawn light on dark for
 * `VideoPlayer`'s `cover`, which dims the picture behind it and keeps it in full screen, and sizes
 * itself by the player's width: the artwork shows once the picture is wide enough, and the title
 * grows on a large one. The app shows it from `onEnded` and takes it away on either button.
 */
export function UpNext({
    title,
    subtitle,
    cover,
    placeholderSeed,
    countdown,
    paused = false,
    onPlay,
    onCancel,
    words: given,
    className,
}: UpNextProps) {
    const words = { ...UP_NEXT_WORDS, ...given }
    const counting = countdown !== undefined && countdown > 0
    const start = counting ? Math.ceil(countdown) : 0
    const [left, setLeft] = useState(start)
    // What the countdown last started from, so a new count or a new title starts it again.
    const [from, setFrom] = useState(`${String(start)}:${title}`)
    if (from !== `${String(start)}:${title}`) {
        setFrom(`${String(start)}:${title}`)
        setLeft(start)
    }
    const latest = useRef(onPlay)
    useEffect(() => {
        latest.current = onPlay
    })
    useEffect(() => {
        if (!counting || paused || left <= 0) return
        const tick = setTimeout(() => {
            setLeft((seconds) => seconds - 1)
        }, 1000)
        return () => {
            clearTimeout(tick)
        }
    }, [counting, paused, left])
    useEffect(() => {
        if (counting && left <= 0) latest.current()
    }, [counting, left])
    const [titleRef, clamped] = useClamped<HTMLHeadingElement>()

    return (
        <section
            aria-label={words.heading}
            data-slot="up-next"
            className={cn('flex w-full max-w-xl items-center gap-4 text-terminal-foreground', className)}
        >
            <div className="hidden aspect-video w-2/5 shrink-0 overflow-hidden rounded-surface shadow-md @md:block">
                {cover ?? <Artwork seed={placeholderSeed ?? title} wide />}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-eyebrow text-terminal-muted uppercase">{words.heading}</p>
                <h2
                    ref={titleRef}
                    title={clamped ? title : undefined}
                    className="line-clamp-2 text-section-title break-words @3xl:text-page"
                >
                    {title}
                </h2>
                {subtitle !== undefined && <p className="truncate text-help text-terminal-muted">{subtitle}</p>}
                {counting && <p className="text-help text-terminal-muted tabular-nums">{words.playingIn(Math.max(0, left))}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button onClick={onPlay}>
                        <Play className="fill-current" aria-hidden />
                        {words.playNow}
                    </Button>
                    {onCancel !== undefined && (
                        <Button variant="ghost" onClick={onCancel} className={ON_PICTURE}>
                            {words.cancel}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    )
}
