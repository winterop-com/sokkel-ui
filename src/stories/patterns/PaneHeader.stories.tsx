import type { Meta, StoryObj } from '@storybook/react-vite'
import { Archive, ArrowLeft, Filter, Forward, MoreHorizontal, Plus, RefreshCw, Reply, Trash2 } from 'lucide-react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { PanelSection } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

const meta: Meta = { title: 'Patterns/Pane header', parameters: { frame: 'column' } }
export default meta

const STEPS = [
    { term: 'fetch', value: '12s' },
    { term: 'transform', value: '41s' },
    { term: 'validate', value: '8s' },
]

/** A pane's title with a count beside it and an action at its end, on the pane's own ground. */
export const Plain: StoryObj = {
    render: () => (
        <TooltipProvider>
            <Surface>
                <PaneHeader
                    title="Steps"
                    meta="3"
                    actions={
                        <IconButton label="Add a step">
                            <Plus aria-hidden />
                        </IconButton>
                    }
                />
                <PanelSection title="Took">
                    <DescriptionList items={STEPS} />
                </PanelSection>
            </Surface>
        </TooltipProvider>
    ),
}

/** The head of a boxed section, on the panel ground with its title set like a table's column heads. */
export const Panel: StoryObj = {
    render: () => (
        <Surface>
            <PaneHeader
                variant="panel"
                title="Latest run"
                meta="#4812"
                actions={
                    <Button variant="ghost" size="sm">
                        Open
                    </Button>
                }
            />
            <PanelSection title="State">
                <StatusChip status="succeeded" />
            </PanelSection>
        </Surface>
    ),
}

/** A reading pane's tools with no title: back on the left with the actions on the thing, replies at the right. */
export const Tools: StoryObj = {
    render: () => (
        <TooltipProvider>
            <Surface>
                <PaneHeader
                    start={
                        <>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft aria-hidden />
                                Back
                            </Button>
                            <IconButton label="Archive">
                                <Archive aria-hidden />
                            </IconButton>
                            <IconButton label="Delete">
                                <Trash2 aria-hidden />
                            </IconButton>
                        </>
                    }
                    actions={
                        <>
                            <IconButton label="Reply">
                                <Reply aria-hidden />
                            </IconButton>
                            <IconButton label="Forward">
                                <Forward aria-hidden />
                            </IconButton>
                            <IconButton label="More">
                                <MoreHorizontal aria-hidden />
                            </IconButton>
                        </>
                    }
                />
                <PanelSection title="Subject">
                    <p className="text-sm">nightly-export failed at validate</p>
                </PanelSection>
            </Surface>
        </TooltipProvider>
    ),
}

/** The head of one thing's detail: its code over a larger title that wraps, and its chips under. */
export const Detail: StoryObj = {
    render: () => (
        <Surface>
            <PaneHeader size="lg" code="HAR-118" title="Retry the upload step when the bucket answers slowly">
                <StatusChip status="running" />
                <Badge variant="secondary">worker</Badge>
                <Badge variant="secondary">harbor</Badge>
            </PaneHeader>
            <PanelSection title="Description">
                <p className="text-sm text-pretty">
                    The upload step gives up after one slow answer; three tries with a pause would carry it through.
                </p>
            </PanelSection>
        </Surface>
    ),
}

/** Three narrow panes of a work page, each head with a count or a fact beside its title and tools at its end. */
const PANES = [
    { title: 'Runs', meta: '1,204 in harbor, updated 09:52 by the scheduler', variant: 'plain' as const },
    { title: 'Queued', meta: '3', variant: 'plain' as const },
    { title: 'Failed this week', meta: 'nightly-export, sync-inventory and send-digest', variant: 'panel' as const },
]

/**
 * Heads in panes too narrow for their title and a long fact side by side: the fact goes under the
 * title, cut short where it is wider still, and never runs into the tools. A short count stays
 * beside its title.
 */
export const LongMeta: StoryObj = {
    name: 'Long meta',
    render: () => (
        <TooltipProvider>
            <Columns count={3}>
                {PANES.map((pane) => (
                    <Surface key={pane.title}>
                        <PaneHeader
                            variant={pane.variant}
                            title={pane.title}
                            meta={pane.meta}
                            actions={
                                <>
                                    <IconButton label="Filter">
                                        <Filter aria-hidden />
                                    </IconButton>
                                    <IconButton label="Refresh">
                                        <RefreshCw aria-hidden />
                                    </IconButton>
                                </>
                            }
                        />
                        <PanelSection title="Took">
                            <DescriptionList items={STEPS} />
                        </PanelSection>
                    </Surface>
                ))}
            </Columns>
        </TooltipProvider>
    ),
}
