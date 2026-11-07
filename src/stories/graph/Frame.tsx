import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import type { ReactNode } from 'react'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** A story's page: a title over a graph that takes the rest of the screen. */
export function Stage({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
    return (
        <Stack className="h-svh bg-background p-4 text-foreground md:p-6">
            <PageHeader title={title} description={meta} />
            <Row gap="lg" align="stretch" stackBelow="md" className="min-h-0 flex-1">
                {children}
            </Row>
        </Stack>
    )
}
