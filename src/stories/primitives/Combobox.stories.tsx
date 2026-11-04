import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxInput,
    ComboboxItem,
    ComboboxLabel,
    ComboboxList,
    ComboboxSeparator,
    ComboboxValue,
    useComboboxAnchor,
} from '../../components/ui/combobox'

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

const JOBS = ['import-orders', 'nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'archive-logs']

function JobCombobox({
    placeholder = 'Find a job',
    showClear,
    invalid,
    disabled,
    ...props
}: {
    placeholder?: string
    showClear?: boolean
    invalid?: boolean
    disabled?: boolean
    defaultValue?: string | null
    defaultOpen?: boolean
    defaultInputValue?: string
}) {
    return (
        <Combobox items={JOBS} disabled={disabled} {...props}>
            <ComboboxInput
                placeholder={placeholder}
                showClear={showClear}
                disabled={disabled}
                aria-invalid={invalid || undefined}
                aria-label="Job"
                className="w-full"
            />
            <ComboboxContent>
                <ComboboxEmpty>No job matches.</ComboboxEmpty>
                <ComboboxList>
                    {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                            <span className="font-mono">{item}</span>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

function TagChips() {
    const anchor = useComboboxAnchor()
    return (
        <Combobox multiple items={['orders', 'inventory', 'nightly', 'export', 'staging']} defaultValue={['orders', 'nightly']}>
            <ComboboxChips ref={anchor} className="w-full">
                <ComboboxValue>
                    {(values: string[]) => (
                        <>
                            {values.map((value) => (
                                <ComboboxChip key={value}>{value}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput placeholder="Add a tag" aria-label="Tags" />
                        </>
                    )}
                </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No tag matches.</ComboboxEmpty>
                <ComboboxList>
                    {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Combobox' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="empty">
                    <JobCombobox />
                </Labeled>
                <Labeled label="picked">
                    <JobCombobox defaultValue="import-orders" />
                </Labeled>
                <Labeled label="with clear">
                    <JobCombobox defaultValue="import-orders" showClear />
                </Labeled>
                <Labeled label="chips, multiple">
                    <TagChips />
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
                    <JobCombobox disabled defaultValue="import-orders" />
                </Labeled>
                <Labeled label="invalid">
                    <JobCombobox invalid placeholder="Pick a job" />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const Open: StoryObj = {
    render: () => (
        <Ground>
            <div className="h-80 max-w-xs">
                <JobCombobox defaultOpen defaultValue="import-orders" />
            </div>
        </Ground>
    ),
}

export const OpenNoMatch: StoryObj = {
    render: () => (
        <Ground>
            <div className="h-40 max-w-xs">
                <JobCombobox defaultOpen defaultInputValue="payroll" />
            </div>
        </Ground>
    ),
}

const ACTIONS = [
    { group: 'Fetch', items: ['http.get', 'files.read', 'api.list-orders'] },
    { group: 'Check', items: ['rows.check', 'rows.filter'] },
    { group: 'Store', items: ['bucket.put', 'files.write', 'api.post'] },
]

export const AddStep: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex h-[28rem] max-w-sm flex-col gap-2">
                <p className="text-sm font-medium">Add a step to import-orders</p>
                <Combobox items={ACTIONS} defaultOpen>
                    <ComboboxInput placeholder="Search actions" aria-label="Action" className="w-full" />
                    <ComboboxContent>
                        <ComboboxEmpty>No action matches.</ComboboxEmpty>
                        <ComboboxList>
                            {(group: (typeof ACTIONS)[number], index: number) => (
                                <ComboboxGroup key={group.group} items={group.items}>
                                    {index > 0 && <ComboboxSeparator />}
                                    <ComboboxLabel>{group.group}</ComboboxLabel>
                                    {group.items.map((item) => (
                                        <ComboboxItem key={item} value={item}>
                                            <span className="font-mono">{item}</span>
                                        </ComboboxItem>
                                    ))}
                                </ComboboxGroup>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>
        </Ground>
    ),
}
