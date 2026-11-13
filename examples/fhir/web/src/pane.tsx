import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import type { ReactNode } from 'react'

/** A pane: its head with a title, a short note and its actions, and its content filling the rest. */
export function Pane({ title, meta, actions, children }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
    return (
        <Stack gap="none" className="h-full min-h-0">
            <PaneHeader title={title} meta={meta} actions={actions} />
            <Fill>{children}</Fill>
        </Stack>
    )
}
