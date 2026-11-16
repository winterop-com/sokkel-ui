import type { Meta, StoryObj } from '@storybook/react-vite'

import { NotFound } from '@winterop-com/sokkel-ui/NotFound'

/**
 * `NotFound`: the page an app draws for an address none of its pages answers, saying the address
 * and linking back to the first page, rather than drawing the first page as if nothing were wrong.
 */
const meta: Meta = { title: 'Patterns/Not found', parameters: { frame: 'column' } }
export default meta

/** An address to a job that is not there. */
export const Address: StoryObj = {
    name: 'Address',
    render: () => <NotFound address="#/jobs/nightly-exprot" />,
}
