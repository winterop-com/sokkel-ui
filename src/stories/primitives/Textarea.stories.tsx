import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex w-full max-w-sm flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Textarea' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="empty">
                    <Textarea aria-label="Description" placeholder="What this job does, in a sentence or two." />
                </Labeled>
                <Labeled label="filled">
                    <Textarea
                        aria-label="Description"
                        defaultValue="Fetches the day's orders, validates each row, and uploads the rows that pass."
                    />
                </Labeled>
                <Labeled label="mono">
                    <Textarea aria-label="Filter" className="font-mono" defaultValue={'.rows\n| map(select(.amount > 0))\n| length'} />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="disabled">
                    <Textarea aria-label="Description" disabled defaultValue="Managed by the harbor project." />
                </Labeled>
                <Labeled label="invalid">
                    <Textarea aria-label="Filter" className="font-mono" aria-invalid defaultValue=".rows | map(select(.amount >" />
                </Labeled>
                <Labeled label="read only">
                    <Textarea aria-label="Description" readOnly defaultValue="Written by the run; it cannot be changed." />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const RunNote: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-lg flex-col gap-2">
                <Label htmlFor="note">Note on run 01a1a5c2</Label>
                <Textarea
                    id="note"
                    defaultValue="Failed at 2026-11-04 14:02 after 0.3s: api refused the request during its maintenance window. Retried by hand at 14:20."
                />
                <p className="text-xs text-muted-foreground">Markdown is fine. Everyone who can see the run sees the note.</p>
                <div className="flex justify-end">
                    <Button size="sm">Save note</Button>
                </div>
            </div>
        </Ground>
    ),
}
