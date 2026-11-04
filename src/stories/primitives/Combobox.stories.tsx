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

const PIPELINES = ['weather-gate', 'dhis2-sync', 'chap-forecast', 'climate-ingest', 'fhir-export', 'nightly-backup']

function PipelineCombobox({
    placeholder = 'Find a pipeline',
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
        <Combobox items={PIPELINES} disabled={disabled} {...props}>
            <ComboboxInput
                placeholder={placeholder}
                showClear={showClear}
                disabled={disabled}
                aria-invalid={invalid || undefined}
                aria-label="Pipeline"
                className="w-full"
            />
            <ComboboxContent>
                <ComboboxEmpty>No pipeline matches.</ComboboxEmpty>
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
        <Combobox multiple items={['dhis2', 'climate', 'nightly', 'export', 'staging']} defaultValue={['dhis2', 'nightly']}>
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
                    <PipelineCombobox />
                </Labeled>
                <Labeled label="picked">
                    <PipelineCombobox defaultValue="weather-gate" />
                </Labeled>
                <Labeled label="with clear">
                    <PipelineCombobox defaultValue="weather-gate" showClear />
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
                    <PipelineCombobox disabled defaultValue="weather-gate" />
                </Labeled>
                <Labeled label="invalid">
                    <PipelineCombobox invalid placeholder="Pick a pipeline" />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const Open: StoryObj = {
    render: () => (
        <Ground>
            <div className="h-80 max-w-xs">
                <PipelineCombobox defaultOpen defaultValue="weather-gate" />
            </div>
        </Ground>
    ),
}

export const OpenNoMatch: StoryObj = {
    render: () => (
        <Ground>
            <div className="h-40 max-w-xs">
                <PipelineCombobox defaultOpen defaultInputValue="salesforce" />
            </div>
        </Ground>
    ),
}

const BLOCKS = [
    { group: 'Fetch', items: ['dhis2.fetch-data-values', 'http.get', 'climate.era5'] },
    { group: 'Check', items: ['schema.gate', 'jq.filter'] },
    { group: 'Store', items: ['parquet.write', 's3.put', 'dhis2.import'] },
]

export const AddBlock: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex h-[28rem] max-w-sm flex-col gap-2">
                <p className="text-sm font-medium">Add a step to weather-gate</p>
                <Combobox items={BLOCKS} defaultOpen>
                    <ComboboxInput placeholder="Search blocks" aria-label="Block" className="w-full" />
                    <ComboboxContent>
                        <ComboboxEmpty>No block matches.</ComboboxEmpty>
                        <ComboboxList>
                            {(group: (typeof BLOCKS)[number], index: number) => (
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
