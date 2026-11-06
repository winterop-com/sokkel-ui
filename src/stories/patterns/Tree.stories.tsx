import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '../../components/Field'
import { Section } from '../../components/Section'
import { Tree, type TreeNode } from '../../components/Tree'
import { TreeSelect } from '../../components/TreeSelect'
import { Input } from '../../components/ui/input'

/** A hierarchy to open a level at a time, and the field that picks from one. */
const PLACES: TreeNode[] = [
    {
        id: 'europe',
        label: 'Europe',
        children: [
            {
                id: 'norway',
                label: 'Norway',
                meta: 'NO',
                children: [
                    { id: 'oslo', label: 'Oslo' },
                    { id: 'bergen', label: 'Bergen' },
                    { id: 'trondheim', label: 'Trondheim' },
                    { id: 'tromso', label: 'Tromsø' },
                ],
            },
            {
                id: 'portugal',
                label: 'Portugal',
                meta: 'PT',
                children: [
                    { id: 'lisbon', label: 'Lisbon' },
                    { id: 'porto', label: 'Porto' },
                ],
            },
            { id: 'iceland', label: 'Iceland', meta: 'IS', children: [] },
        ],
    },
    {
        id: 'africa',
        label: 'Africa',
        children: [
            {
                id: 'kenya',
                label: 'Kenya',
                meta: 'KE',
                children: [
                    { id: 'nairobi', label: 'Nairobi' },
                    { id: 'mombasa', label: 'Mombasa' },
                    { id: 'kisumu', label: 'Kisumu' },
                ],
            },
            {
                id: 'ghana',
                label: 'Ghana',
                meta: 'GH',
                children: [{ id: 'accra', label: 'Accra' }],
            },
        ],
    },
    {
        id: 'asia',
        label: 'Asia',
        children: [
            {
                id: 'vietnam',
                label: 'Vietnam',
                meta: 'VN',
                children: [{ id: 'hanoi', label: 'Hanoi' }],
            },
        ],
    },
]

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto grid max-w-5xl items-start gap-6 md:grid-cols-3">{children}</div>
        </div>
    )
}

function Trees() {
    const [one, setOne] = useState<string[]>(['bergen'])
    const [many, setMany] = useState<string[]>(['oslo', 'porto', 'nairobi'])
    return (
        <Ground>
            <Section title="Choose one" flush>
                <div className="p-1">
                    <Tree label="Places" nodes={PLACES} selected={one} onSelect={setOne} defaultOpen={['europe', 'norway']} />
                </div>
            </Section>
            <Section title="Choose several" meta={`${many.length}`} flush>
                <div className="p-1">
                    <Tree
                        label="Places"
                        nodes={PLACES}
                        selection="multiple"
                        selected={many}
                        onSelect={setMany}
                        defaultOpen={['europe', 'norway', 'portugal', 'africa', 'kenya']}
                    />
                </div>
            </Section>
            <Section title="Searching for or" flush>
                <div className="p-1">
                    <Tree label="Places" nodes={PLACES} selection="none" query="or" />
                </div>
            </Section>
        </Ground>
    )
}

function Picker({ open }: { open?: 'one' | 'several' }) {
    const [value, setValue] = useState<string[]>(['trondheim'])
    const [several, setSeveral] = useState<string[]>(['norway', 'lisbon', 'porto'])
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-md flex-col gap-4">
                <Field id="name" label="Office name">
                    <Input id="name" defaultValue="Harbor office" />
                </Field>
                <Field id="city" label="City" required>
                    <TreeSelect
                        id="city"
                        nodes={PLACES}
                        value={value}
                        onChange={setValue}
                        defaultOpen={['europe', 'norway']}
                        open={open === 'one' || undefined}
                    />
                </Field>
                {open !== 'one' && (
                    <Field id="cover" label="Also serves">
                        <TreeSelect
                            id="cover"
                            nodes={PLACES}
                            value={several}
                            onChange={setSeveral}
                            multiple
                            open={open === 'several' || undefined}
                        />
                    </Field>
                )}
            </div>
        </div>
    )
}

const meta: Meta = { title: 'Patterns/Tree' }
export default meta

export const Trees_: StoryObj = { name: 'Tree', render: () => <Trees /> }
export const Select: StoryObj = {
    name: 'Tree select',
    render: () => <Picker />,
}
export const SelectOpen: StoryObj = {
    name: 'Tree select, open',
    render: () => <Picker open="one" />,
}
/** Several chosen, open: the branches to Norway, Lisbon and Porto unfolded, and Europe and Portugal dashed for holding some. */
export const SeveralOpen: StoryObj = {
    name: 'Several, open',
    render: () => <Picker open="several" />,
}
