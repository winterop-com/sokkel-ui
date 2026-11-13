import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FolderKanban, MoreHorizontal } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarGroup } from '@winterop-com/sokkel-ui/primitives/avatar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@winterop-com/sokkel-ui/primitives/card'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Display/Card', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <>
            <Columns>
                {(['default', 'sm'] as const).map((size) => (
                    <Stack key={size} gap="sm">
                        <Caption>{size}</Caption>
                        <Card size={size}>
                            <CardHeader>
                                <CardTitle>Nightly export</CardTitle>
                                <CardDescription>Exports the day's orders every night at 02:00.</CardDescription>
                                <CardAction>
                                    <Button variant="ghost" size="icon-sm" aria-label="More">
                                        <MoreHorizontal />
                                    </Button>
                                </CardAction>
                            </CardHeader>
                            <CardContent>
                                <p className="font-mono text-xs text-muted-foreground">nightly-export</p>
                            </CardContent>
                            <CardFooter>
                                <Row justify="end" className="flex-1">
                                    <Button variant="outline" size="sm">
                                        Edit
                                    </Button>
                                    <Button size="sm">Run now</Button>
                                </Row>
                            </CardFooter>
                        </Card>
                    </Stack>
                ))}
            </Columns>
            <Columns>
                <Stack gap="sm">
                    <Caption>header and content only</Caption>
                    <Card>
                        <CardHeader>
                            <CardTitle>Files</CardTitle>
                        </CardHeader>
                        <CardContent>Twelve files, the newest orders-2026-10.csv.</CardContent>
                    </Card>
                </Stack>
                <Stack gap="sm">
                    <Caption>header as a bar</Caption>
                    <Card>
                        <CardHeader bar>
                            <CardTitle>Schedule</CardTitle>
                            <CardDescription>When the job runs.</CardDescription>
                        </CardHeader>
                        <CardContent>Every night at 02:00, and on demand.</CardContent>
                    </Card>
                </Stack>
            </Columns>
        </>
    ),
}

const PROJECTS = [
    {
        code: 'larkspur',
        name: 'Larkspur',
        description: 'Order exports and the reports built on them.',
        jobs: 4,
        last: 'succeeded',
        when: '2026-11-04 14:02',
        people: ['AL', 'GH'],
    },
    {
        code: 'harbor',
        name: 'Harbor',
        description: 'The archive every export lands in.',
        jobs: 2,
        last: 'running',
        when: '2026-11-04 14:05',
        people: ['LT'],
    },
    {
        code: 'juniper',
        name: undefined,
        description: 'Search and the index behind it.',
        jobs: 3,
        last: 'failed',
        when: '2026-11-04 13:40',
        people: ['MH', 'AL', 'GH'],
    },
] as const

export const Projects: StoryObj = {
    render: () => (
        <Columns count={3} gap="lg">
            {PROJECTS.map((project) => (
                <Card key={project.code} size="sm">
                    <CardHeader>
                        <CardTitle>
                            <Row>
                                <FolderKanban className="size-4 text-muted-foreground" />
                                {project.name ?? <span className="font-mono">{project.code}</span>}
                            </Row>
                        </CardTitle>
                        {project.name !== undefined && <CardDescription className="font-mono text-xs">{project.code}</CardDescription>}
                        <CardAction>
                            <AvatarGroup>
                                {project.people.map((initials) => (
                                    <Avatar key={initials} size="sm">
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                ))}
                            </AvatarGroup>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{project.description}</p>
                    </CardContent>
                    <CardFooter className="text-xs">
                        <Row justify="between" wrap className="flex-1">
                            <Row as="span">
                                <StatusChip status={project.last} />
                                <span className="text-muted-foreground tabular-nums">{project.jobs} jobs</span>
                            </Row>
                            <span className="text-muted-foreground tabular-nums">{project.when}</span>
                        </Row>
                    </CardFooter>
                </Card>
            ))}
        </Columns>
    ),
}
