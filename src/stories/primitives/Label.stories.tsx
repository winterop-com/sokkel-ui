import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Checkbox } from '../../components/ui/checkbox'
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

const meta: Meta = { title: 'Primitives/Inputs/Label' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="over an input">
                    <div className="flex w-full flex-col gap-2">
                        <Label htmlFor="label-code">Code</Label>
                        <Input id="label-code" defaultValue="weather-gate" />
                    </div>
                </Labeled>
                <Labeled label="beside a checkbox">
                    <div className="flex items-center gap-2">
                        <Checkbox id="label-notify" defaultChecked />
                        <Label htmlFor="label-notify">Notify on failure</Label>
                    </div>
                </Labeled>
                <Labeled label="with a hint">
                    <Label>
                        Timeout <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="peer disabled">
                    <div className="flex items-center gap-2">
                        <Checkbox id="label-disabled" disabled />
                        <Label htmlFor="label-disabled">Notify on failure</Label>
                    </div>
                </Labeled>
                <Labeled label="group disabled">
                    <div className="group flex flex-col gap-2" data-disabled="true">
                        <Label htmlFor="label-group">Base URL</Label>
                        <Input id="label-group" disabled defaultValue="https://play.dhis2.org/api" />
                    </div>
                </Labeled>
            </div>
        </Ground>
    ),
}
