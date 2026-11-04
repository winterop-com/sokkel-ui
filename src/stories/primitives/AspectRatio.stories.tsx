import type { Meta, StoryObj } from '@storybook/react-vite'

import { AspectRatio } from '../../components/ui/aspect-ratio'

const meta: Meta = { title: 'Primitives/Display/AspectRatio' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

const RATIOS = [
    ['16 / 9', 16 / 9],
    ['4 / 3', 4 / 3],
    ['1 / 1', 1],
    ['21 / 9', 21 / 9],
] as const

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {RATIOS.map(([label, ratio]) => (
                    <div key={label} className="flex flex-col gap-2">
                        <AspectRatio ratio={ratio} className="rounded-lg border bg-muted">
                            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
                                {label}
                            </span>
                        </AspectRatio>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                ))}
            </div>
        </Ground>
    ),
}

const DAILY_ORDERS = [42, 55, 38, 61, 70, 48, 52, 66, 74, 59, 63, 80, 71, 68]

export const FilePreview: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-2">
                <p className="text-sm font-medium">
                    Preview of <span className="font-mono">orders-2026-10.csv</span>
                </p>
                <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border bg-card">
                    <div className="absolute inset-0 flex items-end gap-1 p-4">
                        {DAILY_ORDERS.map((count, day) => (
                            <div key={day} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${count}%` }} />
                        ))}
                    </div>
                </AspectRatio>
                <p className="text-xs text-muted-foreground">Orders a day, 2026-10-01 to 2026-10-14.</p>
            </div>
        </Ground>
    ),
}
