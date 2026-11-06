import type { Meta, StoryObj } from '@storybook/react-vite'
import { Files, Play, Settings } from 'lucide-react'

import { FileList, type FileEntry } from '../../components/FileList'
import { PageHeader } from '../../components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Row, Stack } from '../../components/Layout'

const meta: Meta = { title: 'Primitives/Navigation/Tabs', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Sample({ variant, orientation }: { variant: 'default' | 'line'; orientation: 'horizontal' | 'vertical' }) {
    return (
        <Tabs defaultValue="runs" orientation={orientation}>
            <TabsList variant={variant}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="runs">Runs</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-muted-foreground">
                The job's steps and last run.
            </TabsContent>
            <TabsContent value="runs" className="text-muted-foreground">
                Every run of nightly-export, newest first.
            </TabsContent>
            <TabsContent value="files" className="text-muted-foreground">
                The files the job wrote.
            </TabsContent>
        </Tabs>
    )
}

export const Variants: StoryObj = {
    render: () => (
        <>
            <Row gap="3xl" align="stretch" wrap>
                <Stack gap="sm">
                    <Caption>default, horizontal</Caption>
                    <Sample variant="default" orientation="horizontal" />
                </Stack>
                <Stack gap="sm">
                    <Caption>line, horizontal</Caption>
                    <Sample variant="line" orientation="horizontal" />
                </Stack>
            </Row>
            <Row gap="3xl" align="stretch" wrap>
                <Stack gap="sm">
                    <Caption>default, vertical</Caption>
                    <Sample variant="default" orientation="vertical" />
                </Stack>
                <Stack gap="sm">
                    <Caption>line, vertical</Caption>
                    <Sample variant="line" orientation="vertical" />
                </Stack>
            </Row>
        </>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Stack gap="sm">
            <Caption>one tab disabled, icons</Caption>
            <Tabs defaultValue="runs">
                <TabsList>
                    <TabsTrigger value="runs">
                        <Play data-icon="inline-start" />
                        Runs
                    </TabsTrigger>
                    <TabsTrigger value="files" disabled>
                        <Files data-icon="inline-start" />
                        Files
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings data-icon="inline-start" />
                        Settings
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="runs" className="text-muted-foreground">
                    Files is disabled until the job has written one.
                </TabsContent>
            </Tabs>
        </Stack>
    ),
}

const FILES: FileEntry[] = [
    { id: 'orders-2026-10', name: 'orders-2026-10.csv', kind: 'table', size: 2_400_000, modified: 'Nov 1, 02:04', owner: 'scheduler' },
    { id: 'orders-2026-09', name: 'orders-2026-09.csv', kind: 'table', size: 2_200_000, modified: 'Oct 1, 02:03', owner: 'scheduler' },
]

export const JobPage: StoryObj = {
    render: () => (
        <Stack gap="lg">
            <PageHeader title="Nightly export" code="nightly-export" />
            <Tabs defaultValue="files">
                <TabsList variant="line">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="runs">Runs</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="files" className="pt-3">
                    <FileList entries={FILES} />
                </TabsContent>
            </Tabs>
        </Stack>
    ),
}
