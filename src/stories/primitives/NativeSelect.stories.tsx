import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Field, FieldDescription, FieldLabel } from '../../components/ui/field'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '../../components/ui/native-select'

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

function States3(props: React.ComponentProps<typeof NativeSelect>) {
    return (
        <NativeSelect aria-label="State" defaultValue="failed" {...props}>
            <NativeSelectOption value="">Any state</NativeSelectOption>
            <NativeSelectOption value="succeeded">succeeded</NativeSelectOption>
            <NativeSelectOption value="failed">failed</NativeSelectOption>
            <NativeSelectOption value="running">running</NativeSelectOption>
        </NativeSelect>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/NativeSelect' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="default">
                    <States3 />
                </Labeled>
                <Labeled label="sm">
                    <States3 size="sm" />
                </Labeled>
                <Labeled label="placeholder">
                    <States3 defaultValue="" />
                </Labeled>
                <Labeled label="option groups">
                    <NativeSelect aria-label="Destination" defaultValue="api">
                        <NativeSelectOptGroup label="Services">
                            <NativeSelectOption value="api">api</NativeSelectOption>
                            <NativeSelectOption value="worker">worker</NativeSelectOption>
                        </NativeSelectOptGroup>
                        <NativeSelectOptGroup label="Storage">
                            <NativeSelectOption value="harbor-exports">harbor-exports</NativeSelectOption>
                        </NativeSelectOptGroup>
                    </NativeSelect>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="disabled">
                    <States3 disabled />
                </Labeled>
                <Labeled label="invalid">
                    <States3 aria-invalid defaultValue="" />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const RunsPerPage: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <p className="text-sm text-muted-foreground">Runs 1 to 25 of 312</p>
                <Field orientation="horizontal" className="w-auto">
                    <FieldLabel htmlFor="per-page" className="font-normal text-muted-foreground">
                        Per page
                    </FieldLabel>
                    <NativeSelect id="per-page" size="sm" defaultValue="25">
                        <NativeSelectOption value="25">25</NativeSelectOption>
                        <NativeSelectOption value="50">50</NativeSelectOption>
                        <NativeSelectOption value="100">100</NativeSelectOption>
                    </NativeSelect>
                </Field>
            </div>
            <FieldDescription>A native select suits short lists on a phone, where the system picker is easier to use.</FieldDescription>
        </Ground>
    ),
}
