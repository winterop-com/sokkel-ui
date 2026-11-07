import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * One setting: its title and what it does on the left, its control on the right. A note sits
 * under the description, for what the setting needs or changes elsewhere.
 *
 * When the row is too narrow for both, a wide control wraps under the words.
 */
export function SettingRow({
    title,
    description,
    note,
    control,
    className,
}: {
    title: ReactNode
    description?: ReactNode
    note?: ReactNode
    control?: ReactNode
    className?: string
}) {
    return (
        <div data-slot="setting-row" className={cn('flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4', className)}>
            <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                <div className="text-sm font-medium">{title}</div>
                {description !== undefined && <div className="text-sm text-muted-foreground">{description}</div>}
                {note !== undefined && (
                    <div className="mt-2 self-start rounded-control bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{note}</div>
                )}
            </div>
            {control !== undefined && <div className="flex shrink-0 items-center">{control}</div>}
        </div>
    )
}
