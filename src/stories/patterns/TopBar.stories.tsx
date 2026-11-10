import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Play, Workflow } from 'lucide-react'

import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Page, Shell } from '@winterop-com/sokkel-ui/Shell'
import { TopBar, type TopBarProps } from '@winterop-com/sokkel-ui/TopBar'
import { TidevannMark } from '../fixtures/TidevannMark'

/**
 * The shell's top bar: the trail to the current screen at its start and the palette's button at its
 * end. The trail ends at the current screen by default; an app whose page heading names the screen
 * ends it at the screen above, every crumb a link.
 */
const meta: Meta = { title: 'Patterns/Top bar', parameters: { layout: 'fullscreen' } }
export default meta

const PLACES: RailGroup[] = [
    {
        id: 'operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
        ],
    },
]

function Frame(props: TopBarProps) {
    return (
        <TooltipProvider>
            <Shell
                rail={<Rail mark={<TidevannMark />} name="Tidevann" groups={PLACES} />}
                top={<TopBar onSearch={() => undefined} {...props} />}
            >
                <Page>
                    <PageHeader title="Run 1842" description="nightly-export, started by ada at 02:00." />
                </Page>
            </Shell>
        </TooltipProvider>
    )
}

/** The trail ends at the current screen, plain words marked as the page; on a phone only it is shown. */
export const Current: StoryObj = {
    render: () => <Frame trail={[{ label: 'harbor', href: '#' }, { label: 'Runs', href: '#' }, { label: 'Run 1842' }]} />,
}

/**
 * The trail holds only the screens above, the page's heading naming the current one: every crumb is
 * a link and a chevron follows the last; on a phone the last crumb alone is the way back.
 */
export const Ancestors: StoryObj = {
    render: () => (
        <Frame
            trailEnds="ancestor"
            trail={[
                { label: 'harbor', href: '#' },
                { label: 'Runs', href: '#' },
            ]}
        />
    ),
}
