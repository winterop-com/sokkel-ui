import { TextField } from '@winterop-com/sokkel-ui/TextField'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '@winterop-com/sokkel-ui/Field'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { TreeSelect } from '@winterop-com/sokkel-ui/TreeSelect'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { branchIds, GEOGRAPHY_TOP, geography, loadPlace, searchPlaces, SITE_COUNT, trailOf } from '../fixtures/geography'

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
        <Columns count={3} min="md" align="start" className="mx-auto max-w-5xl">
            {children}
        </Columns>
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
        <Stack gap="lg" className="mx-auto max-w-md">
            <TextField id="name" label="Office name" defaultValue="Harbor office" />
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
        </Stack>
    )
}

/** A load that never answers, so its level stays loading. */
const neverAnswers = (node: TreeNode) => (node.id === 'asia' ? new Promise<readonly TreeNode[]>(() => undefined) : loadPlace(node))

/** A load that refuses a level until it is asked again. */
function refusingOnce() {
    const refused = new Set<string>()
    return (node: TreeNode) => {
        if (node.id !== 'oceania' || refused.has(node.id)) return loadPlace(node)
        refused.add(node.id)
        return Promise.reject(new Error('The server did not answer.'))
    }
}

function Lazy() {
    const [one, setOne] = useState<string[]>(['europe/norway/west/d3'])
    const [refusing] = useState(refusingOnce)
    return (
        <Ground>
            <Section title="Loaded as opened" flush>
                <div className="p-1">
                    <Tree
                        label="Places"
                        nodes={GEOGRAPHY_TOP}
                        loadChildren={loadPlace}
                        selected={one}
                        onSelect={setOne}
                        defaultOpen={['europe', 'europe/norway', 'europe/norway/west']}
                    />
                </div>
            </Section>
            <Section title="Still loading" flush>
                <div className="p-1">
                    <Tree label="Places" nodes={GEOGRAPHY_TOP} loadChildren={neverAnswers} selection="none" defaultOpen={['asia']} />
                </div>
            </Section>
            <Section title="Refused" flush>
                <div className="p-1">
                    <Tree label="Places" nodes={GEOGRAPHY_TOP} loadChildren={refusing} selection="none" defaultOpen={['oceania']} />
                </div>
            </Section>
        </Ground>
    )
}

function LazyPicker({ open, query }: { open?: boolean; query?: string }) {
    const [value, setValue] = useState<string[]>(['south-america/peru/highlands/d4/s12'])
    return (
        <Stack gap="lg" className="mx-auto max-w-md">
            <Field id="site" label="Site" required>
                <TreeSelect
                    id="site"
                    nodes={GEOGRAPHY_TOP}
                    value={value}
                    onChange={setValue}
                    loadChildren={loadPlace}
                    search={searchPlaces}
                    trails={[trailOf('south-america/peru/highlands/d4/s12')]}
                    open={open}
                    defaultQuery={query}
                />
            </Field>
        </Stack>
    )
}

const EVERY_BRANCH = branchIds()
const NUMBER = new Intl.NumberFormat('en-US')

function Large() {
    const [one, setOne] = useState<string[]>([])
    return (
        <Stack className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Section title="Sites" meta={NUMBER.format(SITE_COUNT)} flush fill className="flex-1">
                <div className="p-1">
                    <Tree label="Sites" nodes={geography()} selected={one} onSelect={setOne} defaultOpen={EVERY_BRANCH} />
                </div>
            </Section>
        </Stack>
    )
}

const meta: Meta = { title: 'Patterns/Tree', parameters: { frame: 'padded' } }
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
/** A geography whose levels load as they are opened: loaded down to a district, a level still loading, and one refused with a way to try again. */
export const LazyTree: StoryObj = { name: 'Lazy', render: () => <Lazy /> }
/** A site picked deep in a lazy geography, named by its path before its level has loaded. */
export const LazySelect: StoryObj = { name: 'Lazy select', render: () => <LazyPicker /> }
/** The lazy picker open: the tree loaded down to the chosen site and scrolled to it. */
export const LazyOpen: StoryObj = { name: 'Lazy, open', render: () => <LazyPicker open /> }
/** A search over the whole geography, loaded or not: each match with its path, broadest first. */
export const Searched: StoryObj = { name: 'Searched', render: () => <LazyPicker open query="lavi" /> }
/** Every level of the geography open: over fifty thousand rows, drawn only while in view. */
export const FiftyThousand: StoryObj = { name: 'Fifty thousand', parameters: { frame: 'none' }, render: () => <Large /> }
