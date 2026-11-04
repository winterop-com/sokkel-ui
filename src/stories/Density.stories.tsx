import type { Meta, StoryObj } from '@storybook/react-vite'

import { RunsPage } from './RunsPage'

/** The Runs page at each density, every distance on it a density token. */
const meta: Meta<typeof RunsPage> = {
    title: 'Foundations/Density',
    component: RunsPage,
}
export default meta

type Story = StoryObj<typeof RunsPage>

export const Regular: Story = { globals: { density: 'regular' } }
export const Compact: Story = { globals: { density: 'compact' } }
