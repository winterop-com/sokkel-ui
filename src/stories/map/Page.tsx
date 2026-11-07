import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import type { ReactNode } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'

/** A page of one map: its title and period over a map that takes the rest of the screen. */
export function Page({ title, period, children }: { title: string; period: string; children: ReactNode }) {
    return (
        <Stack className="h-svh bg-background p-4 text-foreground md:p-6">
            <PageHeader title={title} description={period} />
            {children}
        </Stack>
    )
}
