import type { Meta, StoryObj } from '@storybook/react-vite'

import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'

/** A small chip naming the request behind a screen, copyable. */
const meta: Meta = { title: 'Patterns/API link', parameters: { frame: 'column' } }
export default meta

/** The methods, each in its ink: reads quiet, writes in the warning ink, deletes in the critical. */
export const Methods: StoryObj = {
    render: () => (
        <Stack gap="sm" align="start">
            <ApiLink path="/api/jobs" />
            <ApiLink method="POST" path="/api/jobs/nightly-export/runs" />
            <ApiLink method="PATCH" path="/api/jobs/sync-inventory" />
            <ApiLink method="DELETE" path="/api/jobs/rebuild-index" />
        </Stack>
    ),
}

/** The path as a link to the raw response, and a copy that takes the whole address. */
export const Linked: StoryObj = {
    render: () => (
        <Row>
            <ApiLink
                path="/api/runs?job=import-orders&state=failed"
                href="https://api.example.org/api/runs?job=import-orders&state=failed"
                copyValue="curl https://api.example.org/api/runs?job=import-orders&state=failed"
            />
        </Row>
    ),
}

/** With `open` the whole chip is one link that opens the address in a new tab, in place of the copy button. */
export const Opens: StoryObj = {
    render: () => (
        <Stack gap="sm" align="start">
            <ApiLink open path="/api/jobs/nightly-export" href="https://api.example.org/api/jobs/nightly-export" />
            <ApiLink open method="POST" path="/api/jobs/sync-inventory/runs" href="https://api.example.org/api/jobs/sync-inventory/runs" />
        </Stack>
    ),
}

/** Under a page's title, naming the request the page is drawn from; a long path gives way on a phone. */
export const OnPage: StoryObj = {
    name: 'On a page',
    render: () => (
        <PageHeader
            title="Runs"
            description={<ApiLink path="/api/projects/harbor/jobs/nightly-export/runs?state=failed&since=2026-11-01" />}
        />
    ),
}
