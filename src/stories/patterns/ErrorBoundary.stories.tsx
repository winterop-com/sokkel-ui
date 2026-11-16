import type { Meta, StoryObj } from '@storybook/react-vite'

import { ErrorBoundary } from '@winterop-com/sokkel-ui/ErrorBoundary'

/**
 * `ErrorBoundary`: a failure thrown while drawing its content is drawn as a failed page in the
 * content's place, with its message and Try again, and the rest of the app stays. `Shell` wraps its
 * page in one, which lets the failure go when the route changes.
 */
const meta: Meta = { title: 'Patterns/Error boundary', parameters: { frame: 'column' } }
export default meta

/** A run's page that reads its address part as a run id, and throws on one it cannot read. */
function RunFromAddress({ part }: { part: string }) {
    const id = decodeURIComponent(part)
    return <p className="text-sm">Run {id}</p>
}

/**
 * A page drawn from an address part with a stray `%`, which `decodeURIComponent` throws on: the
 * boundary draws the failure as the page's own heading, and Try again draws the page once more.
 */
export const Caught: StoryObj = {
    name: 'Caught',
    render: () => (
        <ErrorBoundary inset>
            <RunFromAddress part="nightly-export-%E0%A4%A" />
        </ErrorBoundary>
    ),
}
