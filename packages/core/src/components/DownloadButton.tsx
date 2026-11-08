import { Check, Download, X } from 'lucide-react'

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
}

const WORDS: DownloadButtonWords = {
    download: 'Download',
    progress: (count, total) => `${String(count)} of ${String(total)}`,
    running: 'Downloading',
    cancel: 'Cancel the download',
    kept: 'Kept',
}

/** How far along a download is, from 0 to 1: the share given, else the count over the total. */
export function downloadShare({ value, count, total }: { value?: number; count?: number; total?: number }): number {
    if (value !== undefined) return Math.min(1, Math.max(0, value))
    if (count === undefined || total === undefined || total <= 0) return 0
    return Math.min(1, Math.max(0, count / total))
}

/**
 * A button that downloads something for keeping, through its three states, which the app holds in
 * `state`: idle says Download; running fills a `ProgressRing` and says how many of how many parts
 * are in (`count` and `total`; `value` alone for a share such as bytes), with a button beside it to
 * cancel; kept says Kept with a check, and pressing it calls `onOpen`, to show the kept copy, when
 * given, or downloads again.
 */
export function DownloadButton({
    state,
    count,
    total,
    value,
    onDownload,
    onCancel,
    onOpen,
    variant = 'outline',
    size = 'default',
    className,
    words: given,
}: {
    state: DownloadState
    count?: number
    total?: number
    /** The share done, 0 to 1, when there are no parts to count. */
    value?: number
    onDownload?: () => void
    onCancel?: () => void
    onOpen?: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    size?: 'sm' | 'default' | 'lg'
    className?: string
    words?: Partial<DownloadButtonWords>
}) {
    const words = { ...WORDS, ...given }
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
    if (state === 'kept')
        return (
            <Button variant="ghost" size={size} onClick={onOpen ?? onDownload} data-slot="download-button" className={className}>
                <Check aria-hidden className="text-good-ink" />
                {words.kept}
            </Button>
        )
    return (
        <Button variant={variant} size={size} onClick={onDownload} data-slot="download-button" className={className}>
            <Download aria-hidden />
            {words.download}
        </Button>
    )
}
