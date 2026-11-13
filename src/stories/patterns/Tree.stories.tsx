import { TextField } from '@winterop-com/sokkel-ui/TextField'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileText, Folder, FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react'
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
                    <Tree label="Places" nodes={PLACES} selected={one} onSelect={setOne} defaultExpanded={['europe', 'norway']} />
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
                        defaultExpanded={['europe', 'norway', 'portugal', 'africa', 'kenya']}
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
                    onValueChange={setValue}
                    defaultExpanded={['europe', 'norway']}
                    defaultOpen={open === 'one'}
                />
            </Field>
            {open !== 'one' && (
                <Field id="cover" label="Also serves">
                    <TreeSelect
                        id="cover"
                        nodes={PLACES}
                        value={several}
                        onValueChange={setSeveral}
                        multiple
                        defaultOpen={open === 'several'}
                    />
                </Field>
            )}
        </Stack>
    )
}

/** The cities the harbor project is assigned to; every other place is outside it. */
const ASSIGNED = new Set(['oslo', 'bergen', 'trondheim', 'tromso', 'lisbon', 'porto'])

function Scoped() {
    const [value, setValue] = useState<string[]>([])
    return (
        <Stack gap="lg" className="mx-auto max-w-md">
            <Field id="visited" label="City visited" description="Optional. Only the harbor project's cities can be chosen.">
                <TreeSelect
                    id="visited"
                    nodes={PLACES}
                    value={value}
                    onValueChange={setValue}
                    optional
                    unavailable={(node) => (ASSIGNED.has(node.id) ? undefined : 'Not assigned to harbor')}
                    defaultExpanded={['europe', 'norway', 'portugal', 'africa']}
                    defaultOpen
                />
            </Field>
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
                        defaultExpanded={['europe', 'europe/norway', 'europe/norway/west']}
                    />
                </div>
            </Section>
            <Section title="Still loading" flush>
                <div className="p-1">
                    <Tree label="Places" nodes={GEOGRAPHY_TOP} loadChildren={neverAnswers} selection="none" defaultExpanded={['asia']} />
                </div>
            </Section>
            <Section title="Refused" flush>
                <div className="p-1">
                    <Tree label="Places" nodes={GEOGRAPHY_TOP} loadChildren={refusing} selection="none" defaultExpanded={['oceania']} />
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
                    onValueChange={setValue}
                    loadChildren={loadPlace}
                    search={searchPlaces}
                    trails={[trailOf('south-america/peru/highlands/d4/s12')]}
                    defaultOpen={open}
                    defaultQuery={query}
                />
            </Field>
        </Stack>
    )
}

/** A folder or a note in a vault, as a flat row naming its folder. */
interface Item {
    id: string
    label: string
    parent: string | null
    folder?: boolean
}

const VAULT: Item[] = [
    { id: 'daily', label: 'Daily', parent: null, folder: true },
    { id: 'd-09', label: '2026-11-09', parent: 'daily' },
    { id: 'd-08', label: '2026-11-08', parent: 'daily' },
    { id: 'runbooks', label: 'Runbooks', parent: null, folder: true },
    { id: 'retry', label: 'Retry a run', parent: 'runbooks' },
    { id: 'export', label: 'Nightly export', parent: 'runbooks' },
    { id: 'projects', label: 'Projects', parent: null, folder: true },
    { id: 'harbor', label: 'harbor', parent: 'projects', folder: true },
    { id: 'harbor-plan', label: 'Plan for the quarter', parent: 'harbor' },
    { id: 'juniper', label: 'juniper', parent: 'projects', folder: true },
    { id: 'inbox', label: 'Questions for margaret', parent: null },
]

function nodesOf(items: readonly Item[], parent: string | null): TreeNode[] {
    return items
        .filter((item) => item.parent === parent)
        .sort((a, b) => Number(b.folder ?? false) - Number(a.folder ?? false) || a.label.localeCompare(b.label))
        .map((item) =>
            item.folder === true
                ? { id: item.id, label: item.label, icon: Folder, openIcon: FolderOpen, children: nodesOf(items, item.id) }
                : { id: item.id, label: item.label, icon: FileText },
        )
}

/** A vault's folders and notes: icons, a menu on each row, and rows dragged into a folder or out to the top. */
function FileTree() {
    const [items, setItems] = useState(VAULT)
    const [chosen, setChosen] = useState<string[]>(['retry'])
    const [made, setMade] = useState(0)
    const rename = (id: string) =>
        setItems((now) => now.map((item) => (item.id === id ? { ...item, label: `${item.label} (renamed)` } : item)))
    const remove = (id: string) => setItems((now) => now.filter((item) => item.id !== id && item.parent !== id))
    const addFolder = (into: string) => {
        setMade(made + 1)
        setItems((now) => [...now, { id: `folder-${String(made)}`, label: `New folder ${String(made + 1)}`, parent: into, folder: true }])
    }
    return (
        <Section title="Vault" meta={`${items.filter((item) => item.folder !== true).length} notes`} flush className="mx-auto max-w-sm">
            <div className="p-1">
                <Tree
                    label="Vault"
                    nodes={nodesOf(items, null)}
                    selected={chosen}
                    onSelect={setChosen}
                    defaultExpanded={['daily', 'runbooks']}
                    actions={(node) => [
                        ...(node.children === undefined
                            ? []
                            : [{ id: 'folder', label: 'New folder', icon: <FolderPlus />, onSelect: () => addFolder(node.id) }]),
                        { id: 'rename', label: 'Rename', icon: <Pencil />, onSelect: () => rename(node.id) },
                        { id: 'line', separator: true },
                        { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: () => remove(node.id) },
                    ]}
                    // The vault sorts each folder by name, so a row only moves to another folder.
                    canMove={(id, into) => items.find((item) => item.id === id)?.parent !== into}
                    onMove={(id, into) => setItems((now) => now.map((item) => (item.id === id ? { ...item, parent: into } : item)))}
                />
            </div>
        </Section>
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
                    <Tree label="Sites" nodes={geography()} selected={one} onSelect={setOne} defaultExpanded={EVERY_BRANCH} />
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
/** Scoped and optional, open: places outside the project's assignment drawn shut with why, and a Clear row first, chosen while nothing is. */
export const ScopedOpen: StoryObj = { name: 'Scoped, open', render: () => <Scoped /> }
/** A geography whose levels load as they are opened: loaded down to a district, a level still loading, and one refused with a way to try again. */
export const LazyTree: StoryObj = { name: 'Lazy', render: () => <Lazy /> }
/** A site picked deep in a lazy geography, named by its path before its level has loaded. */
export const LazySelect: StoryObj = { name: 'Lazy select', render: () => <LazyPicker /> }
/** The lazy picker open: the tree loaded down to the chosen site and scrolled to it. */
export const LazyOpen: StoryObj = { name: 'Lazy, open', render: () => <LazyPicker open /> }
/** A search over the whole geography, loaded or not: each match with its path, broadest first. */
export const Searched: StoryObj = { name: 'Searched', render: () => <LazyPicker open query="lavi" /> }
/**
 * A vault's folders and notes, each with its icon (an open folder while open). A row's menu opens
 * from the button at its end or a right-click; a row dragged onto a folder moves into it, held over
 * a closed one opens it, and dragged beside a top-level row it moves to the top.
 */
export const Files: StoryObj = { name: 'File tree', render: () => <FileTree /> }
/** Every level of the geography open: over fifty thousand rows, drawn only while in view. */
export const FiftyThousand: StoryObj = { name: 'Fifty thousand', parameters: { frame: 'none' }, render: () => <Large /> }
