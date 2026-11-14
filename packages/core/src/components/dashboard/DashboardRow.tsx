import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { DashboardGrid } from './DashboardGrid'

/** The words a dashboard row; `panels` counts what a collapsed row holds says. */
export interface DashboardRowWords {
    panels: (count: number) => string
}

const WORDS: DashboardRowWords = {
    panels: (n: number) => `${n} ${n === 1 ? 'panel' : 'panels'}`,
}

export interface DashboardRowProps {
    title: ReactNode
    /** How many panels the row holds, said while it is collapsed. */
    count?: number
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
    dense?: boolean
    actions?: ReactNode
    words?: Partial<DashboardRowWords>
    className?: string
    children: ReactNode
}

/**
 * A collapsible group of a dashboard's panels under a heading, such as Overview or Latency. A
 * collapsed row says how many panels it holds. Its panels sit in a grid of their own, dense when
 * asked.
 */
export function DashboardRow({
    title,
    count,
    defaultOpen = true,
    open,
    onOpenChange,
    dense = true,
    actions,
    words: given,
    className,
    children,
}: DashboardRowProps) {
    const words = { ...WORDS, ...given }
    return (
        <Collapsible
            defaultOpen={defaultOpen}
            open={open}
            onOpenChange={onOpenChange}
            className={cn('group/row flex flex-col gap-1.5', className)}
        >
            <div className="flex h-7 items-center gap-2">
                <CollapsibleTrigger className="flex min-w-0 items-center gap-1 rounded-md pr-1.5 text-sm font-medium outline-none hover:text-foreground focus-visible:outline-focus focus-visible:outline-ring focus-visible:outline-solid">
                    <ChevronDown
                        className="size-4 text-muted-foreground transition-transform group-data-closed/row:-rotate-90"
                        aria-hidden
                    />
                    <span className="truncate">{title}</span>
                    {count !== undefined && (
                        <span className="ml-1 hidden text-xs font-normal text-muted-foreground group-data-closed/row:inline">
                            {words.panels(count)}
                        </span>
                    )}
                </CollapsibleTrigger>
                <span className="h-px flex-1 bg-border" aria-hidden />
                {actions}
            </div>
            <CollapsibleContent>
                <DashboardGrid dense={dense}>{children}</DashboardGrid>
            </CollapsibleContent>
        </Collapsible>
    )
}
