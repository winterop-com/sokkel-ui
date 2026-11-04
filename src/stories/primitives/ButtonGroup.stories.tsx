import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Pause, Play, Square } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '../../components/ui/button-group'
import { Input } from '../../components/ui/input'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Actions/ButtonGroup' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <Labeled label="horizontal">
                    <ButtonGroup>
                        <Button variant="outline">Runs</Button>
                        <Button variant="outline">Schedules</Button>
                        <Button variant="outline">Alerts</Button>
                    </ButtonGroup>
                </Labeled>
                <Labeled label="vertical">
                    <ButtonGroup orientation="vertical">
                        <Button variant="outline">Runs</Button>
                        <Button variant="outline">Schedules</Button>
                        <Button variant="outline">Alerts</Button>
                    </ButtonGroup>
                </Labeled>
                <Labeled label="with separator">
                    <ButtonGroup>
                        <Button>Run now</Button>
                        <ButtonGroupSeparator />
                        <Button size="icon" aria-label="More run options">
                            <ChevronDown />
                        </Button>
                    </ButtonGroup>
                </Labeled>
                <Labeled label="with text">
                    <ButtonGroup>
                        <ButtonGroupText>Page</ButtonGroupText>
                        <Button variant="outline" size="icon" aria-label="Previous page">
                            <ChevronLeft />
                        </Button>
                        <Button variant="outline" size="icon" aria-label="Next page">
                            <ChevronRight />
                        </Button>
                    </ButtonGroup>
                </Labeled>
                <Labeled label="with input">
                    <ButtonGroup>
                        <Input readOnly defaultValue="https://api.example.org" aria-label="Base URL" />
                        <Button variant="outline" size="icon" aria-label="Copy base URL">
                            <Copy />
                        </Button>
                    </ButtonGroup>
                </Labeled>
                <Labeled label="nested">
                    <ButtonGroup>
                        <ButtonGroup>
                            <Button variant="outline" size="sm">
                                Day
                            </Button>
                            <Button variant="outline" size="sm">
                                Week
                            </Button>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Button variant="outline" size="sm">
                                Export
                            </Button>
                        </ButtonGroup>
                    </ButtonGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="one disabled">
                    <ButtonGroup>
                        <Button variant="outline">
                            <Play data-icon="inline-start" />
                            Resume
                        </Button>
                        <Button variant="outline" disabled>
                            <Pause data-icon="inline-start" />
                            Pause
                        </Button>
                    </ButtonGroup>
                </Labeled>
                <Labeled label="all disabled">
                    <ButtonGroup>
                        <Button variant="outline" disabled>
                            Previous
                        </Button>
                        <Button variant="outline" disabled>
                            Next
                        </Button>
                    </ButtonGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const RunControls: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Run 01a1a5c6</p>
                    <p className="text-xs text-muted-foreground">running since 2026-11-04 14:02, step 2 of 3</p>
                </div>
                <ButtonGroup>
                    <Button variant="outline" size="sm">
                        <Pause data-icon="inline-start" />
                        Pause
                    </Button>
                    <Button variant="outline" size="sm">
                        <Square data-icon="inline-start" />
                        Cancel
                    </Button>
                </ButtonGroup>
            </div>
        </Ground>
    ),
}
