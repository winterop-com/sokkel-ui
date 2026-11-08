import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * Where a setting's control sits: `trailing` in a column at the right, level with the title, for a
 * compact control such as a switch or a small button; `below` under the description, for a wide
 * control such as a slider or a choice of several; `auto` trailing while the row has room for it
 * and below once it is narrow.
 */
export type SettingRowLayout = 'auto' | 'trailing' | 'below'

const LAYOUT: Record<SettingRowLayout, { grid: string; control: string }> = {
    trailing: { grid: 'grid-cols-[minmax(0,1fr)_auto]', control: 'col-start-2 row-span-2 row-start-1' },
    below: { grid: 'grid-cols-1', control: 'col-start-1' },
    auto: {
        grid: 'grid-cols-1 @lg:grid-cols-[minmax(0,1fr)_auto]',
        control: 'col-start-1 @lg:col-start-2 @lg:row-span-2 @lg:row-start-1',
    },
}

/**
 * One setting: its title and what it does, and its control, placed by `layout`. A note spans the
 * row under both, for what the setting needs or changes elsewhere.
 */
export function SettingRow({
    title,
    description,
    note,
    control,
    layout = 'auto',
    className,
}: {
    title: ReactNode
    description?: ReactNode
    note?: ReactNode
    control?: ReactNode
    /** Where the control sits; `auto` places it by the row's width. */
    layout?: SettingRowLayout
    className?: string
}) {
    const placed = LAYOUT[layout]
    return (
        <div data-slot="setting-row" className={cn('@container py-4', className)}>
            <div className={cn('grid items-start gap-x-8', placed.grid)}>
                <div className="col-start-1 row-start-1 text-sm font-medium">{title}</div>
                {description !== undefined && (
                    <div className="col-start-1 row-start-2 mt-0.5 text-sm text-muted-foreground">{description}</div>
                )}
                {control !== undefined && (
                    <div
                        className={cn(
                            'flex min-h-(--text-sm--line-height) min-w-0 items-center',
                            placed.control,
                            layout !== 'trailing' && 'mt-3',
                            layout === 'auto' && '@lg:mt-0',
                        )}
                    >
                        {control}
                    </div>
                )}
                {note !== undefined && (
                    <div className="col-span-full mt-2 self-start justify-self-start rounded-control bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                        {note}
                    </div>
                )}
            </div>
        </div>
    )
}
