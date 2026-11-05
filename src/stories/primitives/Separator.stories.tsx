import type { Meta, StoryObj } from '@storybook/react-vite'

import { PageHeader } from '../../components/PageHeader'
import { Separator } from '../../components/ui/separator'

const meta: Meta = { title: 'Primitives/Display/Separator' }
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

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-md flex-col gap-2">
                <Caption>horizontal</Caption>
                <p className="text-sm">Settings</p>
                <Separator />
                <p className="text-sm">Output</p>
            </div>
            <div className="flex flex-col gap-2">
                <Caption>vertical</Caption>
                <div className="flex h-5 items-center gap-3 text-sm">
                    <span>Runs</span>
                    <Separator orientation="vertical" />
                    <span>Files</span>
                    <Separator orientation="vertical" />
                    <span>Settings</span>
                </div>
            </div>
        </Ground>
    ),
}

export const JobHeader: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-3">
                <PageHeader title="Nightly export" code="nightly-export" />
                <Separator />
                <div className="flex h-5 flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>3 steps</span>
                    <Separator orientation="vertical" />
                    <span>every night at 02:00</span>
                    <Separator orientation="vertical" />
                    <span className="tabular-nums">last run 2026-11-04 14:02</span>
                </div>
            </div>
        </Ground>
    ),
}
