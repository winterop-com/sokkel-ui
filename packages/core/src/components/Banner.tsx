import { IconButton } from './IconButton'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export type BannerTone = 'critical' | 'warning' | 'info' | 'good'

const TONE: Record<BannerTone, string> = {
    critical: 'border-critical/35 bg-critical/12 text-critical-ink',
    warning: 'border-warning/35 bg-warning/12 text-warning-ink',
    info: 'border-info/35 bg-info/12 text-info-ink',
    good: 'border-good/35 bg-good/12 text-good-ink',
}

const ICON: Record<BannerTone, typeof Info> = { critical: CircleAlert, warning: TriangleAlert, info: Info, good: CircleCheck }

/**
 * A strip across the top of a screen or the app for a state that holds until it changes: the
 * server is not answering, a read-only instance, a pending upgrade. One line, truncated on a
 * phone, with its actions at the end and an optional dismiss.
 */
export function Banner({
    tone = 'info',
    icon,
    actions,
    onDismiss,
    className,
    words = { dismiss: 'Dismiss' },
    children,
}: {
    tone?: BannerTone
    icon?: ReactNode
    actions?: ReactNode
    onDismiss?: () => void
    className?: string
    words?: { dismiss: string }
    children: ReactNode
}) {
    const Icon = ICON[tone]
    return (
        <div
            role={tone === 'critical' ? 'alert' : 'status'}
            className={cn('flex shrink-0 items-center gap-2 border-b px-3 py-1.5', TONE[tone], className)}
        >
            {icon ?? <Icon className="size-4 shrink-0" aria-hidden />}
            <p className="min-w-0 flex-1 truncate text-sm">{children}</p>
            {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            {onDismiss !== undefined && (
                <IconButton label={words.dismiss} className="shrink-0 text-current" onClick={onDismiss}>
                    <X aria-hidden />
                </IconButton>
            )}
        </div>
    )
}
