import type { Meta, StoryObj } from '@storybook/react-vite'

import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { RadarPanel, type RadarSpoke } from '@winterop-com/sokkel-ui-charts/dashboard/RadarPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import { PROJECT_SCORES, PROJECT_SPOKES, PROJECT_TARGET } from '../fixtures/scores'
import { Ground } from './Ground'

/** Radar charts on EChart: a few projects compared on five measures at once, each scored from 0 to 100. */
const meta: Meta = { title: 'Charts/Radar' }
export default meta

const SPOKES: RadarSpoke[] = PROJECT_SPOKES.map((name) => ({ name, max: 100 }))

const PROJECTS: PanelSeries[] = [
    { name: 'harbor', values: PROJECT_SCORES.harbor, color: 'chart-2' },
    { name: 'juniper', values: PROJECT_SCORES.juniper, color: 'chart-3' },
    { name: 'larkspur', values: PROJECT_SCORES.larkspur, color: 'chart-4' },
]

const AGAINST_TARGET = (project: keyof typeof PROJECT_SCORES, color: string): PanelSeries[] => [
    { name: project, values: PROJECT_SCORES[project], color },
    { name: 'Target', values: PROJECT_TARGET, color: 'muted-foreground', dashed: true },
]

const HARBOR = AGAINST_TARGET('harbor', 'chart-2')
const JUNIPER = AGAINST_TARGET('juniper', 'chart-3')
const LARKSPUR = AGAINST_TARGET('larkspur', 'chart-4')

/** Three projects over the same five measures, the legend under the chart hiding and emphasizing each. */
export const Projects: StoryObj = {
    render: () => (
        <Ground title="Projects, this quarter" columns={1}>
            <RadarPanel title="Project scores" subtitle="0 to 100" spokes={SPOKES} series={PROJECTS} span="full" bodyClassName="h-80" />
        </Ground>
    ),
}

/** Each project on round rings against the target drawn as a dashed outline, three to a row on a wide screen. */
export const Targets: StoryObj = {
    render: () => (
        <Ground title="Projects, this quarter" columns={1}>
            <DashboardGrid>
                <RadarPanel title="harbor" spokes={SPOKES} series={HARBOR} shape="circle" />
                <RadarPanel title="juniper" spokes={SPOKES} series={JUNIPER} shape="circle" />
                <RadarPanel title="larkspur" spokes={SPOKES} series={LARKSPUR} shape="circle" />
            </DashboardGrid>
        </Ground>
    ),
}
