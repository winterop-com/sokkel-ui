import { PageHeader } from '../../components/PageHeader'
import type { ReactNode } from 'react'

/** A page of one map: its title and period over a map that takes the rest of the screen. */
export function Page({ title, period, children }: { title: string; period: string; children: ReactNode }) {
    return (
        <div className="flex h-svh flex-col gap-3 bg-background p-4 text-foreground md:p-6">
            <PageHeader title={title} description={period} />
            {children}
        </div>
    )
}
