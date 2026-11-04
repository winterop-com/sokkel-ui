import type { Meta, StoryObj } from '@storybook/react-vite'
import { Files, Play, Settings } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'

const meta: Meta = { title: 'Primitives/Navigation/Tabs' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

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
        <Ground>
            <div className="flex flex-wrap gap-10">
                <div className="flex flex-col gap-2">
                    <Caption>default, horizontal</Caption>
                    <Sample variant="default" orientation="horizontal" />
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>line, horizontal</Caption>
                    <Sample variant="line" orientation="horizontal" />
                </div>
            </div>
            <div className="flex flex-wrap gap-10">
                <div className="flex flex-col gap-2">
                    <Caption>default, vertical</Caption>
                    <Sample variant="default" orientation="vertical" />
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>line, vertical</Caption>
                    <Sample variant="line" orientation="vertical" />
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-2">
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
            </div>
        </Ground>
    ),
}

const FILES = [
    ['orders-2026-10.csv', '2.4 MB'],
    ['orders-2026-09.csv', '2.2 MB'],
] as const

export const JobPage: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-lg font-medium">Nightly export</h1>
                    <p className="font-mono text-xs text-muted-foreground">nightly-export</p>
                </div>
                <Tabs defaultValue="files">
                    <TabsList variant="line">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="runs">Runs</TabsTrigger>
                        <TabsTrigger value="files">Files</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="files" className="pt-3">
                        <ul className="flex flex-col divide-y rounded-lg border">
                            {FILES.map(([file, size]) => (
                                <li key={file} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                                    <span className="font-mono">{file}</span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{size}</span>
                                </li>
                            ))}
                        </ul>
                    </TabsContent>
                </Tabs>
            </div>
        </Ground>
    ),
}
