import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Row } from '@winterop-com/sokkel-ui/Layout'
import { SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { runPanelTabs } from '../fixtures/runPanel'

/**
 * The right-hand panel beside a page, here a Tidevann run's: its tabs a tablist over the content,
 * their tabpanel. The arrows, Home and End move between the tabs and Enter or Space shows one. On a
 * phone in a `Shell` with `panelStrip` the tabs move to a strip at the foot of the screen (see the
 * Shell's Panel tabs stories).
 */
const meta: Meta = { title: 'Patterns/Side panel' }
export default meta

/** The panel at the page's right edge, the full height of the canvas. */
function Edge({ children }: { children: ReactNode }) {
    return (
        <Row gap="none" align="stretch" justify="end" className="h-svh bg-background text-foreground">
            {children}
        </Row>
    )
}

/** A run's Details, Log and Outputs, the log shown. */
export const Tabs: StoryObj = {
    render: () => (
        <Edge>
            <SidePanel tabs={runPanelTabs()} defaultActive="log" />
        </Edge>
    ),
}

/** One tab: a heading names the panel, as nothing is there to switch to. */
export const SoleTitle: StoryObj = {
    name: 'One tab',
    render: () => (
        <Edge>
            <SidePanel tabs={runPanelTabs(1)} />
        </Edge>
    ),
}

/** One tab drawn as a tablist of one with `soleTab="tab"`, for a panel whose tabs come and go. */
export const SoleTab: StoryObj = {
    name: 'One tab as tab',
    render: () => (
        <Edge>
            <SidePanel tabs={runPanelTabs(1)} soleTab="tab" />
        </Edge>
    ),
}
