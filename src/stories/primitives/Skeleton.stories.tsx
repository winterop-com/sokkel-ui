import type { Meta, StoryObj } from '@storybook/react-vite'

import { Skeleton } from '../../components/ui/skeleton'

const meta: Meta = { title: 'Primitives/Display/Skeleton' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            {children}
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="line">
                    <Skeleton className="h-4 w-48" />
                </Labeled>
                <Labeled label="short line">
                    <Skeleton className="h-3 w-20" />
                </Labeled>
                <Labeled label="circle">
                    <Skeleton className="size-8 rounded-full" />
                </Labeled>
                <Labeled label="rectangle">
                    <Skeleton className="h-20 w-40 rounded-lg" />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const LoadingRuns: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-3xl flex-col rounded-lg border">
                <div className="flex gap-4 border-b px-3 py-2.5 text-sm font-medium">
                    <span className="flex-1">Job</span>
                    <span className="w-20">State</span>
                    <span className="hidden w-32 sm:block">Started</span>
                    <span className="w-14 text-right">Duration</span>
                </div>
                {[0, 1, 2, 3, 4].map((row) => (
                    <div key={row} className="flex items-center gap-4 border-b px-3 py-3 last:border-0">
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <Skeleton className="hidden h-4 w-32 sm:block" />
                        <Skeleton className="h-4 w-14" />
                    </div>
                ))}
            </div>
        </Ground>
    ),
}
