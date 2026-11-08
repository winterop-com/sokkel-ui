import { Check, Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { Button, buttonVariants } from './ui/button'
import { ProgressRing } from './ui/progress-ring'

/** Where a download stands: not started, under way, or done and kept on the device. */
export type DownloadState = 'idle' | 'running' | 'kept'

export interface DownloadButtonWords {
    download: string
    /** What a running download says, given how many of how many parts are in. */
    progress: (count: number, total: number) => string
    /** What a running download with no count says. */
    running: string
    cancel: string
    kept: string
    /** What a kept copy says once pressed to remove, waiting for the second press. */
    remove: string
    /** The kept button's name with `onRemove`, and once armed. */
    removeLabel: string
    removeArmedLabel: string
}

const WORDS: DownloadButtonWords = {
    download: 'Download',
    progress: (count, total) => `${String(count)} of ${String(total)}`,
    running: 'Downloading',
    cancel: 'Cancel the download',
    kept: 'Kept',
    remove: 'Remove?',
    removeLabel: 'Kept on this device. Remove it',
    removeArmedLabel: 'Press again to remove this download',
}

/** How long a first press to remove stays armed, in milliseconds. */
const ARMED_FOR = 4000

/** How far along a download is, from 0 to 1: the share given, else the count over the total. */
export function downloadShare({ value, count, total }: { value?: number; count?: number; total?: number }): number {
    if (value !== undefined) return Math.min(1, Math.max(0, value))
    if (count === undefined || total === undefined || total <= 0) return 0
    return Math.min(1, Math.max(0, count / total))
}

export interface DownloadButtonProps {
    state: DownloadState
    count?: number
    total?: number
    /** The share done, 0 to 1, when there are no parts to count. */
    value?: number
    onDownload?: () => void
    onCancel?: () => void
    onOpen?: () => void
    /** Removes the kept copy, after a confirming second press. */
    onRemove?: () => void
    /** What the kept copy is, said on hover: its size, where it is kept. */
    keptDetail?: string
    /** Why the last download failed, said on hover of the idle button. */
    error?: string
    /** The icon alone: always, or only on a phone. */
    compact?: boolean | 'narrow'
    /** Starts armed to remove, waiting for the second press. */
    defaultArmed?: boolean
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    size?: 'sm' | 'default' | 'lg'
    className?: string
    words?: Partial<DownloadButtonWords>
}

/**
 * A button that downloads something for keeping, through its three states, which the app holds in
 * `state`: idle says Download; running fills a `ProgressRing` and says how many of how many parts
 * are in (`count` and `total`; `value` alone for a share such as bytes), with a button beside it to
 * cancel; kept says Kept with a check, and pressing it calls `onOpen`, to show the kept copy, when
 * given, or downloads again.
 *
 * With `onRemove`, pressing a kept copy removes it in two presses: the first arms it (it says
 * Remove? in the critical ink, for a few seconds or until focus leaves), the second calls
 * `onRemove`. `keptDetail` says on hover what is kept (its size, where), and `error` says on hover
 * why the last try failed, the idle button tinted. `compact` draws the icon alone, always or only
 * on a phone (`"narrow"`), the words staying for a screen reader.
 */
export function DownloadButton({
    state,
    count,
    total,
    value,
    onDownload,
    onCancel,
    onOpen,
    onRemove,
    keptDetail,
    error,
    compact = false,
    defaultArmed = false,
    variant = 'outline',
    size = 'default',
    className,
    words: given,
}: DownloadButtonProps) {
    const words = { ...WORDS, ...given }
    const [armed, setArmed] = useState(defaultArmed)
    useEffect(() => {
        if (!armed) return
        const timer = setTimeout(() => setArmed(false), ARMED_FOR)
        return () => clearTimeout(timer)
    }, [armed])
    useEffect(() => {
        if (state !== 'kept') setArmed(false)
    }, [state])
    const word = (text: string) => (
        <span className={cn(compact === true && 'sr-only', compact === 'narrow' && 'max-sm:sr-only')}>{text}</span>
    )
    if (state === 'running') {
        const said = count !== undefined && total !== undefined ? words.progress(count, total) : words.running
        return (
            <span data-slot="download-button" className={cn('inline-flex items-center gap-0.5', className)}>
                <span role="status" className={cn(buttonVariants({ variant, size }), 'pointer-events-none tabular-nums')}>
                    <ProgressRing value={downloadShare({ value, count, total })} label={said} />
                    {said}
                </span>
                {onCancel !== undefined && (
                    <IconButton
                        label={words.cancel}
                        size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'}
                        onClick={onCancel}
                    >
                        <X aria-hidden />
                    </IconButton>
                )}
            </span>
        )
    }
    if (state === 'kept') {
        if (onRemove !== undefined)
            return (
                <Button
                    variant="ghost"
                    size={size}
                    aria-label={armed ? words.removeArmedLabel : words.removeLabel}
                    title={armed ? words.removeArmedLabel : keptDetail}
                    onClick={() => {
                        if (armed) {
                            setArmed(false)
                            onRemove()
                        } else setArmed(true)
                    }}
                    onBlur={() => setArmed(false)}
                    data-slot="download-button"
                    data-armed={armed || undefined}
                    className={cn(armed && 'text-critical-ink hover:text-critical-ink', className)}
                >
                    <Check aria-hidden className={armed ? undefined : 'text-good-ink'} />
                    {word(armed ? words.remove : words.kept)}
                </Button>
            )
        return (
            <Button
                variant="ghost"
                size={size}
                title={keptDetail}
                onClick={onOpen ?? onDownload}
                data-slot="download-button"
                className={className}
            >
                <Check aria-hidden className="text-good-ink" />
                {word(words.kept)}
            </Button>
        )
    }
    return (
        <Button
            variant={variant}
            size={size}
            title={error}
            aria-description={error}
            onClick={onDownload}
            data-slot="download-button"
            className={className}
        >
            <Download aria-hidden className={error === undefined ? undefined : 'text-critical-ink'} />
            {word(words.download)}
        </Button>
    )
}
