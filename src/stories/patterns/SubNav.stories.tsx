import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Fill, Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { Tree, type TreeNode } from '@winterop-com/sokkel-ui/Tree'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

const meta: Meta = { title: 'Patterns/Sub nav' }
export default meta

const FOLDERS: TreeNode[] = [
    {
        id: 'harbor',
        label: 'harbor',
        children: [
            { id: 'harbor/exports', label: 'exports', meta: '214' },
            { id: 'harbor/shared', label: 'shared', children: [{ id: 'harbor/shared/reports', label: 'reports', meta: '18' }] },
        ],
    },
    { id: 'juniper', label: 'juniper', children: [{ id: 'juniper/index', label: 'index', meta: '6' }] },
    { id: 'larkspur', label: 'larkspur', children: [{ id: 'larkspur/digests', label: 'digests', meta: '52' }] },
]

const PAGES: TreeNode[] = [
    {
        id: 'runbooks',
        label: 'Runbooks',
        children: [
            { id: 'nightly-export', label: 'Nightly export' },
            { id: 'sync-inventory', label: 'Sync inventory' },
            { id: 'rebuild-index', label: 'Rebuild index' },
        ],
    },
    {
        id: 'services',
        label: 'Services',
        children: [
            { id: 'api', label: 'api' },
            { id: 'worker', label: 'worker' },
        ],
    },
]

/** The column of a section's folders beside the page, under a group label; its right edge drags to resize it. */
export const Folders: StoryObj = {
    render: function Render() {
        const [folder, setFolder] = useState('harbor/exports')
        return (
            <Row gap="none" align="stretch" className="h-svh bg-background text-foreground">
                <SubNav title="Folders">
                    <Tree
                        label="Folders"
                        nodes={FOLDERS}
                        selected={[folder]}
                        onSelect={(ids) => setFolder(ids[0])}
                        defaultOpen={['harbor', 'harbor/shared']}
                    />
                </SubNav>
                <Fill scroll>
                    <Page>
                        <PageHeader title={folder.split('/').pop() ?? folder} count="214 items" />
                    </Page>
                </Fill>
            </Row>
        )
    },
}

/** A search at the top of the column that narrows the tree, with a button beside it that adds a page. */
export const Searching: StoryObj = {
    render: function Render() {
        const [query, setQuery] = useState('export')
        const [page, setPage] = useState('nightly-export')
        return (
            <TooltipProvider>
                <Row gap="none" align="stretch" className="h-svh bg-background text-foreground">
                    <SubNav
                        label="Pages"
                        search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                        actions={
                            <IconButton label="New page">
                                <Plus aria-hidden />
                            </IconButton>
                        }
                    >
                        <Tree
                            label="Pages"
                            nodes={PAGES}
                            query={query}
                            selected={[page]}
                            onSelect={(ids) => setPage(ids[0])}
                            defaultOpen={['runbooks']}
                        />
                    </SubNav>
                    <Fill scroll>
                        <Page>
                            <PageHeader title="Nightly export" />
                        </Page>
                    </Fill>
                </Row>
            </TooltipProvider>
        )
    },
}
