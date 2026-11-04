import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex w-full max-w-xs flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Input' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="text">
                    <Input aria-label="Code" placeholder="import-orders" />
                </Labeled>
                <Labeled label="filled">
                    <Input aria-label="Code" defaultValue="import-orders" />
                </Labeled>
                <Labeled label="url">
                    <Input aria-label="Base URL" type="url" defaultValue="https://api.example.org" />
                </Labeled>
                <Labeled label="password">
                    <Input aria-label="Token" type="password" defaultValue="tok_abcdefghijklm" />
                </Labeled>
                <Labeled label="number">
                    <Input aria-label="Retries" type="number" defaultValue={3} />
                </Labeled>
                <Labeled label="file">
                    <Input aria-label="Upload" type="file" />
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
                    <Input aria-label="Code" disabled defaultValue="import-orders" />
                </Labeled>
                <Labeled label="read only">
                    <Input aria-label="Id" readOnly defaultValue="0193f1c2-7a4e-7c8b-9d11-2f6a0b3e5c71" />
                </Labeled>
                <Labeled label="invalid">
                    <Input aria-label="Code" aria-invalid defaultValue="Import Orders" />
                </Labeled>
                <Labeled label="empty">
                    <Input aria-label="Code" placeholder="A code, such as import-orders" />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const SearchRuns: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-md flex-col gap-2">
                <Label htmlFor="run-search">Find a run</Label>
                <Input id="run-search" type="search" placeholder="Run id, job or person" defaultValue="import-orders" />
                <p className="text-xs text-muted-foreground">3 runs of import-orders since 2026-11-04 12:00.</p>
            </div>
        </Ground>
    ),
}
