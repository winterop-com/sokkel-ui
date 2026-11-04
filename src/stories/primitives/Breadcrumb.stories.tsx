import type { Meta, StoryObj } from '@storybook/react-vite'
import { Slash } from 'lucide-react'

import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '../../components/ui/breadcrumb'

const meta: Meta = { title: 'Primitives/Navigation/Breadcrumb' }
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
            <div className="flex flex-col gap-2">
                <Caption>default separator</Caption>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Larkspur</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex flex-col gap-2">
                <Caption>custom separator</Caption>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Files</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                            <Slash />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-mono">orders-2026-10.csv</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex flex-col gap-2">
                <Caption>collapsed with an ellipsis</Caption>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbEllipsis />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>validate</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </Ground>
    ),
}

export const RunPath: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-3">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Larkspur</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#" className="font-mono">
                                nightly-export
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-mono">01a1a5c2</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-lg font-medium">
                    Run <span className="font-mono">01a1a5c2</span>
                </h1>
                <p className="text-sm text-muted-foreground">Failed at step validate, 2026-11-04 14:02, after 0.3s.</p>
            </div>
        </Ground>
    ),
}
