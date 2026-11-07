import type { Meta, StoryObj } from '@storybook/react-vite'

import { StatusItem, StatusLine } from '@winterop-com/sokkel-ui/StatusLine'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** The foot strip's contents in each tone, at the strip's own height. */
function Strip({ children }: { children: React.ReactNode }) {
    return (
        <Row gap="none" className="h-shell-foot border-t border-border-strong bg-sidebar px-3">
            {children}
        </Row>
    )
}

function Lines() {
    return (
        <Stack gap="xl" className="min-h-svh bg-background p-6 text-foreground">
            <Strip>
                <StatusLine note="import-orders is running" tone="live" live>
                    <StatusItem label="run" code>
                        run_01JCF8Q2
                    </StatusItem>
                    <StatusItem>step 3 of 5</StatusItem>
                </StatusLine>
            </Strip>
            <Strip>
                <StatusLine note="248 runs, 12 failed">
                    <StatusItem label="trace" code>
                        4bf92f35
                    </StatusItem>
                </StatusLine>
            </Strip>
            <Strip>
                <StatusLine note="The event stream dropped; reconnecting" tone="warn" />
            </Strip>
            <Strip>
                <StatusLine note="The server stopped answering at 14:02" tone="error">
                    <StatusItem>retry in 8s</StatusItem>
                </StatusLine>
            </Strip>
            <Strip>
                <StatusLine>
                    <StatusItem label="branch" code>
                        main
                    </StatusItem>
                    <StatusItem>1.4.0</StatusItem>
                </StatusLine>
            </Strip>
        </Stack>
    )
}

const meta: Meta = { title: 'Patterns/Status line' }
export default meta

export const Tones: StoryObj = { render: () => <Lines /> }
