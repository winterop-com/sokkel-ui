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
        meta: '3',
        children: [
            {
                id: 'norway',
                label: 'Norway',
                meta: '4',
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
                meta: '2',
                children: [
                    { id: 'lisbon', label: 'Lisbon' },
                    { id: 'porto', label: 'Porto' },
                ],
            },
            { id: 'iceland', label: 'Iceland', meta: '0', children: [] },
        ],
    },
    {
        id: 'africa',
        label: 'Africa',
        meta: '2',
        children: [
            {
                id: 'kenya',
                label: 'Kenya',
                meta: '3',
                children: [
                    { id: 'nairobi', label: 'Nairobi' },
                    { id: 'mombasa', label: 'Mombasa' },
                    { id: 'kisumu', label: 'Kisumu' },
                ],
            },
            { id: 'ghana', label: 'Ghana', meta: '1', children: [{ id: 'accra', label: 'Accra' }] },
        ],
    },
    {
        id: 'asia',
        label: 'Asia',
        meta: '1',
        children: [{ id: 'vietnam', label: 'Vietnam', meta: '1', children: [{ id: 'hanoi', label: 'Hanoi' }] }],
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

function Picker({ open }: { open?: boolean }) {
    const [value, setValue] = useState<string[]>(['trondheim'])
    const [several, setSeveral] = useState<string[]>([])
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-md flex-col gap-4">
                <Field id="name" label="Office name">
                    <Input id="name" defaultValue="Harbor office" />
                </Field>
                <Field id="city" label="City" required>
                    <TreeSelect id="city" nodes={PLACES} value={value} onChange={setValue} defaultOpen={['europe', 'norway']} open={open} />
                </Field>
                {open !== true && (
                    <Field id="cover" label="Also serves">
                        <TreeSelect id="cover" nodes={PLACES} value={several} onChange={setSeveral} multiple />
                    </Field>
                )}
            </div>
        </div>
    )
}

const meta: Meta = { title: 'Patterns/Tree' }
export default meta

export const Trees_: StoryObj = { name: 'Tree', render: () => <Trees /> }
export const Select: StoryObj = { name: 'Tree select', render: () => <Picker /> }
export const SelectOpen: StoryObj = { name: 'Tree select, open', render: () => <Picker open /> }
